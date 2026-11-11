import { uploadToPrivateStorage } from "../storage-upload";
import { supabase } from "../supabase";
import type {
  ResearchDocument,
  ResearchDocumentUploadInput,
} from "../../domain/types/research-document";

const BUCKET = "research-documents";
const SECURITIES_TABLE = "research_document_securities";
const TABLE = "research_documents";

type ResearchDocumentRow = {
  id: string;
  title: string;
  source: ResearchDocument["source"];
  document_type: ResearchDocument["documentType"];
  tickers: string[];
  sectors: string[];
  summary: string | null;
  storage_path: string;
  file_name: string;
  file_size_bytes: number | null;
  uploaded_by: string | null;
  published_at: string | null;
  created_at: string;
  house_view_rating: string | null;
  is_current: boolean;
};

function mapRow(row: ResearchDocumentRow): ResearchDocument {
  return {
    id: row.id,
    title: row.title,
    source: row.source,
    documentType: row.document_type,
    tickers: row.tickers ?? [],
    sectors: row.sectors ?? [],
    summary: row.summary,
    storagePath: row.storage_path,
    fileName: row.file_name,
    fileSizeBytes: row.file_size_bytes,
    uploadedBy: row.uploaded_by,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    houseViewRating: row.house_view_rating,
    isCurrent: row.is_current ?? true,
  };
}

/** Normalises free-typed ticker/sector tags: trims, uppercases tickers, dedupes. */
export function normaliseTags(raw: string, mode: "ticker" | "sector"): string[] {
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const normalised =
    mode === "ticker" ? parts.map((part) => part.toUpperCase()) : parts;

  return Array.from(new Set(normalised));
}

export async function listResearchDocuments(): Promise<ResearchDocument[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load research library: ${error.message}`);
  }

  return (data ?? []).map(mapRow);
}

export type ExtractedSecurity = {
  code: string;
  name: string | null;
  rating: string | null;
  recommendation: string | null;
  priceTarget: number | null;
  isTopIdea: boolean;
  note: string | null;
  /** Coverage universe imports: the broker's risk rating (e.g. "Higher"). */
  risk?: string | null;
  /** Coverage universe imports: when the broker last updated this rating (YYYY-MM-DD). */
  ratingDate?: string | null;
};

/** Puts a file in research storage ahead of reading it; returns its path. */
export async function stageResearchFile(file: File, source: string): Promise<string> {
  try {
    return await uploadToPrivateStorage(file, source);
  } catch (error) {
    throw new Error(`Failed to upload document: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

export async function discardStagedFile(storagePath: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([storagePath]);
}

export async function uploadResearchDocument(
  input: ResearchDocumentUploadInput & { stagedPath?: string; securities?: ExtractedSecurity[] }
): Promise<ResearchDocument> {
  const storagePath = input.stagedPath ?? (await stageResearchFile(input.file, input.source));

  const { data, error: insertError } = await supabase
    .from(TABLE)
    .insert({
      title: input.title,
      source: input.source,
      document_type: input.documentType,
      tickers: input.tickers,
      sectors: input.sectors,
      summary: input.summary ?? null,
      storage_path: storagePath,
      file_name: input.file.name,
      file_size_bytes: input.file.size,
      uploaded_by: input.uploadedBy ?? null,
      published_at: input.publishedAt ?? null,
      house_view_rating: input.houseViewRating ?? null,
    })
    .select("*")
    .single();

  if (insertError) {
    // Roll back the storage upload if the metadata insert fails, so a
    // half-uploaded document never sits in the bucket without a record.
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw new Error(`Failed to save document metadata: ${insertError.message}`);
  }

  // Every security the document gives a view on, with that view.
  if (input.securities && input.securities.length > 0) {
    const rows = input.securities.map((s) => ({
      document_id: data.id,
      code: s.code.toUpperCase(),
      name: s.name,
      rating: s.rating,
      recommendation: s.recommendation,
      price_target: s.priceTarget,
      is_top_idea: s.isTopIdea,
      note: s.note,
      ...(s.risk !== undefined ? { risk: s.risk } : {}),
      ...(s.ratingDate !== undefined ? { rating_date: s.ratingDate } : {}),
    }));
    let { error: securitiesError } = await supabase.from(SECURITIES_TABLE).insert(rows);
    if (securitiesError && /risk|rating_date/.test(securitiesError.message)) {
      // Before migration 0030: save without the risk/date columns (both are also in the note).
      ({ error: securitiesError } = await supabase
        .from(SECURITIES_TABLE)
        .insert(rows.map(({ risk: _r, rating_date: _d, ...rest }: Record<string, unknown>) => (void _r, void _d, rest))));
    }
    if (securitiesError) {
      console.error("Failed to save the document's securities:", securitiesError.message);
    }
  }

  // A new Top Ideas / preferred-holdings list supersedes whatever the
  // same source's previous one was - no point keeping an old preferred
  // list marked current once a fresh one has replaced it. Older uploads
  // aren't deleted, just no longer flagged current, so they stay
  // available in the library's full history if ever needed.
  // A coverage universe export works the same way: the newest one from a
  // source is the full current set of ratings.
  if (input.documentType === "Top Ideas" || input.documentType === "Coverage Universe") {
    const { error: supersedeError } = await supabase
      .from(TABLE)
      .update({ is_current: false })
      .eq("source", input.source)
      .eq("document_type", input.documentType)
      .neq("id", data.id);

    if (supersedeError) {
      // The new upload itself succeeded - don't fail the whole request
      // over the supersede step, just surface it for visibility.
      console.error("Failed to supersede previous Top Ideas upload:", supersedeError.message);
    }
  }

  return mapRow(data as ResearchDocumentRow);
}

export async function getResearchDocumentDownloadUrl(
  storagePath: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 10);

  if (error || !data) {
    throw new Error(
      `Failed to create download link: ${error?.message ?? "unknown error"}`
    );
  }

  return data.signedUrl;
}

export async function deleteResearchDocument(
  document: Pick<ResearchDocument, "id" | "storagePath">
): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([document.storagePath]);

  if (storageError) {
    throw new Error(`Failed to delete file: ${storageError.message}`);
  }

  const { error: deleteError } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", document.id);

  if (deleteError) {
    throw new Error(`Failed to delete document record: ${deleteError.message}`);
  }
}

/** Filters documents relevant to a given ticker or sector — used by the weekly brief engine. */
export function filterResearchDocuments(
  documents: ResearchDocument[],
  { ticker, sector }: { ticker?: string; sector?: string }
): ResearchDocument[] {
  return documents.filter((document) => {
    const matchesTicker =
      !ticker || document.tickers.includes(ticker.toUpperCase());
    const matchesSector = !sector || document.sectors.includes(sector);
    return matchesTicker || matchesSector;
  });
}

/**
 * Latest house-view rating a given source (Ord Minnett or Barrenjoey) has
 * put on a ticker, from whichever of their uploaded documents most
 * recently carried a rating for it. Null if that source hasn't rated the
 * ticker (either no upload, or uploads exist but none carried a rating).
 */
export async function fetchLatestHouseViewRating(
  code: string,
  source: ResearchDocument["source"]
): Promise<string | null> {
  const ticker = code.toUpperCase();

  // Newest per-security rating read from an uploaded document (0022)...
  // A superseded coverage universe no longer speaks for the source: a stock
  // dropped from the latest export shouldn't keep its old rating.
  let extracted: { rating: string; at: string } | null = null;
  const { data: secRows, error: secError } = await supabase
    .from(SECURITIES_TABLE)
    .select("rating, created_at, research_documents!inner(source, published_at, created_at, document_type, is_current)")
    .eq("code", ticker)
    .eq("research_documents.source", source)
    .not("rating", "is", null)
    .order("created_at", { ascending: false })
    .limit(10);
  if (!secError && secRows && secRows.length > 0) {
    const live = (secRows as unknown as {
      rating: string;
      created_at: string;
      research_documents: { document_type: string; is_current: boolean | null } | null;
    }[]).find(
      (row) => !(row.research_documents?.document_type === "Coverage Universe" && row.research_documents?.is_current === false)
    );
    if (live) extracted = { rating: live.rating, at: live.created_at };
  }

  // ...versus a rating typed in by hand on an older upload. Newest wins.
  const { data, error } = await supabase
    .from(TABLE)
    .select("house_view_rating, created_at")
    .eq("source", source)
    .contains("tickers", [ticker])
    .not("house_view_rating", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && !extracted) {
    throw new Error(`Failed to load ${source} house view rating: ${error.message}`);
  }

  const manual = data?.house_view_rating ? { rating: data.house_view_rating as string, at: data.created_at as string } : null;
  if (extracted && manual) return extracted.at >= manual.at ? extracted.rating : manual.rating;
  return extracted?.rating ?? manual?.rating ?? null;
}

export type TopIdea = {
  code: string;
  name: string | null;
  rating: string | null;
  priceTarget: number | null;
  note: string | null;
};

export type SourceTopIdeas = {
  source: ResearchDocument["source"];
  documentId: string;
  title: string;
  publishedAt: string | null;
  createdAt: string;
  ideas: TopIdea[];
};

/**
 * Each source's current Top Ideas list, from the securities read out of its
 * most recent Top Ideas upload. Falls back to the document's tagged tickers
 * for uploads made before documents were read automatically.
 */
export async function listCurrentTopIdeas(): Promise<SourceTopIdeas[]> {
  const { data: docs, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("document_type", "Top Ideas")
    .eq("is_current", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load Top Ideas: ${error.message}`);

  const latestBySource = new Map<string, ResearchDocument>();
  for (const row of docs ?? []) {
    const doc = mapRow(row as ResearchDocumentRow);
    if (!latestBySource.has(doc.source)) latestBySource.set(doc.source, doc);
  }

  const results: SourceTopIdeas[] = [];
  for (const doc of Array.from(latestBySource.values())) {
    const { data: secs } = await supabase
      .from(SECURITIES_TABLE)
      .select("code, name, rating, price_target, is_top_idea, note")
      .eq("document_id", doc.id);
    const rows = (secs ?? []) as {
      code: string;
      name: string | null;
      rating: string | null;
      price_target: number | null;
      is_top_idea: boolean;
      note: string | null;
    }[];
    // On a Top Ideas document, flagged ideas if any are flagged, else everything listed.
    const flagged = rows.filter((r) => r.is_top_idea);
    const chosen = flagged.length > 0 ? flagged : rows;
    const ideas: TopIdea[] =
      chosen.length > 0
        ? chosen.map((r) => ({
            code: r.code.toUpperCase(),
            name: r.name,
            rating: r.rating,
            priceTarget: r.price_target === null ? null : Number(r.price_target),
            note: r.note,
          }))
        : doc.tickers.map((t) => ({ code: t.toUpperCase(), name: null, rating: doc.houseViewRating, priceTarget: null, note: null }));
    results.push({
      source: doc.source,
      documentId: doc.id,
      title: doc.title,
      publishedAt: doc.publishedAt,
      createdAt: doc.createdAt,
      ideas,
    });
  }
  return results;
}

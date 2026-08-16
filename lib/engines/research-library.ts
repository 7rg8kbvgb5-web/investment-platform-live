import { supabase } from "../supabase";
import type {
  ResearchDocument,
  ResearchDocumentUploadInput,
} from "../../domain/types/research-document";

const BUCKET = "research-documents";
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

export async function uploadResearchDocument(
  input: ResearchDocumentUploadInput
): Promise<ResearchDocument> {
  const storagePath = `${input.source.replace(/\s+/g, "-").toLowerCase()}/${Date.now()}-${input.file.name}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, input.file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload document: ${uploadError.message}`);
  }

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

  // A new Top Ideas / preferred-holdings list supersedes whatever the
  // same source's previous one was - no point keeping an old preferred
  // list marked current once a fresh one has replaced it. Older uploads
  // aren't deleted, just no longer flagged current, so they stay
  // available in the library's full history if ever needed.
  if (input.documentType === "Top Ideas") {
    const { error: supersedeError } = await supabase
      .from(TABLE)
      .update({ is_current: false })
      .eq("source", input.source)
      .eq("document_type", "Top Ideas")
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
  const { data, error } = await supabase
    .from(TABLE)
    .select("house_view_rating")
    .eq("source", source)
    .contains("tickers", [code.toUpperCase()])
    .not("house_view_rating", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load ${source} house view rating: ${error.message}`);
  }

  return data?.house_view_rating ?? null;
}

import { describeAiError } from '../../../../lib/ai-errors'
import { downloadStoredPdf, extractJsonFromPdf, removeStoredFile } from "../../../../lib/ai/read-pdf";
import type { UploadedHolding } from "../../../../lib/engines/client-portfolio-upload";

export const runtime = "nodejs";
export const maxDuration = 90;

const SYSTEM_PROMPT = `You extract structured holdings data from client investment portfolio
statements (PDFs from custodians, platforms, or wrap accounts) for an Ord Minnett private
wealth adviser.

Read the document carefully and extract every individual holding line — do not summarise
or omit rows, and do not invent holdings that aren't in the document. If a figure is genuinely
illegible or ambiguous, omit that field for that row rather than guessing a number.

For each holding, extract:
- code: the ASX code, ticker, or fund APIR/product code as printed. If no code is printed,
  leave it empty and rely on name instead.
- name: the security or fund name as printed.
- weight: the holding's percentage of the total portfolio, if the document states it directly.
- value: the dollar market value of the holding, if stated.
- quantity: number of units/shares held, if stated.
- costBase: the holding's TOTAL cost base for the whole holding, if stated. It may be labelled Cost Base,
  Book Cost, Purchase Cost, Total Cost, Cost or Cost Value. If only an average cost per unit is shown, multiply it
  by the quantity held. Many statements put this in an "unrealised gains" or "cost base" section - check the whole
  document, not just the valuation table.
- acquiredDate: the purchase / acquisition date as YYYY-MM-DD, if stated. Where a holding has several
  parcels, use the earliest date and add a warning that it has multiple parcels.

Do NOT extract names, addresses, account numbers, HINs, TFNs or any other personal details - return
"clientName": null always. Also extract, if present anywhere in the document:
- asAtDate: the statement date or "as at" date.
- totalPortfolioValue: the total portfolio value.

Respond ONLY with a JSON object (no markdown fences, no preamble) matching this shape:
{
  "clientName": string | null,
  "asAtDate": string | null,
  "totalPortfolioValue": number | null,
  "holdings": [{ "code": string, "name": string, "weight": number | null, "value": number | null, "quantity": number | null, "costBase": number | null, "acquiredDate": string | null }],
  "warnings": string[]
}
Use the "warnings" array to flag anything you're unsure about — illegible sections, holdings
where you could only find a value and not a weight, or pages that appeared to be cut off.`;

type ExtractedHolding = {
  code?: string;
  name?: string;
  weight?: number | null;
  value?: number | null;
  quantity?: number | null;
  costBase?: number | null;
  acquiredDate?: string | null;
};

type ExtractionResult = {
  clientName: string | null;
  asAtDate: string | null;
  totalPortfolioValue: number | null;
  holdings: ExtractedHolding[];
  warnings: string[];
};

export async function POST(request: Request) {
  // Preferred: the browser uploads the statement to private storage and
  // sends its path (avoids Vercel's ~4.5MB request limit); the file is
  // deleted again as soon as it's been read. A direct multipart upload is
  // still accepted for small files.
  let base64: string;
  let storagePath: string | null = null;
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await request.json();
      storagePath = typeof body?.storagePath === "string" ? body.storagePath : null;
      if (!storagePath) {
        return Response.json({ ok: false, error: "No PDF file was provided." }, { status: 400 });
      }
      base64 = await downloadStoredPdf(storagePath);
    } else {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file || !(file instanceof File)) {
        return Response.json({ ok: false, error: "No PDF file was provided." }, { status: 400 });
      }
      if (file.type !== "application/pdf") {
        return Response.json({ ok: false, error: "Only PDF files are supported." }, { status: 400 });
      }
      base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    }
  } catch (error) {
    return Response.json({ ok: false, error: describeAiError(error, "Couldn't read the uploaded file.") }, { status: 400 });
  }

  let parsed: ExtractionResult;
  try {
    parsed = await extractJsonFromPdf<ExtractionResult>({
      base64,
      system: SYSTEM_PROMPT,
      instruction: "Extract all holdings from this portfolio statement.",
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: describeAiError(
          error,
          "Could not read the holdings from this PDF. Try a clearer copy, or paste the holdings as CSV instead.",
        ),
      },
      { status: 502 },
    );
  } finally {
    if (storagePath) await removeStoredFile(storagePath).catch(() => {});
  }

  const warnings = [...(parsed.warnings ?? [])];

  const holdings: UploadedHolding[] = (parsed.holdings ?? [])
    .map((holding, index): UploadedHolding | null => {
      const code = (holding.code ?? "").trim().toUpperCase();
      const name = holding.name?.trim();

      if (!code && !name) {
        return null;
      }

      return {
        code: code || (name ?? "").toUpperCase(),
        name,
        weight: holding.weight ?? 0,
        value: holding.value ?? undefined,
        quantity: holding.quantity ?? undefined,
        costBase: typeof holding.costBase === "number" ? holding.costBase : undefined,
        acquiredDate:
          holding.acquiredDate && /^\d{4}-\d{2}-\d{2}$/.test(holding.acquiredDate) ? holding.acquiredDate : undefined,
        sourceRow: index + 1,
      };
    })
    .filter((h): h is UploadedHolding => h !== null);

  // Weights: use stated weights where given; where any are missing but
  // dollar values exist, derive every weight from values so they're
  // consistent. Total value falls back to the sum of holding values.
  const valuesTotal = holdings.reduce((sum, h) => sum + (h.value ?? 0), 0);
  const missingWeights = holdings.some((h) => !(h.weight > 0));
  const allHaveValues = holdings.length > 0 && holdings.every((h) => (h.value ?? 0) > 0);

  let finalHoldings = holdings;
  if (missingWeights && valuesTotal > 0) {
    const base = allHaveValues ? valuesTotal : parsed.totalPortfolioValue ?? valuesTotal;
    finalHoldings = holdings.map((h) => ({
      ...h,
      weight: h.value ? Math.round((h.value / base) * 10000) / 100 : h.weight,
    }));
    warnings.push("Some percentage weights weren't stated — they were calculated from market values.");
  }
  if (!parsed.totalPortfolioValue && valuesTotal > 0 && allHaveValues) {
    parsed.totalPortfolioValue = Math.round(valuesTotal * 100) / 100;
    warnings.push("Total portfolio value wasn't stated — it was taken as the sum of the holding values.");
  }

  if (finalHoldings.length === 0) {
    warnings.push("No holdings could be extracted from this document.");
  }

  return Response.json({
    ok: true,
    // Never carried through: personal details aren't stored on the platform.
    clientName: null,
    asAtDate: parsed.asAtDate ?? null,
    totalPortfolioValue: parsed.totalPortfolioValue ?? null,
    holdings: finalHoldings,
    warnings,
  });
}

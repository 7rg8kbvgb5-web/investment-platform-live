import Anthropic from "@anthropic-ai/sdk";
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

Also extract, if present anywhere in the document:
- clientName: the account holder or client name.
- asAtDate: the statement date or "as at" date.
- totalPortfolioValue: the total portfolio value.

Respond ONLY with a JSON object (no markdown fences, no preamble) matching this shape:
{
  "clientName": string | null,
  "asAtDate": string | null,
  "totalPortfolioValue": number | null,
  "holdings": [{ "code": string, "name": string, "weight": number | null, "value": number | null, "quantity": number | null }],
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
};

type ExtractionResult = {
  clientName: string | null;
  asAtDate: string | null;
  totalPortfolioValue: number | null;
  holdings: ExtractedHolding[];
  warnings: string[];
};

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { ok: false, error: "ANTHROPIC_API_KEY is not configured." },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return Response.json(
      { ok: false, error: "No PDF file was provided." },
      { status: 400 }
    );
  }

  if (file.type !== "application/pdf") {
    return Response.json(
      { ok: false, error: "Only PDF files are supported." },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  const client = new Anthropic({ apiKey });

  let response;
  try {
    response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: "Extract all holdings from this portfolio statement.",
            },
          ],
        },
      ],
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "PDF extraction request failed.",
      },
      { status: 502 }
    );
  }

  const textBlock = response.content.find((block) => block.type === "text");
  const rawText = textBlock && "text" in textBlock ? textBlock.text : "{}";
  const cleaned = rawText.replace(/```json|```/g, "").trim();

  let parsed: ExtractionResult;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return Response.json(
      {
        ok: false,
        error: "Could not parse a structured result from the PDF. Try a clearer scan, or paste the holdings as CSV instead.",
      },
      { status: 422 }
    );
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
        sourceRow: index + 1,
      };
    })
    .filter((h): h is UploadedHolding => h !== null);

  const hasWeights = holdings.some((h) => h.weight > 0);
  const hasValues = holdings.some((h) => (h.value ?? 0) > 0);

  let finalHoldings = holdings;
  if (!hasWeights && hasValues) {
    const totalValue = holdings.reduce((sum, h) => sum + (h.value ?? 0), 0);
    finalHoldings = holdings.map((h) => ({
      ...h,
      weight:
        totalValue > 0 ? Math.round(((h.value ?? 0) / totalValue) * 10000) / 100 : 0,
    }));
    warnings.push(
      "The document didn't state percentage weights directly — weights were calculated from market values."
    );
  }

  if (finalHoldings.length === 0) {
    warnings.push("No holdings could be extracted from this document.");
  }

  return Response.json({
    ok: true,
    clientName: parsed.clientName ?? null,
    asAtDate: parsed.asAtDate ?? null,
    totalPortfolioValue: parsed.totalPortfolioValue ?? null,
    holdings: finalHoldings,
    warnings,
  });
}

import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "../supabase";
import { buildApprovedList } from "./approved-list";
import type { WeeklyBrief } from "../../domain/types/weekly-brief";

const TABLE = "weekly_briefs";

// This engine only ever produces adviser-facing recommendations for review —
// it never places trades or updates model portfolios directly.
const SYSTEM_PROMPT = `You are a research assistant for Ord Minnett private wealth advisers.
Your job is to produce a concise weekly research brief. Use web search to check for:
1. Macro/market events from the past 7 days relevant to an Australian private wealth client base.
2. Company-specific news for the Approved List securities provided, that an adviser should know about.
3. Any "best-in-class alternative" flags — cases where a materially better-positioned alternative
   security exists for a given Approved List holding, based on recent developments.

Everything you produce is a recommendation for a human adviser to review — never phrase anything as
an instruction to trade, and never claim an action has been taken.

Respond ONLY with a JSON object (no markdown fences, no preamble) matching this shape:
{
  "macroSummary": string,
  "securityAlerts": [{ "ticker": string, "name": string, "headline": string, "detail": string }],
  "alternativeFlags": [{ "ticker": string, "name": string, "alternative": string, "rationale": string }]
}
If there is nothing notable for a section, return an empty array for it — do not invent content.`;

function getMondayOf(date: Date): string {
  const day = date.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() + diff);
  return monday.toISOString().slice(0, 10);
}

export async function generateWeeklyBrief(): Promise<WeeklyBrief> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const client = new Anthropic({ apiKey });
  const approvedList = buildApprovedList().filter(
    (security) => security.approvedListStatus === "approved"
  );

  const holdingsList = approvedList
    .map((security) => `${security.code} — ${security.name} (${security.sector})`)
    .join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Approved List holdings to check:\n${holdingsList}\n\nProduce this week's brief.`,
      },
    ],
    tools: [{ type: "web_search_20250305", name: "web_search" }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  const rawText = textBlock && "text" in textBlock ? textBlock.text : "{}";
  const cleaned = rawText.replace(/```json|```/g, "").trim();

  let parsed: {
    macroSummary?: string;
    securityAlerts?: WeeklyBrief["securityAlerts"];
    alternativeFlags?: WeeklyBrief["alternativeFlags"];
  };

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = {
      macroSummary:
        "The brief could not be parsed automatically this week — see raw output below.",
      securityAlerts: [],
      alternativeFlags: [],
    };
  }

  const weekOf = getMondayOf(new Date());

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      week_of: weekOf,
      macro_summary: parsed.macroSummary ?? "",
      security_alerts: parsed.securityAlerts ?? [],
      alternative_flags: parsed.alternativeFlags ?? [],
      referenced_document_ids: [],
      raw_model_output: rawText,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to save weekly brief: ${error.message}`);
  }

  return {
    id: data.id,
    weekOf: data.week_of,
    macroSummary: data.macro_summary,
    securityAlerts: data.security_alerts ?? [],
    alternativeFlags: data.alternative_flags ?? [],
    referencedDocumentIds: data.referenced_document_ids ?? [],
    generatedAt: data.generated_at,
  };
}

export async function getLatestWeeklyBrief(): Promise<WeeklyBrief | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("week_of", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load weekly brief: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    weekOf: data.week_of,
    macroSummary: data.macro_summary,
    securityAlerts: data.security_alerts ?? [],
    alternativeFlags: data.alternative_flags ?? [],
    referencedDocumentIds: data.referenced_document_ids ?? [],
    generatedAt: data.generated_at,
  };
}

export type WeeklyBriefSecurityAlert = {
  ticker: string;
  name: string;
  headline: string;
  detail: string;
};

export type WeeklyBriefAlternativeFlag = {
  ticker: string;
  name: string;
  alternative: string;
  rationale: string;
};

export type WeeklyBrief = {
  id: string;
  weekOf: string;
  macroSummary: string;
  securityAlerts: WeeklyBriefSecurityAlert[];
  alternativeFlags: WeeklyBriefAlternativeFlag[];
  referencedDocumentIds: string[];
  generatedAt: string;
  rawModelOutput: string | null;
};

import type { ClientPortfolioAnalysis } from "../lib/engines/client-portfolio-analysis";

type ClientPortfolioAnalysisPanelProps = {
  analysis: ClientPortfolioAnalysis;
};

export function ClientPortfolioAnalysisPanel({
  analysis,
}: ClientPortfolioAnalysisPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Client Portfolio Analysis
        </p>

        <h2 className="text-2xl font-bold text-slate-900">
          Client vs Model Portfolio Gap Analysis
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          Compares the client portfolio against the approved model portfolio and
          identifies required adjustments.
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Client Portfolio</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {analysis.clientName}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Model Portfolio</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {analysis.modelName}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Alignment Score</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {analysis.alignmentScore}/100
          </p>
          <p className="mt-1 text-sm font-semibold capitalize text-slate-700">
            {analysis.status.replaceAll("-", " ")}
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">
          Portfolio Gaps
        </h3>

        <div className="space-y-3">
          {analysis.gaps.map((gap) => (
            <div
              key={gap.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {gap.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {gap.description}
                  </p>
                </div>

                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  {gap.severity}
                </span>
              </div>

              <p className="mt-3 text-sm text-slate-700">
                <span className="font-semibold">Recommendation:</span>{" "}
                {gap.recommendation}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
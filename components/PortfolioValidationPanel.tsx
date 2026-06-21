import { validatePortfolioConstruction } from "../lib/engines/portfolio-validation";

export function PortfolioValidationPanel() {
  const validation = validatePortfolioConstruction();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Portfolio Validation
        </p>
        <h2 className="text-2xl font-bold text-slate-900">
          Quality Score & Rule Checks
        </h2>
        <p className="mt-2 text-sm text-slate-600">{validation.summary}</p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Portfolio</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {validation.portfolioName}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Quality Score</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {validation.overallScore}/100
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Status</p>
          <p className="mt-1 text-lg font-semibold capitalize text-amber-700">
            {validation.status}
          </p>
        </div>
      </div>
      <div className="mb-6">
  <h3 className="mb-3 text-lg font-semibold text-slate-900">
    Validation Score Breakdown
  </h3>

  <div className="grid gap-3 md:grid-cols-2">
    {validation.scores.map((score) => (
      <div
        key={score.category}
        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
      >
        <div className="flex items-center justify-between">
          <p className="font-medium text-slate-900">{score.label}</p>

          <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold uppercase">
            {score.status}
          </span>
        </div>

        <p className="mt-3 text-2xl font-bold text-slate-900">
          {score.score}/{score.maxScore}
        </p>
      </div>
    ))}
  </div>
</div>

      <div className="space-y-3">
        {validation.issues.map((issue) => (
          <div
            key={issue.id}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {issue.title}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {issue.description}
                </p>
              </div>

              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
                {issue.severity}
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-700">
              <span className="font-semibold">Recommendation:</span>{" "}
              {issue.recommendation}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
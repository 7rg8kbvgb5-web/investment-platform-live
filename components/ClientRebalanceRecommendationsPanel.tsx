import type { ClientRebalanceRecommendation } from "../lib/engines/client-rebalance-recommendations";

type ClientRebalanceRecommendationsPanelProps = {
  recommendations: ClientRebalanceRecommendation[];
};

export function ClientRebalanceRecommendationsPanel({
  recommendations,
}: ClientRebalanceRecommendationsPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Rebalance Recommendations
        </p>

        <h2 className="text-2xl font-bold text-slate-900">
          Security-Level Trade Recommendations
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          Converts client portfolio gaps into buy, sell, hold and review actions
          against the approved model portfolio.
        </p>
      </div>

      <div className="space-y-3">
        {recommendations.map((recommendation) => (
          <div
            key={recommendation.id}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {recommendation.action.toUpperCase()} {recommendation.ticker}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {recommendation.name} · {recommendation.sector}
                </p>
              </div>

              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                {recommendation.priority}
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Current Weight
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {recommendation.currentWeight}%
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Target Weight
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {recommendation.targetWeight}%
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Change
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {recommendation.changeWeight > 0 ? "+" : ""}
                  {recommendation.changeWeight}%
                </p>
              </div>
            </div>

            <p className="mt-3 text-sm text-slate-700">
              <span className="font-semibold">Rationale:</span>{" "}
              {recommendation.rationale}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
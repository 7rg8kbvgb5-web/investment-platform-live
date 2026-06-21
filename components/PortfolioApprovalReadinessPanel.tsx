import { evaluateApprovalReadiness } from "../lib/engines/portfolio-approval-readiness";

export function PortfolioApprovalReadinessPanel() {
  const readiness = evaluateApprovalReadiness();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Approval Readiness
        </p>

        <h2 className="text-2xl font-bold text-slate-900">
          Model Portfolio Approval Status
        </h2>

        <p className="mt-2 text-sm text-slate-600">{readiness.rationale}</p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Approval Status</p>
          <p className="mt-1 text-lg font-semibold capitalize text-slate-900">
            {readiness.status.replaceAll("-", " ")}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Validation Score</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {readiness.score}/100
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Decision Basis</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            IC Review Gate
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">
          Required Actions
        </h3>

        {readiness.requiredActions.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            No required actions. Portfolio is ready for approval workflow.
          </p>
        ) : (
          <div className="space-y-3">
            {readiness.requiredActions.map((action) => (
              <div
                key={action}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
              >
                {action}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
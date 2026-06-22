import type { InvestmentProposal } from "../lib/engines/investment-proposal-generator";
import type { PortfolioApprovalReadiness } from "../lib/engines/portfolio-approval-readiness";

type InvestmentProposalPanelProps = {
  proposal: InvestmentProposal;
  approvalReadiness: PortfolioApprovalReadiness;
};

function getStatusLabel(status: string) {
  return status.replaceAll("-", " ");
}

function getStatusClass(status: string) {
  if (status === "aligned" || status === "approved") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "minor-adjustments" || status === "conditional-approval") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-rose-100 text-rose-700";
}

export function InvestmentProposalPanel({
  proposal,
  approvalReadiness,
}: InvestmentProposalPanelProps) {
  const evidenceSection = proposal.sections.find(
    (section) => section.id === "investment-committee-evidence"
  );

  const tradeSection = proposal.sections.find(
    (section) => section.id === "recommended-changes"
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Investment Proposal
          </p>

          <h2 className="text-2xl font-bold text-slate-900">
            Adviser Proposal Draft
          </h2>

          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Generates an adviser-grade proposal summary using the shared client
            advice workflow, portfolio analysis, rebalance recommendations,
            investment committee evidence and approval readiness checks.
          </p>
        </div>

        <span
          className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${getStatusClass(
            proposal.status
          )}`}
        >
          {getStatusLabel(proposal.status)}
        </span>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Client</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {proposal.clientName}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Model</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {proposal.modelName}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Alignment Score</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {proposal.alignmentScore}/100
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Approval Score</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {approvalReadiness.score}/100
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Approval Status</p>
          <span
            className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusClass(
              approvalReadiness.status
            )}`}
          >
            {getStatusLabel(approvalReadiness.status)}
          </span>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">
            Recommended Changes Snapshot
          </p>

          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
            {tradeSection?.content || "No recommended changes available."}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">
            Investment Committee Evidence Snapshot
          </p>

          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
            {evidenceSection?.content ||
              "No investment committee evidence attached."}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">
            Approval Readiness Snapshot
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-700">
            {approvalReadiness.rationale}
          </p>

          {approvalReadiness.requiredActions.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {approvalReadiness.requiredActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm font-semibold text-slate-700">
              No outstanding approval actions.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {proposal.sections.map((section) => (
          <div
            key={section.id}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <h3 className="text-sm font-semibold text-slate-900">
              {section.title}
            </h3>

            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
              {section.content}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
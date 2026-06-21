import { generateInvestmentProposal } from "../lib/engines/investment-proposal-generator";

export function InvestmentProposalPanel() {
  const proposal = generateInvestmentProposal();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Investment Proposal
        </p>

        <h2 className="text-2xl font-bold text-slate-900">
          Adviser Proposal Draft
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          Generates a first-draft investment recommendation summary using the
          client portfolio analysis and rebalance recommendations.
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
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
          <p className="text-sm text-slate-500">Alignment</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {proposal.alignmentScore}/100
          </p>
          <p className="mt-1 text-sm font-semibold capitalize text-slate-700">
            {proposal.status.replaceAll("-", " ")}
          </p>
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
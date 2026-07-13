import { renderToBuffer } from "@react-pdf/renderer";
import { generateInvestmentProposal } from "../../../../lib/engines/investment-proposal-generator";
import { evaluateApprovalReadiness } from "../../../../lib/engines/portfolio-approval-readiness";
import { InvestmentProposalDocument } from "../../../../lib/pdf/InvestmentProposalDocument";

export const runtime = "nodejs";

export async function GET() {
  const proposal = generateInvestmentProposal();
  const approvalReadiness = evaluateApprovalReadiness();

  const buffer = await renderToBuffer(
    InvestmentProposalDocument({ proposal, approvalReadiness })
  );

  const fileName = `${proposal.clientName.replace(/\s+/g, "-")}-Investment-Proposal.pdf`;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

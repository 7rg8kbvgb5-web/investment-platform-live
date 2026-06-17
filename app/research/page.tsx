import PageContent from "../../components/PageContent";
import ResearchInboxPanel from "../../components/ResearchInboxPanel";
import ResearchRequestPanel from "../../components/ResearchRequestPanel";
import InvestmentCasePanel from "../../components/InvestmentCasePanel";
import InvestmentCaseLifecyclePanel from "../../components/InvestmentCaseLifecyclePanel";
import { SecurityMasterPanel } from "../../components/SecurityMasterPanel";
import { ApprovedListPanel } from "../../components/ApprovedListPanel";
import { SyncPreviewPanel } from "../../components/SyncPreviewPanel";

export default function ResearchPage() {
  return (
    <PageContent
      title="Research"
      description="Research inbox workflow, investment cases, security master, approved list, and research request management."
    >
      <ResearchInboxPanel />

      <ResearchRequestPanel />

      <InvestmentCasePanel />

      <InvestmentCaseLifecyclePanel />

      <SecurityMasterPanel />

      <ApprovedListPanel />

      <SyncPreviewPanel />
    </PageContent>
  );
}
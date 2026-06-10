import PageContent from "../../components/PageContent";
import ResearchInboxPanel from "../../components/ResearchInboxPanel";
import ResearchRequestPanel from "../../components/ResearchRequestPanel";
import InvestmentCaseLifecyclePanel from "../../components/InvestmentCaseLifecyclePanel";

export default function ResearchPage() {
  return (
    <PageContent
      title="Research"
      description="Research inbox workflow and research request management."
    >
      <ResearchInboxPanel />

      <ResearchRequestPanel />

      <div style={{ marginTop: "32px", padding: "24px", border: "2px solid red" }}>
  <h2>Investment Case Lifecycle Test</h2>
  <p>If this text appears, Step 62 wiring is active.</p>
</div>
    </PageContent>
  );
}
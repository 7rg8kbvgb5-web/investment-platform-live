import PageContent from "../../components/PageContent";
import { ConsensusViewPanel } from "../../components/ConsensusViewPanel";
import { HouseViewsPanel } from "../../components/HouseViewsPanel";
import TopIdeasVsModelPanel from "../../components/TopIdeasVsModelPanel";
import { SecurityMasterPanel } from "../../components/SecurityMasterPanel";
import ResearchLibraryPanel from "../../components/ResearchLibraryPanel";
import WeeklyBriefPanel from "../../components/WeeklyBriefPanel";

export default function ResearchPage() {
  return (
    <PageContent
      title="Research"
      description="Consensus view, research uploads, house views, and the security master with a live conviction rating."
    >
      <ConsensusViewPanel />

      {/* Upload Ord Minnett / Barrenjoey research (and the coverage universe) second, so it sits right under Consensus View. */}
      <ResearchLibraryPanel />

      <HouseViewsPanel />

      <TopIdeasVsModelPanel />

      <WeeklyBriefPanel />

      <SecurityMasterPanel />
    </PageContent>
  );
}
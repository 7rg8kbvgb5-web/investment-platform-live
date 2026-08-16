import PageContent from "../../components/PageContent";
import { ConsensusViewPanel } from "../../components/ConsensusViewPanel";
import { HouseViewsPanel } from "../../components/HouseViewsPanel";
import { SecurityMasterPanel } from "../../components/SecurityMasterPanel";
import ResearchLibraryPanel from "../../components/ResearchLibraryPanel";
import WeeklyBriefPanel from "../../components/WeeklyBriefPanel";

export default function ResearchPage() {
  return (
    <PageContent
      title="Research"
      description="Consensus view, house views, research library, and the security master with a live conviction rating."
    >
      <ConsensusViewPanel />

      <HouseViewsPanel />

      <WeeklyBriefPanel />

      <ResearchLibraryPanel />

      <SecurityMasterPanel />
    </PageContent>
  );
}
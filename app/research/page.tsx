import PageContent from '../../components/PageContent';
import ResearchInboxPanel from '../../components/ResearchInboxPanel';
import ResearchRequestPanel from '../../components/ResearchRequestPanel';

export default function ResearchPage() {
  return (
    <PageContent
      title="Research"
      description="Research inbox workflow and structured research requests."
    >
      <ResearchInboxPanel />
      <ResearchRequestPanel />
    </PageContent>
  );
}

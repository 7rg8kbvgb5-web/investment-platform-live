import PageContent from '../../components/PageContent';
import { FundReviewPanel } from '../../components/FundReviewPanel';

export default function FundReviewsPage() {
  return (
    <PageContent
      title="Fund Reviews"
      description="Live review of the actual listed and unlisted funds held in the model portfolio."
    >
      <FundReviewPanel />
    </PageContent>
  );
}

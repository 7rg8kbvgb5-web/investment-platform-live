import DashboardHero from '../components/dashboard/DashboardHero';
import DashboardSummaryGrid from '../components/dashboard/DashboardSummaryGrid';

export const dynamic = 'force-dynamic';

export default async function Home() {
  return (
    <>
      <DashboardHero />
      <DashboardSummaryGrid />
    </>
  );
}

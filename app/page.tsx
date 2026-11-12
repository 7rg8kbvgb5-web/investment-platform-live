import { Suspense } from 'react';
import DashboardHero from '../components/dashboard/DashboardHero';
import DashboardSummaryGrid from '../components/dashboard/DashboardSummaryGrid';
import SystemHealthBanner from '../components/dashboard/SystemHealthBanner';

export const dynamic = 'force-dynamic';

export default async function Home() {
  return (
    <>
      <DashboardHero />
      {/* Streams in separately so a slow check never holds up the dashboard. */}
      <Suspense fallback={null}>
        <SystemHealthBanner />
      </Suspense>
      <DashboardSummaryGrid />
    </>
  );
}

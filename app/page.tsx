import { supabase } from '../lib/supabase';
import { buildPortfolioState } from '../lib/engines/build-portfolio-state';
import DashboardHero from '../components/dashboard/DashboardHero';
import ProfileCardHeader from '../components/dashboard/ProfileCardHeader';
import ProfileSummaryGrid from '../components/dashboard/ProfileSummaryGrid';
import ProfileChartsSection from '../components/dashboard/ProfileChartsSection';
import ProfileAllocationTable from '../components/dashboard/ProfileAllocationTable';
import GuardrailsPanel from '../components/dashboard/GuardrailsPanel';
import StatusBox from '../components/dashboard/StatusBox';

export default async function Home() {
  const { data: profiles } = await supabase
    .from('risk_profiles')
    .select('*')
    .order('id');

  const { data: overlays } = await supabase
    .from('tactical_overlays')
    .select('*')
    .order('id');

  const { data: allocations } = await supabase
    .from('strategic_allocations')
    .select('*')
    .order('id');

  return (
    <main style={page}>
      <DashboardHero />

      {profiles?.map((profile) => {
        const {
          adjustedAllocations: profileAllocations,
          totalWeight,
          growthTotal,
          defensiveTotal,
          status,
          guardrailWarnings,
        } = buildPortfolioState({
          riskProfileName: profile.name,
          strategicAllocations: allocations || [],
          tacticalOverlays: overlays || [],
        });

        return (
          <section key={profile.id} style={profileCard}>
            <ProfileCardHeader
              name={profile.name}
              description={profile.description}
              growthAssets={profile.growth_assets}
              defensiveAssets={profile.defensive_assets}
            />

            <ProfileSummaryGrid
              totalWeight={totalWeight}
              growthTotal={growthTotal}
              defensiveTotal={defensiveTotal}
              status={status}
            />

            {profileAllocations.length === 0 ? (
              <StatusBox variant="warning">
                No allocation rows found for this risk profile.
              </StatusBox>
            ) : (
              <>
                <ProfileChartsSection
                  allocations={profileAllocations}
                  growthTotal={growthTotal}
                  defensiveTotal={defensiveTotal}
                />

                <ProfileAllocationTable allocations={profileAllocations} />
              </>
            )}

            <GuardrailsPanel warnings={guardrailWarnings} />
          </section>
        );
      })}
    </main>
  );
}

const page = {
  padding: '40px',
  fontFamily: 'Arial',
  background: '#04142b',
  minHeight: '100vh',
  color: 'white',
};

const profileCard = {
  marginBottom: '35px',
  padding: '30px',
  background: '#0b2342',
  borderRadius: '18px',
  border: '1px solid #2d4a6b',
};


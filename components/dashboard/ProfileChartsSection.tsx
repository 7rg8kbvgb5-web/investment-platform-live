import AllocationPieChart from '../AllocationPieChart';
import GrowthDefensiveChart from '../GrowthDefensiveChart';

type ProfileChartsSectionProps = {
  allocations: {
    asset_class: string;
    target_weight: number | string;
  }[];
  growthTotal: number;
  defensiveTotal: number;
};

export default function ProfileChartsSection({
  allocations,
  growthTotal,
  defensiveTotal,
}: ProfileChartsSectionProps) {
  return (
    <div style={chartGrid}>
      <div style={chartBox}>
        <h3 style={chartTitle}>Asset Class Allocation</h3>
        <AllocationPieChart
          allocations={allocations.map((allocation) => ({
            asset_class: allocation.asset_class,
            target_weight: Number(allocation.target_weight),
          }))}
        />
      </div>

      <div style={chartBox}>
        <h3 style={chartTitle}>Growth vs Defensive</h3>
        <GrowthDefensiveChart
          growthTotal={growthTotal}
          defensiveTotal={defensiveTotal}
        />
      </div>
    </div>
  );
}

const chartGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '20px',
  marginBottom: '25px',
};

const chartBox = {
  width: '100%',
  height: '420px',
  minHeight: '420px',
  marginBottom: '25px',
  background: '#071b34',
  borderRadius: '14px',
  border: '1px solid #2d4a6b',
  padding: '20px',
};

const chartTitle = {
  fontSize: '18px',
  margin: '0 0 10px 0',
};

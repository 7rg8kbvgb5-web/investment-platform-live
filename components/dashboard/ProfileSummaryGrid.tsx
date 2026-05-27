import StatusBox, {
  allocationStatusVariant,
} from './StatusBox';

type ProfileSummaryGridProps = {
  totalWeight: number;
  growthTotal: number;
  defensiveTotal: number;
  status: string;
};

export default function ProfileSummaryGrid({
  totalWeight,
  growthTotal,
  defensiveTotal,
  status,
}: ProfileSummaryGridProps) {
  return (
    <div style={summaryGrid}>
      <div style={summaryBox}>
        <span>Total Allocation</span>
        <strong>{totalWeight}%</strong>
      </div>

      <div style={summaryBox}>
        <span>Growth Total</span>
        <strong>{growthTotal}%</strong>
      </div>

      <div style={summaryBox}>
        <span>Defensive Total</span>
        <strong>{defensiveTotal}%</strong>
      </div>

      <div style={summaryBox}>
        <span>Status</span>
        <StatusBox variant={allocationStatusVariant(status)} display="inline">
          {status}
        </StatusBox>
      </div>
    </div>
  );
}

const summaryGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '16px',
  marginBottom: '25px',
};

const summaryBox = {
  padding: '16px',
  background: '#12345b',
  borderRadius: '14px',
  border: '1px solid #2d4a6b',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '8px',
};

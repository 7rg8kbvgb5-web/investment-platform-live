import type {
  StrategicAllocation,
  TacticalOverlay,
} from '../../domain/types/allocation';
import { resetToStrategicAllocation } from '../../lib/engines/reset-to-strategic-allocation';
import StatusBox from './StatusBox';

type ResetToStrategicPanelProps = {
  strategicAllocations: StrategicAllocation[];
  tacticalOverlays: TacticalOverlay[];
  riskProfileName: string;
};

export default function ResetToStrategicPanel({
  strategicAllocations,
  tacticalOverlays,
  riskProfileName,
}: ResetToStrategicPanelProps) {
  const profileAllocations = strategicAllocations.filter(
    (allocation) => allocation.risk_profile === riskProfileName
  );
  const profileOverlays = tacticalOverlays.filter(
    (overlay) => overlay.risk_profile === riskProfileName
  );

  const { metadata } = resetToStrategicAllocation({
    strategicAllocations: profileAllocations,
    tacticalOverlays: profileOverlays,
  });

  const resetAvailable = metadata.overlaysRemoved > 0;

  if (!resetAvailable) {
    return (
      <StatusBox variant="success">
        Portfolio already matches strategic allocation (no active overlays to
        remove)
      </StatusBox>
    );
  }

  return (
    <div style={panel}>
      <h3 style={title}>Reset to Strategic Allocation</h3>
      <StatusBox variant="neutral">
        Simulation only — no portfolio data will be changed
      </StatusBox>
      <StatusBox variant="warning">
        Reset available: {metadata.overlaysRemoved} active overlay
        {metadata.overlaysRemoved === 1 ? '' : 's'} would be removed
      </StatusBox>
      <p style={timestamp}>
        Simulated at: {new Date(metadata.timestamp).toLocaleString()}
      </p>
    </div>
  );
}

const panel = {
  marginTop: '25px',
};

const title = {
  margin: '0 0 16px 0',
  fontSize: '18px',
  fontWeight: 600,
};

const timestamp = {
  margin: '0',
  fontSize: '14px',
  color: '#94a3b8',
};

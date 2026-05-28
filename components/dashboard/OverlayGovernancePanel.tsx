import type { TacticalOverlayDateWarning } from '../../domain/types/overlay-governance';
import StatusBox from './StatusBox';

type OverlayGovernancePanelProps = {
  warnings: TacticalOverlayDateWarning[];
};

export default function OverlayGovernancePanel({
  warnings,
}: OverlayGovernancePanelProps) {
  if (warnings.length === 0) {
    return (
      <StatusBox variant="success">
        No overlay review or expiry issues detected
      </StatusBox>
    );
  }

  return (
    <div style={panel}>
      <h3 style={title}>Overlay Governance</h3>
      {warnings.map((warning, index) => (
        <StatusBox
          key={`${warning.message}-${index}`}
          variant={warning.level === 'error' ? 'error' : 'warning'}
        >
          {warning.message}
        </StatusBox>
      ))}
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

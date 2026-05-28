import type { GuardrailWarning } from '../../domain/types/guardrails';
import StatusBox from './StatusBox';

type GuardrailsPanelProps = {
  warnings: GuardrailWarning[];
};

export default function GuardrailsPanel({ warnings }: GuardrailsPanelProps) {
  if (warnings.length === 0) {
    return (
      <StatusBox variant="success">No guardrail issues detected</StatusBox>
    );
  }

  return (
    <div style={panel}>
      <h3 style={title}>Portfolio Guardrails</h3>
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

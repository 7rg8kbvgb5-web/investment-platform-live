import type { StrategicAllocation } from '../../domain/types/allocation';

type ProfileAllocationTableProps = {
  allocations: StrategicAllocation[];
};

export default function ProfileAllocationTable({
  allocations,
}: ProfileAllocationTableProps) {
  return (
    <table style={table}>
      <thead>
        <tr>
          <th style={tableHeader}>Asset Class</th>
          <th style={tableHeader}>Target</th>
          <th style={tableHeader}>Min</th>
          <th style={tableHeader}>Max</th>
          <th style={tableHeader}>Classification</th>
        </tr>
      </thead>

      <tbody>
        {allocations.map((allocation) => (
          <tr key={allocation.id}>
            <td style={tableCell}>{allocation.asset_class}</td>
            <td style={tableCell}>{allocation.target_weight}%</td>
            <td style={tableCell}>{allocation.min_weight}%</td>
            <td style={tableCell}>{allocation.max_weight}%</td>
            <td style={tableCell}>{allocation.classification}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const tableHeader = {
  padding: '12px',
  border: '1px solid #2d4a6b',
  textAlign: 'left' as const,
  background: '#12345b',
};

const tableCell = {
  padding: '12px',
  border: '1px solid #2d4a6b',
};

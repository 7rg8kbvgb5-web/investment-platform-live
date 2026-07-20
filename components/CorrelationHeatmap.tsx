'use client';

function colorForCorrelation(value: number): string {
  // -1 (red, moves opposite) -> 0 (neutral navy) -> +1 (blue, moves together)
  if (value >= 0) {
    const intensity = Math.min(value, 1);
    const g = Math.round(255 - intensity * 120);
    const b = Math.round(255 - intensity * 60);
    return `rgb(${Math.round(147 - intensity * 100)}, ${g - 60}, ${b})`;
  }
  const intensity = Math.min(-value, 1);
  const r = Math.round(255 - intensity * 40);
  return `rgb(${r}, ${Math.round(90 - intensity * 40)}, ${Math.round(90 - intensity * 40)})`;
}

export default function CorrelationHeatmap({
  codes,
  matrix,
  labels,
}: {
  codes: string[];
  matrix: number[][];
  labels?: Record<string, string>;
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={table}>
        <thead>
          <tr>
            <th style={cornerCell} />
            {codes.map((code) => (
              <th key={code} style={headerCell} title={labels?.[code] ?? code}>
                {code}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {codes.map((rowCode, rowIdx) => (
            <tr key={rowCode}>
              <th style={rowHeaderCell} title={labels?.[rowCode] ?? rowCode}>
                {rowCode}
              </th>
              {codes.map((colCode, colIdx) => {
                const value = matrix[rowIdx][colIdx];
                return (
                  <td
                    key={colCode}
                    style={{ ...dataCell, background: colorForCorrelation(value) }}
                    title={`${rowCode} vs ${colCode}: ${value.toFixed(2)}`}
                  >
                    {value.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const table = {
  borderCollapse: 'collapse' as const,
  fontSize: '11px',
};

const cornerCell = {
  minWidth: '60px',
};

const headerCell = {
  padding: '6px 8px',
  color: '#94a3b8',
  fontWeight: 600,
  textAlign: 'center' as const,
  whiteSpace: 'nowrap' as const,
};

const rowHeaderCell = {
  padding: '6px 8px',
  color: '#94a3b8',
  fontWeight: 600,
  textAlign: 'right' as const,
  whiteSpace: 'nowrap' as const,
};

const dataCell = {
  padding: '8px 10px',
  textAlign: 'center' as const,
  color: '#0b1220',
  fontWeight: 700,
  minWidth: '46px',
};

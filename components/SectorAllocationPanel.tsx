import { buildSectorAllocations } from "../lib/engines/sector-allocation";

export default function SectorAllocationPanel() {
  const allocations = buildSectorAllocations();

  return (
    <section>
      <h2>Sector Allocation Engine</h2>
      <p>
        Converts Sector Health Score recommendations into adjusted portfolio
        sector weights.
      </p>

      <table>
        <thead>
          <tr>
            <th>Sector</th>
            <th>Base Weight</th>
            <th>Recommendation</th>
            <th>Health Score</th>
            <th>Adjusted Weight</th>
          </tr>
        </thead>
        <tbody>
          {allocations.map((sector) => (
            <tr key={sector.sector}>
              <td>{sector.sector}</td>
              <td>{sector.baseWeight}%</td>
              <td>{sector.recommendation}</td>
              <td>{sector.sectorHealthScore.toFixed(1)}</td>
              <td>{sector.adjustedWeight}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
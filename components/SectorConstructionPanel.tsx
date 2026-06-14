import { buildSectorConstruction } from "../lib/engines/sector-construction";

export function SectorConstructionPanel() {
  const sectors = buildSectorConstruction();

  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Sector Construction</h2>

      <p className="mt-2 text-sm text-gray-600">
        Sector-level Champion / Challenger construction using 70/30 weighting, or 100% Champion where no Challenger exists.
      </p>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr>
            <th className="text-left">Sector</th>
            <th className="text-left">Code</th>
            <th className="text-left">Name</th>
            <th className="text-left">Role</th>
            <th className="text-left">Sector Weight</th>
            <th className="text-left">Conviction</th>
            <th className="text-left">House View</th>
          </tr>
        </thead>

        <tbody>
          {sectors.flatMap((sector) =>
            sector.securities.map((security) => (
              <tr key={security.id}>
                <td>{sector.sector}</td>
                <td>{security.code}</td>
                <td>{security.name}</td>
                <td>{security.role}</td>
                <td>{security.sectorWeight}%</td>
                <td>{security.convictionScore}/5</td>
                <td>{security.houseView}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
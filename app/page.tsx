import { supabase } from "../lib/supabaseclient"
import AllocationPieChart from "../components/AllocationPieChart"
import GrowthDefensiveChart from "../components/GrowthDefensiveChart"
export default async function Home() {
  const { data: profiles } = await supabase
    .from("risk_profiles")
    .select("*")
    .order("id")
const { data: overlays } = await supabase
  .from("tactical_overlays")
  .select("*")
  .order("id")
  const { data: allocations } = await supabase
    .from("strategic_allocations")
    .select("*")
    .order("id")

  return (
    <main style={page}>
      <section style={hero}>
        <p style={eyebrow}>Investment Platform</p>
        <h1 style={title}>Portfolio Construction Engine</h1>
        <p style={subtitle}>
          Strategic asset allocation by risk profile, with live Supabase data,
          growth/defensive validation and portfolio guardrail foundations.
        </p>
      </section>

      {profiles?.map((profile) => {
        const profileAllocations =
  allocations
    ?.filter((a) => a.risk_profile === profile.name)
    .map((allocation) => {
      const overlay = overlays?.find(
        (o) =>
          o.risk_profile === allocation.risk_profile &&
          o.asset_class === allocation.asset_class &&
          o.status === "Active"
      )

      const tacticalAdjustment = Number(
        overlay?.tactical_adjustment || 0
      )

      return {
        ...allocation,
        tactical_adjustment: tacticalAdjustment,
        final_weight:
          Number(allocation.target_weight) + tacticalAdjustment,
        overlay_reason: overlay?.reason || null,
      }
    }) || []

        const totalWeight = profileAllocations.reduce(
          (sum, a) => sum + Number(a.target_weight),
          0
        )

        const growthTotal = profileAllocations
          .filter((a) => a.classification === "Growth")
          .reduce((sum, a) => sum + Number(a.target_weight), 0)

        const defensiveTotal = profileAllocations
          .filter((a) => a.classification === "Defensive")
          .reduce((sum, a) => sum + Number(a.target_weight), 0)

        return (
          <section key={profile.id} style={profileCard}>
            <div style={profileHeader}>
              <div>
                <h2 style={profileTitle}>{profile.name}</h2>
                <p style={profileDescription}>{profile.description}</p>
              </div>

              <div style={riskSplitBox}>
                <p>Growth: {profile.growth_assets}%</p>
                <p>Defensive: {profile.defensive_assets}%</p>
              </div>
            </div>

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
                <strong>
                  {totalWeight === 100 ? "Valid" : "Check allocation"}
                </strong>
              </div>
            </div>

            {profileAllocations.length === 0 ? (
              <div style={warningBox}>
                No allocation rows found for this risk profile.
              </div>
            ) : (
              <>
                <div style={chartGrid}>
  <div style={chartBox}>
    <h3 style={chartTitle}>Asset Class Allocation</h3>
    <AllocationPieChart allocations={profileAllocations} />
  </div>

  <div style={chartBox}>
    <h3 style={chartTitle}>Growth vs Defensive</h3>
    <GrowthDefensiveChart
      growthTotal={growthTotal}
      defensiveTotal={defensiveTotal}
    />
  </div>
</div>

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
                    {profileAllocations.map((allocation) => (
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
              </>
            )}
          </section>
        )
      })}
    </main>
  )
}

const page = {
  padding: "40px",
  fontFamily: "Arial",
  background: "#04142b",
  minHeight: "100vh",
  color: "white",
}

const hero = {
  marginBottom: "40px",
  padding: "30px",
  background: "#0b2342",
  borderRadius: "18px",
  border: "1px solid #2d4a6b",
}

const eyebrow = {
  textTransform: "uppercase" as const,
  letterSpacing: "2px",
  color: "#8fb7e8",
  fontSize: "13px",
  marginBottom: "10px",
}

const title = {
  fontSize: "48px",
  margin: "0 0 15px 0",
}

const subtitle = {
  fontSize: "18px",
  maxWidth: "900px",
  opacity: 0.85,
  lineHeight: 1.5,
}

const profileCard = {
  marginBottom: "35px",
  padding: "30px",
  background: "#0b2342",
  borderRadius: "18px",
  border: "1px solid #2d4a6b",
}

const profileHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "25px",
  marginBottom: "25px",
}

const profileTitle = {
  fontSize: "32px",
  margin: "0 0 10px 0",
}

const profileDescription = {
  opacity: 0.8,
  maxWidth: "800px",
  lineHeight: 1.5,
}

const riskSplitBox = {
  minWidth: "220px",
  padding: "18px",
  background: "#12345b",
  borderRadius: "14px",
  border: "1px solid #2d4a6b",
}

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "16px",
  marginBottom: "25px",
}

const summaryBox = {
  padding: "16px",
  background: "#12345b",
  borderRadius: "14px",
  border: "1px solid #2d4a6b",
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
}

const chartBox = {
  width: "100%",
  height: "420px",
  minHeight: "420px",
  marginBottom: "25px",
  background: "#071b34",
  borderRadius: "14px",
  border: "1px solid #2d4a6b",
  padding: "20px",
}

const warningBox = {
  padding: "18px",
  background: "#5b2b12",
  border: "1px solid #d97706",
  borderRadius: "12px",
  marginBottom: "25px",
}

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
}

const tableHeader = {
  padding: "12px",
  border: "1px solid #2d4a6b",
  textAlign: "left" as const,
  background: "#12345b",
}

const tableCell = {
  padding: "12px",
  border: "1px solid #2d4a6b",

}

const chartGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "20px",
  marginBottom: "25px",
}

const chartTitle = {
  fontSize: "18px",
  margin: "0 0 10px 0",
}
"use client";

export type ClientRiskProfile =
  | "Conservative"
  | "Moderate"
  | "Balanced"
  | "Growth"
  | "High Growth";

const riskProfiles: {
  id: ClientRiskProfile;
  description: string;
  growthAssets: string;
  defensiveAssets: string;
}[] = [
  {
    id: "Conservative",
    description: "Capital preservation with modest growth exposure.",
    growthAssets: "30%",
    defensiveAssets: "70%",
  },
  {
    id: "Moderate",
    description: "Balanced income and capital growth with lower volatility.",
    growthAssets: "45%",
    defensiveAssets: "55%",
  },
  {
    id: "Balanced",
    description: "Balanced long-term growth and income objective.",
    growthAssets: "60%",
    defensiveAssets: "40%",
  },
  {
    id: "Growth",
    description: "Higher growth exposure with moderate volatility tolerance.",
    growthAssets: "75%",
    defensiveAssets: "25%",
  },
  {
    id: "High Growth",
    description: "Maximum long-term growth focus with higher volatility tolerance.",
    growthAssets: "90%",
    defensiveAssets: "10%",
  },
];

interface Props {
  selectedRiskProfile: ClientRiskProfile;
  onChange: (riskProfile: ClientRiskProfile) => void;
}

export default function ClientRiskProfileSelector({
  selectedRiskProfile,
  onChange,
}: Props) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Client Risk Profile</p>
          <h2>Target Portfolio Selection</h2>
          <p className="muted">
            Select the client’s agreed risk profile. The uploaded portfolio will be
            assessed against this target model.
          </p>
        </div>

        <div className="status-pill">{selectedRiskProfile}</div>
      </div>

      <div className="proposal-preset-grid">
        {riskProfiles.map((profile) => (
          <button
            key={profile.id}
            type="button"
            className={
              selectedRiskProfile === profile.id
                ? "preset-card selected"
                : "preset-card"
            }
            onClick={() => onChange(profile.id)}
          >
            <span>{profile.id}</span>
            <strong>
              {profile.growthAssets} Growth / {profile.defensiveAssets} Defensive
            </strong>
            <p>{profile.description}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
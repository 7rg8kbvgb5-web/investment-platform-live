'use client'

interface Props {
  profile: string
}

export default function RiskProfileContent({ profile }: Props) {
  return (
    <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 p-8">

      <h2 className="text-2xl font-bold text-white">
        {profile} Portfolio
      </h2>

      <p className="mt-3 text-slate-400">
        This workspace will display the complete {profile.toLowerCase()} model
        portfolio including:
      </p>

      <ul className="mt-6 space-y-3 text-slate-300">
        <li>• Portfolio Summary</li>
        <li>• Asset Allocation</li>
        <li>• Pie Charts</li>
        <li>• Sector Weightings</li>
        <li>• Holdings</li>
        <li>• Guardrails</li>
        <li>• Overlay Governance</li>
        <li>• Portfolio Simulation</li>
      </ul>

    </div>
  )
}
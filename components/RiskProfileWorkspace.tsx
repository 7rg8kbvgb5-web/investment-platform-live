'use client'

import { useState } from 'react'

const profiles = [
  'Conservative',
  'Moderate',
  'Balanced',
  'Growth',
  'High Growth',
] as const

export default function RiskProfileWorkspace() {
  const [selectedProfile, setSelectedProfile] =
    useState<(typeof profiles)[number]>('Balanced')

  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-2xl font-bold">Risk Profiles</h2>

        <p className="text-slate-400 mt-2">
          Select a model portfolio to review its asset allocation,
          sector exposures, guardrails and simulation.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {profiles.map((profile) => (
          <button
            key={profile}
            onClick={() => setSelectedProfile(profile)}
            className={`rounded-xl border px-5 py-3 font-semibold transition ${
              selectedProfile === profile
                ? 'bg-blue-600 border-blue-400 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-blue-400'
            }`}
          >
            {profile}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900 p-8">

        <h3 className="text-xl font-bold text-white">
          {selectedProfile}
        </h3>

        <p className="mt-2 text-slate-400">
          Portfolio information for the {selectedProfile} model
          will appear here.
        </p>

      </div>

    </div>
  )
}
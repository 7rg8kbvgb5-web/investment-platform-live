'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import PortfolioWorkspaceTabs from './PortfolioWorkspaceTabs'
import ClientRiskProfileSelector from './ClientRiskProfileSelector'
import {
  useClientAdvice,
} from './ClientAdviceContext'

type PortfolioWorkspaceKey = 'modelPortfolio' | 'riskProfile' | 'construction' | 'clientAdvice'

interface Props {
  // The static model portfolio itself - which securities exist, per
  // asset class. Holds true across every risk profile; no weightings
  // live here at all.
  modelPortfolio: React.ReactNode
  // The formally-set model portfolio per risk profile - "under a perfect
  // scenario" - built and edited here.
  riskProfile: React.ReactNode
  // A specific client's uploaded portfolio compared against, and adjusted
  // towards, the risk profile selected above.
  construction: React.ReactNode
  // Reasoning, sourced context, and manual additions that turn the
  // construction output into a client-ready proposal.
  clientAdvice: React.ReactNode
}

export default function PortfolioWorkspace(props: Props) {
  return <WorkspaceBody {...props} />
}

function WorkspaceBody({
  modelPortfolio,
  riskProfile,
  construction,
  clientAdvice,
}: Props) {
  const searchParams = useSearchParams()
  const validTabs: PortfolioWorkspaceKey[] = ['modelPortfolio', 'riskProfile', 'construction', 'clientAdvice']
  const tabFromUrl = searchParams.get('tab') as PortfolioWorkspaceKey | null
  const [activeTab, setActiveTab] = useState<PortfolioWorkspaceKey>(
    tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'modelPortfolio',
  )

  const { selectedRiskProfile, setSelectedRiskProfile } = useClientAdvice()


  return (
    <div className="space-y-6">
      <PortfolioWorkspaceTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'modelPortfolio' && (
        <div className="section">{modelPortfolio}</div>
      )}

      {activeTab === 'riskProfile' && (
        <div className="section">
          <ClientRiskProfileSelector
            selectedRiskProfile={selectedRiskProfile}
            onChange={setSelectedRiskProfile}
          />
          {riskProfile}
        </div>
      )}

      {activeTab === 'construction' && (
        <div className="section">{construction}</div>
      )}

      {activeTab === 'clientAdvice' && (
        <div className="section">{clientAdvice}</div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import PortfolioWorkspaceTabs from './PortfolioWorkspaceTabs'
import { WorkflowStepper, WorkflowStep } from './WorkflowStepper'
import ClientAdviceDecisionSummary from './ClientAdviceDecisionSummary'
import ProposalV3Panel from './ProposalV3Panel'
import ClientRiskProfileSelector from './ClientRiskProfileSelector'
import {
  useClientAdvice,
} from './ClientAdviceContext'
import InstitutionalProposalBuilderPanel from "./InstitutionalProposalBuilderPanel";

type PortfolioWorkspaceKey = 'riskProfile' | 'construction' | 'clientAdvice'

interface Props {
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
  riskProfile,
  construction,
  clientAdvice,
}: Props) {
  const [activeTab, setActiveTab] =
    useState<PortfolioWorkspaceKey>('riskProfile')

  const { selectedRiskProfile, setSelectedRiskProfile } = useClientAdvice()

  const clientAdviceWorkflow: WorkflowStep[] = [
    {
      id: 'upload',
      label: 'Upload Portfolio',
      description: "Import the client's holdings.",
      status: 'complete',
    },
    {
      id: 'analysis',
      label: 'Analyse Portfolio',
      description: 'Calculate drift, diversification and quality.',
      status: 'complete',
    },
    {
      id: 'comparison',
      label: 'Compare to Model',
      description: 'Review differences against the selected model portfolio.',
      status: 'active',
    },
    {
      id: 'proposal',
      label: 'Generate Proposal',
      description: 'Create a professional investment recommendation.',
      status: 'pending',
    },
  ]

  return (
    <div className="space-y-6">
      <PortfolioWorkspaceTabs activeTab={activeTab} onChange={setActiveTab} />

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
        <div className="section">
          <WorkflowStepper
            title="Client Portfolio Recommendation"
            description="Upload holdings, analyse the current position, compare against the house model and prepare a professional investment proposal."
            steps={clientAdviceWorkflow}
          />

          <ClientAdviceDecisionSummary />

          {clientAdvice}

          <ProposalV3Panel />

          <InstitutionalProposalBuilderPanel
            proposal={{
              executiveSummary:
                'This proposal summarises the current portfolio position, recommended changes and investment committee evidence supporting the advice.',
            }}
            approvalReadiness={{
              status: 'Draft',
            }}
          />
        </div>
      )}
    </div>
  )
}

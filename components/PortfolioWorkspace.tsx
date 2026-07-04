'use client'

import { useState } from 'react'
import PortfolioWorkspaceTabs from './PortfolioWorkspaceTabs'
import { WorkflowStepper, WorkflowStep } from './WorkflowStepper'
import ClientAdviceDecisionSummary from './ClientAdviceDecisionSummary'
import ProposalV3Panel from './ProposalV3Panel'
import ClientRiskProfileSelector, {
  type ClientRiskProfile,
} from './ClientRiskProfileSelector'
import {
  ClientAdviceProvider,
  useClientAdvice,
} from './ClientAdviceContext'
import ModelPortfolioBuilderPanel from "./ModelPortfolioBuilderPanel";
import InstitutionalProposalBuilderPanel from "./InstitutionalProposalBuilderPanel";

type PortfolioWorkspaceKey =
  | 'construction'
  | 'riskProfiles'
  | 'clientAdvice'
  | 'governance'

  interface Props {
    construction: React.ReactNode
    riskProfiles: React.ReactNode
    clientAdvice: React.ReactNode
    governance: React.ReactNode
  }

export default function PortfolioWorkspace({
  construction,
  riskProfiles,
  clientAdvice,
  governance,
}: Props) {
  const [activeTab, setActiveTab] =
    useState<PortfolioWorkspaceKey>('construction')


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

      {activeTab === 'construction' && construction}

      {activeTab === 'riskProfiles' && (
  <div className="section">
    <ModelPortfolioBuilderPanel />
  </div>
)}

      {activeTab === 'clientAdvice' && (
        <div className="section">
          <WorkflowStepper
            title="Client Portfolio Recommendation"
            description="Upload holdings, analyse the current position, compare against the house model and prepare a professional investment proposal."
            steps={clientAdviceWorkflow}
          />

<ClientRiskProfileSelector
  selectedRiskProfile="Balanced"
  onChange={() => {}}
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

      {activeTab === 'governance' && governance}
    </div>
  )
}
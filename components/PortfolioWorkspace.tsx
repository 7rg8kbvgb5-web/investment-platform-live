'use client'

import { useState } from 'react'
import PortfolioWorkspaceTabs from './PortfolioWorkspaceTabs'
import { WorkflowStepper, WorkflowStep } from "./WorkflowStepper";

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
        id: "upload",
        label: "Upload Portfolio",
        description: "Import the client's holdings.",
        status: "complete",
      },
      {
        id: "analysis",
        label: "Analyse Portfolio",
        description: "Calculate drift, diversification and quality.",
        status: "complete",
      },
      {
        id: "comparison",
        label: "Compare to Model",
        description: "Review differences against the selected model portfolio.",
        status: "active",
      },
      {
        id: "proposal",
        label: "Generate Proposal",
        description: "Create a professional investment recommendation.",
        status: "pending",
      },
    ];

    return (
        <div className="space-y-6">
          <PortfolioWorkspaceTabs
            activeTab={activeTab}
            onChange={setActiveTab}
          />
      
          {activeTab === 'construction' && construction}
          {activeTab === 'riskProfiles' && riskProfiles}
          {activeTab === 'clientAdvice' && (
  <div className="section">
    <WorkflowStepper
      title="Client Portfolio Recommendation"
      description="Upload holdings, analyse the current position, compare against the house model and prepare a professional investment proposal."
      steps={clientAdviceWorkflow}
    />

    {clientAdvice}
  </div>
)}
          {activeTab === 'governance' && governance}
        </div>
       )
    }
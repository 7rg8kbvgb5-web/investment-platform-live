'use client'

import { useState } from 'react'
import PortfolioWorkspaceTabs from './PortfolioWorkspaceTabs'

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

    return (
        <div className="space-y-6">
          <PortfolioWorkspaceTabs
            activeTab={activeTab}
            onChange={setActiveTab}
          />
      
          {activeTab === 'construction' && construction}
          {activeTab === 'riskProfiles' && riskProfiles}
          {activeTab === 'clientAdvice' && clientAdvice}
          {activeTab === 'governance' && governance}
        </div>
       )
    }
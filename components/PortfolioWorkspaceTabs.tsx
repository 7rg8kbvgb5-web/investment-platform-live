'use client'

type PortfolioWorkspace =
  | 'construction'
  | 'analytics'
  | 'riskProfiles'
  | 'clientAdvice'
  | 'governance'

interface Props {
  activeTab: PortfolioWorkspace
  onChange: (tab: PortfolioWorkspace) => void
}

const tabs = [
  { id: 'construction', label: 'Construction' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'riskProfiles', label: 'Risk Profiles' },
  { id: 'clientAdvice', label: 'Client Advice' },
  { id: 'governance', label: 'Governance' },
] as const

export default function PortfolioWorkspaceTabs({ activeTab, onChange }: Props) {
  return (
    <div style={tabWrap}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              ...tabButton,
              ...(isActive ? activeTabButton : inactiveTabButton),
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

const tabWrap = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
  marginBottom: '28px',
  paddingBottom: '18px',
  borderBottom: '1px solid #1e3a5f',
} as const

const tabButton = {
  borderRadius: '999px',
  padding: '10px 18px',
  fontSize: '14px',
  fontWeight: 700,
  cursor: 'pointer',
} as const

const activeTabButton = {
  background: '#2563eb',
  color: '#ffffff',
  border: '1px solid #60a5fa',
} as const

const inactiveTabButton = {
  background: '#0b1f3a',
  color: '#bfdbfe',
  border: '1px solid #2b5c95',
} as const
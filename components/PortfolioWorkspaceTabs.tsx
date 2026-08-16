'use client'

type PortfolioWorkspace = 'modelPortfolio' | 'riskProfile' | 'construction' | 'clientAdvice'

interface Props {
  activeTab: PortfolioWorkspace
  onChange: (tab: PortfolioWorkspace) => void
}

// Order mirrors the actual workflow: define the static model portfolio
// itself (which securities exist, per asset class - holds true across
// every risk profile), then set each risk profile's weighting of that
// model, then bring a specific client's existing portfolio in line with
// it, then build the reasoning and context that turns those changes
// into a proposal.
const tabs = [
  { id: 'modelPortfolio', label: 'Model Portfolio' },
  { id: 'riskProfile', label: 'Risk Profile' },
  { id: 'construction', label: 'Construction' },
  { id: 'clientAdvice', label: 'Client Advice' },
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

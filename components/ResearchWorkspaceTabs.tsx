'use client'

type ResearchWorkspace =
  | 'research'
  | 'securityUniverse'
  | 'approvedList'
  | 'pipeline'

interface Props {
  activeTab: ResearchWorkspace
  onChange: (tab: ResearchWorkspace) => void
}

const tabs = [
  { id: 'research', label: 'Research Workflow' },
  { id: 'securityUniverse', label: 'Security Universe' },
  { id: 'approvedList', label: 'Approved List' },
  { id: 'pipeline', label: 'Pipeline' },
] as const

export default function ResearchWorkspaceTabs({ activeTab, onChange }: Props) {
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
  border: '1px solid #2b5c95',
  borderRadius: '999px',
  padding: '10px 18px',
  fontSize: '14px',
  fontWeight: 700,
  cursor: 'pointer',
} as const

const activeTabButton = {
  background: '#2563eb',
  color: '#ffffff',
  borderColor: '#60a5fa',
} as const

const inactiveTabButton = {
  background: '#0b1f3a',
  color: '#bfdbfe',
} as const
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

/** Shown once to an adviser the platform doesn't know by name yet; saves to their account. */
export function SetNameInline() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    const first = name.trim()
    if (!first) return
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.auth.updateUser({ data: { first_name: first } })
    setSaving(false)
    if (err) setError(err.message)
    else router.refresh()
  }

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>
      <span style={{ fontSize: '14px', opacity: 0.85 }}>What should we call you?</span>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
        }}
        placeholder="First name"
        style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #2d4a6b', background: '#0f2744', color: '#e2e8f0', fontSize: '14px' }}
      />
      <button
        type="button"
        onClick={save}
        disabled={saving}
        style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #2563eb', background: '#1d4ed8', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      {error ? <span style={{ color: '#f87171', fontSize: '12px' }}>{error}</span> : null}
    </div>
  )
}

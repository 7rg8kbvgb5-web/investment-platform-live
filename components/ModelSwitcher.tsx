'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { firstNameFor } from '../lib/adviser-names'
import { DEFAULT_MODEL_ID, hasSelectedModelCookie, resolveModelId, setSelectedModelId } from '../lib/model-context'
import {
  claimModel,
  createModelFromCopy,
  listPortfolioModels,
  modelLabel,
  type PortfolioModel,
} from '../lib/engines/portfolio-models'

// Sidebar selector for which adviser model the platform works on. Defaults
// to the signed-in adviser's own model; either adviser can view the other's.
// An adviser without a model can create one as a copy of the current model.

const CREATE = '__create__'

export default function ModelSwitcher() {
  const [models, setModels] = useState<PortfolioModel[]>([])
  const [selected, setSelected] = useState<string>(DEFAULT_MODEL_ID)
  const [me, setMe] = useState<{ email: string | null; firstName: string | null }>({ email: null, firstName: null })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [list, userRes] = await Promise.all([listPortfolioModels(), supabase.auth.getUser().catch(() => null)])
      if (cancelled) return
      const user = userRes?.data?.user ?? null
      const email = user?.email ?? null
      const firstName = firstNameFor(email, user?.user_metadata)
      setMe({ email, firstName })

      const own = findOwnModel(list, email, firstName)
      // The original model has no owner until its adviser first signs in.
      if (own && !own.ownerEmail && email) {
        claimModel(own.id, email).catch(() => undefined)
        own.ownerEmail = email
      }
      setModels(list)

      if (!hasSelectedModelCookie()) {
        const initial = own?.id ?? DEFAULT_MODEL_ID
        setSelectedModelId(initial)
        setSelected(initial)
        // Pages rendered on the server used the default model - reload onto theirs.
        if (initial !== DEFAULT_MODEL_ID) window.location.reload()
      } else {
        const current = resolveModelId()
        setSelected(list.some((m) => m.id === current) ? current : DEFAULT_MODEL_ID)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const own = findOwnModel(models, me.email, me.firstName)

  async function onChange(value: string) {
    setError(null)
    if (value === CREATE) {
      const name = me.firstName ?? window.prompt('Your name, as it should appear on your model (e.g. Louie Ognenovski):')?.trim()
      if (!name) return
      const source = models.find((m) => m.id === selected)
      if (
        !window.confirm(
          `Create your own model, starting as a copy of ${source ? modelLabel(source) : 'the current model'}? From then on it's fully yours: your own securities, weights, Investment Committee queue and version history.`,
        )
      )
        return
      setBusy(true)
      try {
        const created = await createModelFromCopy({
          sourceModelId: selected,
          adviserName: fullNameFor(name, me.email),
          ownerEmail: me.email,
        })
        setSelectedModelId(created.id)
        window.location.reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not create the model.')
        setBusy(false)
      }
      return
    }
    setSelectedModelId(value)
    window.location.reload()
  }

  if (models.length === 0) return null
  const viewingOther = (own && selected !== own.id) || (!own && models.length > 0 && !!me.email)

  return (
    <div style={wrap}>
      <label style={label} htmlFor="model-switcher">
        Model portfolio
      </label>
      <select id="model-switcher" value={selected} onChange={(e) => onChange(e.target.value)} disabled={busy} style={select}>
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {modelLabel(m)}
            {own?.id === m.id ? ' (yours)' : ''}
          </option>
        ))}
        {!own ? <option value={CREATE}>+ Create my own model</option> : null}
      </select>
      {busy ? <p style={note}>Creating your model…</p> : null}
      {viewingOther ? (
        <p style={note}>
          {own
            ? 'Viewing another adviser’s model'
            : 'Viewing another adviser’s model – choose “+ Create my own model” to start yours'}
        </p>
      ) : null}
      {error ? <p style={{ ...note, color: '#f87171' }}>{error}</p> : null}
    </div>
  )
}

function findOwnModel(models: PortfolioModel[], email: string | null, firstName: string | null): PortfolioModel | undefined {
  if (email) {
    const byEmail = models.find((m) => m.ownerEmail?.toLowerCase() === email.toLowerCase())
    if (byEmail) return byEmail
  }
  if (firstName) {
    return models.find((m) => !m.ownerEmail && m.adviserName.split(/\s+/)[0].toLowerCase() === firstName.toLowerCase())
  }
  return undefined
}

function fullNameFor(firstName: string, email: string | null): string {
  if (firstName.includes(' ')) return firstName
  if (/ognenovski/i.test(email ?? '')) return `${firstName} Ognenovski`
  if (/allitt/i.test(email ?? '')) return `${firstName} Allitt`
  return firstName
}

const wrap = { padding: '10px 12px 4px', display: 'flex', flexDirection: 'column' as const, gap: '4px' }
const label = { fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#8fb7e8' }
const select = {
  padding: '7px 8px',
  borderRadius: '8px',
  background: '#0b2342',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
  fontSize: '13px',
  fontWeight: 600,
}
const note = { fontSize: '11px', color: '#fbbf24', margin: 0 }

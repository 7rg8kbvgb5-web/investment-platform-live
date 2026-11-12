'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

function LoginForm() {
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(
    params.get('denied')
      ? 'Your password was accepted, but this email is not on the approved list. Check that ALLOWED_EMAILS in Vercel matches your sign-in email exactly.'
      : null,
  )
  const [busy, setBusy] = useState(false)

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (signInError) {
      setError('Email or password not recognised.')
      setBusy(false)
      return
    }
    const next = params.get('next')
    window.location.href = next && next.startsWith('/') ? next : '/'
  }

  return (
    <form onSubmit={signIn} style={card}>
      <p style={eyebrow}>Investment Strategy Hub</p>
      <h1 style={title}>Sign in</h1>
      <label style={label}>
        Email
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={input} required />
      </label>
      <label style={label}>
        Password
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={input}
          required
        />
      </label>
      {error ? <p style={errorText}>{error}</p> : null}
      <button type="submit" style={button} disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      <p style={note}>Access is limited to authorised Ord Minnett advisers.</p>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div style={overlay}>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  )
}

const overlay = {
  position: 'fixed' as const,
  inset: 0,
  zIndex: 100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#04142b',
}
const card = {
  width: '360px',
  padding: '32px',
  borderRadius: '14px',
  background: '#0f2744',
  border: '1px solid #2d4a6b',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '14px',
}
const eyebrow = { margin: 0, fontSize: '12px', fontWeight: 700, color: '#5eead4', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }
const title = { margin: 0, fontSize: '22px', fontWeight: 700, color: '#ffffff' }
const label = { display: 'flex', flexDirection: 'column' as const, gap: '6px', fontSize: '12px', color: '#94a3b8' }
const input = {
  padding: '10px 12px',
  borderRadius: '8px',
  fontSize: '14px',
  background: '#04142b',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
}
const button = {
  padding: '11px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 700,
  background: '#0e7490',
  color: '#ffffff',
  border: '1px solid #0891b2',
  cursor: 'pointer',
}
const errorText = { margin: 0, fontSize: '13px', color: '#fca5a5' }
const note = { margin: 0, fontSize: '12px', color: '#64748b' }

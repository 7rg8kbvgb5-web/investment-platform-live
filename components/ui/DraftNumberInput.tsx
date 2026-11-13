'use client'

import { useEffect, useState } from 'react'
import type React from 'react'
import { holdingMetricInput } from './HoldingMetricGrid'

/**
 * Number input that lets the adviser type freely (clear the field, type a
 * minus sign) and only applies the value on Enter or when leaving the field.
 */
export default function DraftNumberInput({
  value,
  step,
  integer,
  onCommit,
  ariaLabel,
  style,
}: {
  style?: React.CSSProperties
  value: number
  step: number
  integer?: boolean
  onCommit: (value: number) => void
  ariaLabel: string
}) {
  const [draft, setDraft] = useState<string>(String(value))
  const [editing, setEditing] = useState(false)
  useEffect(() => {
    if (!editing) setDraft(String(value))
  }, [value, editing])

  function commit() {
    setEditing(false)
    const parsed = integer ? parseInt(draft, 10) : parseFloat(draft)
    if (Number.isNaN(parsed)) {
      setDraft(String(value))
      return
    }
    if (parsed !== value) onCommit(parsed)
  }

  return (
    <input
      type="number"
      step={step}
      style={style ?? holdingMetricInput}
      value={draft}
      onFocus={() => setEditing(true)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      aria-label={ariaLabel}
      title="Positive to buy, negative to sell. Applies when you press Enter or leave the field."
    />
  )
}


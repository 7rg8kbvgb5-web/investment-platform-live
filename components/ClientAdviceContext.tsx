'use client'

import {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react'
import { type ClientRiskProfile } from './ClientRiskProfileSelector'

interface ClientAdviceContextValue {
  selectedRiskProfile: ClientRiskProfile
  setSelectedRiskProfile: (riskProfile: ClientRiskProfile) => void
}

const ClientAdviceContext = createContext<ClientAdviceContextValue | null>(null)

export function ClientAdviceProvider({ children }: { children: ReactNode }) {
  const [selectedRiskProfile, setSelectedRiskProfile] =
    useState<ClientRiskProfile>('Balanced')

  const value = useMemo(
    () => ({
      selectedRiskProfile,
      setSelectedRiskProfile,
    }),
    [selectedRiskProfile],
  )

  return (
    <ClientAdviceContext.Provider value={value}>
      {children}
    </ClientAdviceContext.Provider>
  )
}

export function useClientAdvice() {
  const context = useContext(ClientAdviceContext)

  if (!context) {
    throw new Error('useClientAdvice must be used inside ClientAdviceProvider')
  }

  return context
}
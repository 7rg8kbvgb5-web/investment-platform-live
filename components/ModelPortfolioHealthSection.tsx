'use client';

import { ClientAdviceProvider, useClientAdvice } from './ClientAdviceContext';
import ClientRiskProfileSelector from './ClientRiskProfileSelector';
import ModelPortfolioHealthPanel from './ModelPortfolioHealthPanel';

// Model Portfolio Health is about the state of the house models themselves
// (Approved List coverage per holding) rather than any one client, so it
// no longer needs to sit inside a client-review workflow - moved here from
// the top of Portfolios. It still needs a selected risk profile to know
// which model to check, hence its own small provider + selector rather
// than reusing the one on the Portfolios page.
function ModelPortfolioHealthSectionBody() {
  const { selectedRiskProfile, setSelectedRiskProfile } = useClientAdvice();

  return (
    <>
      <ClientRiskProfileSelector
        selectedRiskProfile={selectedRiskProfile}
        onChange={setSelectedRiskProfile}
      />
      <ModelPortfolioHealthPanel />
    </>
  );
}

export default function ModelPortfolioHealthSection() {
  return (
    <ClientAdviceProvider>
      <ModelPortfolioHealthSectionBody />
    </ClientAdviceProvider>
  );
}

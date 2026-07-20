'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getModelPortfolioByRiskProfile,
  type ModelAssetClass,
  type ModelHolding,
} from '../lib/engines/model-portfolios';
import { buildSecurityUniverse } from '../lib/engines/security-universe';
import { useClientAdvice } from './ClientAdviceContext';
import Panel from './ui/Panel';
import StatusBox from './dashboard/StatusBox';

function cloneAssetClasses(assetClasses: ModelAssetClass[]): ModelAssetClass[] {
  return assetClasses.map((assetClass) => ({
    ...assetClass,
    holdings: assetClass.holdings.map((holding) => ({ ...holding })),
  }));
}

export function PortfolioConstitutionPanel() {
  const { selectedRiskProfile } = useClientAdvice();
  const modelPortfolio = getModelPortfolioByRiskProfile(selectedRiskProfile);

  // The working proposal always starts as the model portfolio for the
  // selected risk profile - switching profile re-seeds it fresh. From
  // there it's fully editable: securities can be added or removed per
  // asset class without touching the underlying model.
  const [assetClasses, setAssetClasses] = useState<ModelAssetClass[]>(() =>
    cloneAssetClasses(modelPortfolio.assetClasses)
  );

  useEffect(() => {
    setAssetClasses(cloneAssetClasses(modelPortfolio.assetClasses));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRiskProfile]);

  const universe = useMemo(() => Array.from(buildSecurityUniverse().values()), []);

  function removeHolding(assetClassName: string, code: string) {
    setAssetClasses((prev) =>
      prev.map((ac) =>
        ac.name === assetClassName
          ? { ...ac, holdings: ac.holdings.filter((h) => h.code !== code) }
          : ac
      )
    );
  }

  function addHolding(assetClassName: string, code: string) {
    if (!code) return;
    const candidate = universe.find((entry) => entry.code === code);
    if (!candidate) return;

    setAssetClasses((prev) =>
      prev.map((ac) => {
        if (ac.name !== assetClassName) return ac;
        if (ac.holdings.some((h) => h.code === candidate.code)) return ac;
        const newHolding: ModelHolding = {
          code: candidate.code,
          name: candidate.name,
          sector: candidate.sector,
          weight: 0,
          rationale: candidate.inSecurityMaster
            ? 'Added from the Approved List.'
            : 'Added manually.',
        };
        return { ...ac, holdings: [...ac.holdings, newHolding] };
      })
    );
  }

  const [manualEntry, setManualEntry] = useState<Record<string, { code: string; name: string }>>({});

  function updateManualEntry(assetClassName: string, field: 'code' | 'name', value: string) {
    setManualEntry((prev) => ({
      ...prev,
      [assetClassName]: { code: '', name: '', ...prev[assetClassName], [field]: value },
    }));
  }

  function addManualHolding(assetClassName: string) {
    const entry = manualEntry[assetClassName];
    const code = entry?.code.trim().toUpperCase();
    const name = entry?.name.trim();
    if (!code || !name) return;

    setAssetClasses((prev) =>
      prev.map((ac) => {
        if (ac.name !== assetClassName) return ac;
        if (ac.holdings.some((h) => h.code === code)) return ac;
        const newHolding: ModelHolding = {
          code,
          name,
          weight: 0,
          rationale: 'Added manually - not yet on the Approved List.',
        };
        return { ...ac, holdings: [...ac.holdings, newHolding] };
      })
    );
    setManualEntry((prev) => ({ ...prev, [assetClassName]: { code: '', name: '' } }));
  }

  function resetToModel() {
    setAssetClasses(cloneAssetClasses(modelPortfolio.assetClasses));
  }

  return (
    <Panel
      eyebrow={`${selectedRiskProfile} Model Portfolio`}
      title="Portfolio Constitution"
      actions={
        <button type="button" onClick={resetToModel} style={resetButton}>
          Reset to model
        </button>
      }
    >
      <p style={intro}>{modelPortfolio.objective}</p>

      <StatusBox variant="neutral" display="inline">
        Starts as the {selectedRiskProfile} model portfolio — add or remove
        securities per asset class below to build this client&apos;s proposal.
        Changes here aren&apos;t saved yet; switching risk profile resets to
        that profile&apos;s model.
      </StatusBox>

      <div style={assetClassList}>
        {assetClasses.map((assetClass) => {
          const candidates = universe.filter(
            (entry) =>
              entry.assetClass === assetClass.name &&
              !assetClass.holdings.some((h) => h.code === entry.code)
          );

          return (
            <div key={assetClass.name} style={assetClassCard}>
              <div style={assetClassHeader}>
                <h4 style={assetClassTitle}>{assetClass.name}</h4>
                <span style={typeBadge}>{assetClass.type}</span>
              </div>
              <p style={assetClassDescription}>{assetClass.description}</p>

              <ul style={holdingList}>
                {assetClass.holdings.map((holding) => (
                  <li key={holding.code} style={holdingRow}>
                    <div style={holdingHeader}>
                      <span style={holdingCode}>{holding.code}</span>
                      <span style={holdingName}>{holding.name}</span>
                      {holding.sector && <span style={sectorTag}>{holding.sector}</span>}
                      <button
                        type="button"
                        onClick={() => removeHolding(assetClass.name, holding.code)}
                        style={removeButton}
                        aria-label={`Remove ${holding.name}`}
                      >
                        Remove
                      </button>
                    </div>
                    <p style={holdingRationale}>{holding.rationale}</p>
                  </li>
                ))}
                {assetClass.holdings.length === 0 && (
                  <p style={emptyText}>No securities in this asset class yet.</p>
                )}
              </ul>

              {candidates.length > 0 && (
                <select
                  defaultValue=""
                  onChange={(e) => {
                    addHolding(assetClass.name, e.target.value);
                    e.target.value = '';
                  }}
                  style={addSelect}
                >
                  <option value="" disabled>
                    + Add a security to {assetClass.name}
                  </option>
                  {candidates.map((entry) => (
                    <option key={entry.code} value={entry.code}>
                      {entry.code} — {entry.name}
                      {entry.inSecurityMaster ? ' (Approved List)' : ''}
                    </option>
                  ))}
                </select>
              )}

              <div style={manualAddRow}>
                <input
                  type="text"
                  placeholder="Code"
                  value={manualEntry[assetClass.name]?.code ?? ''}
                  onChange={(e) => updateManualEntry(assetClass.name, 'code', e.target.value)}
                  style={manualCodeInput}
                />
                <input
                  type="text"
                  placeholder="Security name"
                  value={manualEntry[assetClass.name]?.name ?? ''}
                  onChange={(e) => updateManualEntry(assetClass.name, 'name', e.target.value)}
                  style={manualNameInput}
                />
                <button
                  type="button"
                  onClick={() => addManualHolding(assetClass.name)}
                  style={manualAddButton}
                >
                  Add
                </button>
              </div>
              {candidates.length === 0 && (
                <p style={emptyText}>
                  No suggested candidates on file for {assetClass.name} yet — add by code and name above.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

const intro = {
  color: 'var(--text-secondary)',
  fontSize: '0.85rem',
  marginTop: '-8px',
  marginBottom: '12px',
  lineHeight: 1.5,
};

const resetButton = {
  padding: '6px 12px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 600,
  background: '#0b2342',
  border: '1px solid #2d4a6b',
  color: '#93c5fd',
  cursor: 'pointer',
};

const assetClassList = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '14px',
  marginTop: '16px',
};

const assetClassCard = {
  padding: '16px',
  background: '#12345b',
  borderRadius: '10px',
  border: '1px solid #2d4a6b',
};

const assetClassHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '10px',
};

const assetClassTitle = {
  margin: 0,
  fontSize: '15px',
  fontWeight: 600,
};

const typeBadge = {
  flexShrink: 0,
  padding: '2px 10px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 600,
  background: '#0b2342',
  border: '1px solid #2d4a6b',
  color: '#93c5fd',
};

const assetClassDescription = {
  margin: '6px 0 12px 0',
  fontSize: '13px',
  color: '#94a3b8',
  lineHeight: 1.5,
};

const holdingList = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '8px',
};

const holdingRow = {
  padding: '10px 12px',
  background: '#0b2342',
  borderRadius: '8px',
  border: '1px solid #1e3a5f',
};

const holdingHeader = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap' as const,
};

const holdingCode = {
  fontSize: '13px',
  fontWeight: 700,
  color: '#e2e8f0',
};

const holdingName = {
  fontSize: '13px',
  color: '#cbd5e1',
};

const sectorTag = {
  fontSize: '11px',
  color: '#94a3b8',
};

const removeButton = {
  marginLeft: 'auto',
  padding: '3px 10px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 600,
  background: '#4a1520',
  border: '1px solid #ef4444',
  color: '#fca5a5',
  cursor: 'pointer',
};

const holdingRationale = {
  margin: '4px 0 0 0',
  fontSize: '12px',
  color: '#94a3b8',
  lineHeight: 1.4,
};

const emptyText = {
  margin: 0,
  fontSize: '12px',
  color: '#94a3b8',
  fontStyle: 'italic' as const,
};

const addSelect = {
  marginTop: '10px',
  width: '100%',
  padding: '8px 10px',
  borderRadius: '8px',
  fontSize: '13px',
  background: '#0b2342',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
};

const manualAddRow = {
  display: 'flex',
  gap: '8px',
  marginTop: '10px',
};

const manualCodeInput = {
  width: '90px',
  padding: '8px 10px',
  borderRadius: '8px',
  fontSize: '13px',
  background: '#0b2342',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
};

const manualNameInput = {
  flex: 1,
  padding: '8px 10px',
  borderRadius: '8px',
  fontSize: '13px',
  background: '#0b2342',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
};

const manualAddButton = {
  padding: '8px 14px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 600,
  background: '#0f3d2e',
  border: '1px solid #10b981',
  color: '#86efac',
  cursor: 'pointer',
};

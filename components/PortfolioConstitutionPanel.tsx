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
import AllocationPieChart from './AllocationPieChart';

// Bespoke, per-client weighting model.
//
// The model portfolio defines the *formal* weights (modelTargetWeight per
// asset class, modelInClassWeight per holding within its asset class).
// Every client is bespoke, so both are separately overridable per client:
// clientTargetWeight (asset class's share of the whole portfolio) and
// clientInClassWeight (a holding's share of its own asset class). A
// holding's overall portfolio weight is always derived, never stored
// directly: clientTargetWeight * clientInClassWeight / 100.
//
// Holdings added fresh (not part of the model) carry modelInClassWeight
// of null so they never fight a "reset to model" for a weight that never
// existed.
type WorkingHolding = ModelHolding & {
  modelInClassWeight: number | null;
  clientInClassWeight: number;
};

type WorkingAssetClass = Omit<ModelAssetClass, 'holdings'> & {
  modelTargetWeight: number;
  clientTargetWeight: number;
  holdings: WorkingHolding[];
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function toWorking(assetClasses: ModelAssetClass[]): WorkingAssetClass[] {
  return assetClasses.map((assetClass) => {
    const modelTargetWeight = assetClass.targetWeight;
    return {
      ...assetClass,
      modelTargetWeight,
      clientTargetWeight: modelTargetWeight,
      holdings: assetClass.holdings.map((holding) => {
        const modelInClassWeight =
          modelTargetWeight > 0 ? round1((holding.weight / modelTargetWeight) * 100) : 0;
        return {
          ...holding,
          modelInClassWeight,
          clientInClassWeight: modelInClassWeight,
        };
      }),
    };
  });
}

function overallWeight(assetClass: WorkingAssetClass, holding: WorkingHolding): number {
  return round1((assetClass.clientTargetWeight * holding.clientInClassWeight) / 100);
}

export function PortfolioConstitutionPanel() {
  const { selectedRiskProfile } = useClientAdvice();
  const modelPortfolio = getModelPortfolioByRiskProfile(selectedRiskProfile);

  // The working proposal always starts as the model portfolio for the
  // selected risk profile - switching profile re-seeds it fresh. From
  // there it's fully editable: securities can be added or removed per
  // asset class, and both asset-class and in-class weights can be
  // adjusted per client, without touching the underlying model.
  const [assetClasses, setAssetClasses] = useState<WorkingAssetClass[]>(() =>
    toWorking(modelPortfolio.assetClasses)
  );

  useEffect(() => {
    setAssetClasses(toWorking(modelPortfolio.assetClasses));
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
        const newHolding: WorkingHolding = {
          code: candidate.code,
          name: candidate.name,
          sector: candidate.sector,
          weight: 0,
          rationale: candidate.inSecurityMaster
            ? 'Added from the Approved List.'
            : 'Added manually.',
          modelInClassWeight: null,
          clientInClassWeight: 0,
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
        const newHolding: WorkingHolding = {
          code,
          name,
          weight: 0,
          rationale: 'Added manually - not yet on the Approved List.',
          modelInClassWeight: null,
          clientInClassWeight: 0,
        };
        return { ...ac, holdings: [...ac.holdings, newHolding] };
      })
    );
    setManualEntry((prev) => ({ ...prev, [assetClassName]: { code: '', name: '' } }));
  }

  function setAssetClassWeight(assetClassName: string, value: number) {
    setAssetClasses((prev) =>
      prev.map((ac) =>
        ac.name === assetClassName
          ? { ...ac, clientTargetWeight: Number.isFinite(value) ? value : ac.clientTargetWeight }
          : ac
      )
    );
  }

  function resetAssetClassWeight(assetClassName: string) {
    setAssetClasses((prev) =>
      prev.map((ac) =>
        ac.name === assetClassName ? { ...ac, clientTargetWeight: ac.modelTargetWeight } : ac
      )
    );
  }

  function setHoldingWeight(assetClassName: string, code: string, value: number) {
    setAssetClasses((prev) =>
      prev.map((ac) => {
        if (ac.name !== assetClassName) return ac;
        return {
          ...ac,
          holdings: ac.holdings.map((h) =>
            h.code === code
              ? { ...h, clientInClassWeight: Number.isFinite(value) ? value : h.clientInClassWeight }
              : h
          ),
        };
      })
    );
  }

  function resetHoldingWeight(assetClassName: string, code: string) {
    setAssetClasses((prev) =>
      prev.map((ac) => {
        if (ac.name !== assetClassName) return ac;
        return {
          ...ac,
          holdings: ac.holdings.map((h) =>
            h.code === code && h.modelInClassWeight !== null
              ? { ...h, clientInClassWeight: h.modelInClassWeight }
              : h
          ),
        };
      })
    );
  }

  function resetToModel() {
    setAssetClasses(toWorking(modelPortfolio.assetClasses));
  }

  const portfolioTotal = round1(
    assetClasses.reduce((total, ac) => total + ac.clientTargetWeight, 0)
  );
  const portfolioOk = Math.abs(portfolioTotal - 100) < 0.15;

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
        securities and adjust weightings per asset class and per holding to
        build this client&apos;s bespoke proposal. Changes here aren&apos;t
        saved yet; switching risk profile resets to that profile&apos;s
        model.
      </StatusBox>

      <div style={portfolioTotalRow}>
        <span style={portfolioTotalLabel}>Portfolio total (asset classes)</span>
        <span style={{ ...portfolioTotalValue, color: portfolioOk ? '#86efac' : '#fca5a5' }}>
          {portfolioTotal}%
        </span>
      </div>

      <AllocationPieChart
        allocations={assetClasses.map((ac) => ({
          asset_class: ac.name,
          target_weight: ac.clientTargetWeight,
        }))}
      />

      <div style={assetClassList}>
        {assetClasses.map((assetClass) => {
          const candidates = universe.filter(
            (entry) =>
              entry.assetClass === assetClass.name &&
              !assetClass.holdings.some((h) => h.code === entry.code)
          );

          const inClassTotal = round1(
            assetClass.holdings.reduce((total, h) => total + h.clientInClassWeight, 0)
          );
          const inClassOk = assetClass.holdings.length === 0 || Math.abs(inClassTotal - 100) < 0.15;
          const classWeightChanged =
            Math.abs(assetClass.clientTargetWeight - assetClass.modelTargetWeight) > 0.001;

          return (
            <div key={assetClass.name} style={assetClassCard}>
              <div style={assetClassHeader}>
                <h4 style={assetClassTitle}>{assetClass.name}</h4>
                <span style={typeBadge}>{assetClass.type}</span>
                <div style={assetClassWeightControl}>
                  <input
                    type="number"
                    step="0.1"
                    value={assetClass.clientTargetWeight}
                    onChange={(e) =>
                      setAssetClassWeight(assetClass.name, parseFloat(e.target.value))
                    }
                    style={assetClassWeightInput}
                    aria-label={`${assetClass.name} weight of overall portfolio`}
                  />
                  <span style={weightPercentSign}>% of portfolio</span>
                  {classWeightChanged && (
                    <>
                      <span style={modelWeightHint}>model {assetClass.modelTargetWeight}%</span>
                      <button
                        type="button"
                        onClick={() => resetAssetClassWeight(assetClass.name)}
                        style={miniResetButton}
                      >
                        Reset
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p style={assetClassDescription}>{assetClass.description}</p>

              <ul style={holdingList}>
                {assetClass.holdings.map((holding) => {
                  const changed =
                    holding.modelInClassWeight !== null &&
                    Math.abs(holding.clientInClassWeight - holding.modelInClassWeight) > 0.001;
                  return (
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
                      <div style={holdingWeightRow}>
                        <input
                          type="number"
                          step="0.1"
                          value={holding.clientInClassWeight}
                          onChange={(e) =>
                            setHoldingWeight(
                              assetClass.name,
                              holding.code,
                              parseFloat(e.target.value)
                            )
                          }
                          style={holdingWeightInput}
                          aria-label={`${holding.name} weight within ${assetClass.name}`}
                        />
                        <span style={weightPercentSign}>% of class</span>
                        <span style={overallWeightLabel}>
                          = {overallWeight(assetClass, holding)}% of portfolio
                        </span>
                        {changed && (
                          <>
                            <span style={modelWeightHint}>
                              model {holding.modelInClassWeight}%
                            </span>
                            <button
                              type="button"
                              onClick={() => resetHoldingWeight(assetClass.name, holding.code)}
                              style={miniResetButton}
                            >
                              Reset
                            </button>
                          </>
                        )}
                        {holding.modelInClassWeight === null && (
                          <span style={notInModelTag}>not in model</span>
                        )}
                      </div>
                    </li>
                  );
                })}
                {assetClass.holdings.length === 0 && (
                  <p style={emptyText}>No securities in this asset class yet.</p>
                )}
              </ul>

              {assetClass.holdings.length > 0 && (
                <div style={inClassTotalRow}>
                  <span style={inClassTotalLabel}>Class total</span>
                  <span
                    style={{
                      ...inClassTotalValue,
                      color: inClassOk ? '#86efac' : '#fca5a5',
                    }}
                  >
                    {inClassTotal}%
                  </span>
                </div>
              )}

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

const portfolioTotalRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 12px',
  marginTop: '10px',
  background: '#0b2342',
  borderRadius: '8px',
  border: '1px solid #2d4a6b',
};

const portfolioTotalLabel = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#94a3b8',
};

const portfolioTotalValue = {
  fontSize: '13px',
  fontWeight: 700,
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
  justifyContent: 'flex-start',
  alignItems: 'center',
  gap: '10px',
  flexWrap: 'wrap' as const,
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

const assetClassWeightControl = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  marginLeft: 'auto',
};

const assetClassWeightInput = {
  width: '64px',
  padding: '5px 8px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 700,
  background: '#0b2342',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
};

const weightPercentSign = {
  fontSize: '11px',
  color: '#94a3b8',
};

const modelWeightHint = {
  fontSize: '11px',
  color: '#64748b',
  fontStyle: 'italic' as const,
};

const miniResetButton = {
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: '10px',
  fontWeight: 600,
  background: '#0b2342',
  border: '1px solid #2d4a6b',
  color: '#93c5fd',
  cursor: 'pointer',
};

const notInModelTag = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#fbbf24',
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

const holdingWeightRow = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  flexWrap: 'wrap' as const,
  marginTop: '8px',
};

const holdingWeightInput = {
  width: '60px',
  padding: '5px 8px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 700,
  background: '#12345b',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
};

const overallWeightLabel = {
  fontSize: '11px',
  color: '#93c5fd',
  fontWeight: 600,
};

const inClassTotalRow = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
  marginTop: '10px',
  paddingTop: '8px',
  borderTop: '1px dashed #2d4a6b',
};

const inClassTotalLabel = {
  fontSize: '11px',
  color: '#94a3b8',
};

const inClassTotalValue = {
  fontSize: '12px',
  fontWeight: 700,
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

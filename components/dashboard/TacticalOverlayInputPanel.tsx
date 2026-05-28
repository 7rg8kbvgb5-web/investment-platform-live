'use client';

import { useState } from 'react';
import StatusBox from './StatusBox';

const EMPTY_FORM = {
  assetClass: '',
  proposedAdjustment: '',
  reason: '',
  reviewDate: '',
  expiryDate: '',
};

type TacticalOverlayInputPanelProps = {
  riskProfileName: string;
};

export default function TacticalOverlayInputPanel({
  riskProfileName,
}: TacticalOverlayInputPanelProps) {
  const [form, setForm] = useState(EMPTY_FORM);

  const hasDraftValues = Object.values(form).some((value) => value.trim() !== '');

  return (
    <div style={panel}>
      <h3 style={title}>Proposed Tactical Overlay — {riskProfileName}</h3>
      <StatusBox variant="neutral">
        Simulation only — values are UI-only and are not saved to the database
      </StatusBox>

      <div style={formGrid}>
        <label style={field}>
          <span style={label}>Asset class</span>
          <input
            type="text"
            value={form.assetClass}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                assetClass: event.target.value,
              }))
            }
            placeholder="e.g. Australian Equities"
            style={input}
          />
        </label>

        <label style={field}>
          <span style={label}>Proposed adjustment (%)</span>
          <input
            type="text"
            inputMode="decimal"
            value={form.proposedAdjustment}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                proposedAdjustment: event.target.value,
              }))
            }
            placeholder="e.g. +2"
            style={input}
          />
        </label>

        <label style={field}>
          <span style={label}>Reason</span>
          <input
            type="text"
            value={form.reason}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                reason: event.target.value,
              }))
            }
            placeholder="Rationale for the overlay"
            style={input}
          />
        </label>

        <label style={field}>
          <span style={label}>Review date</span>
          <input
            type="date"
            value={form.reviewDate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                reviewDate: event.target.value,
              }))
            }
            style={input}
          />
        </label>

        <label style={field}>
          <span style={label}>Expiry date</span>
          <input
            type="date"
            value={form.expiryDate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                expiryDate: event.target.value,
              }))
            }
            style={input}
          />
        </label>
      </div>

      {hasDraftValues ? (
        <StatusBox variant="warning">
          Draft overlay captured locally for preview only — no database write
          will occur
        </StatusBox>
      ) : (
        <StatusBox variant="success">
          Enter proposed overlay details above to preview locally
        </StatusBox>
      )}
    </div>
  );
}

const panel = {
  marginTop: '25px',
};

const title = {
  margin: '0 0 16px 0',
  fontSize: '18px',
  fontWeight: 600,
};

const formGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '16px',
  marginBottom: '8px',
};

const field = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '8px',
};

const label = {
  fontSize: '14px',
  color: '#94a3b8',
};

const input = {
  padding: '10px 12px',
  background: '#12345b',
  border: '1px solid #2d4a6b',
  borderRadius: '8px',
  color: 'white',
  fontSize: '14px',
};

'use client';

import { Fragment, useMemo, useState } from 'react';
import type {
  ResearchInboxAction,
  ResearchInboxActionRecord,
  ResearchInboxItem,
  ResearchInboxPriority,
  ResearchInboxStatus,
} from '../domain/types/research-inbox';
import {
  RESEARCH_INBOX_ACTIONS,
  applyResearchInboxAction,
  formatResearchInboxAction,
  getLatestResearchInboxAction,
  isTerminalResearchInboxStatus,
} from '../lib/engines/research-inbox-actions';
import {
  analyzeResearchInbox,
  formatResearchInboxItemOrigin,
  formatResearchInboxItemType,
  formatResearchInboxPriority,
  formatResearchInboxSourceType,
  formatResearchInboxStatus,
  getCombinedResearchInboxItems,
} from '../lib/engines/research-inbox';
import { formatIsoTimestampDisplay } from '../lib/format-timestamp';
import StatusBox from './dashboard/StatusBox';

function statusVariantForInbox(
  status: ResearchInboxStatus
): 'success' | 'warning' | 'neutral' {
  switch (status) {
    case 'Resolved':
      return 'success';
    case 'New':
    case 'In Review':
    case 'Deferred':
      return 'warning';
    case 'Rejected':
      return 'neutral';
  }
}

function priorityVariantForInbox(
  priority: ResearchInboxPriority
): 'success' | 'warning' | 'neutral' {
  switch (priority) {
    case 'Critical':
    case 'High':
      return 'warning';
    case 'Medium':
      return 'neutral';
    case 'Low':
      return 'success';
  }
}

export default function ResearchInboxPanel() {
  const [items, setItems] = useState<ResearchInboxItem[]>(() =>
    getCombinedResearchInboxItems()
  );
  const [actionHistory, setActionHistory] = useState<
    Record<string, ResearchInboxActionRecord[]>
  >({});
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] =
    useState<ResearchInboxAction | null>(null);
  const [rationale, setRationale] = useState('');

  const inbox = useMemo(() => analyzeResearchInbox({ items }), [items]);

  const totalActionCount = useMemo(
    () =>
      Object.values(actionHistory).reduce(
        (count, records) => count + records.length,
        0
      ),
    [actionHistory]
  );

  function resetActionForm() {
    setSelectedAction(null);
    setRationale('');
  }

  function toggleExpandedItem(itemId: string) {
    setExpandedItemId((current) => (current === itemId ? null : itemId));
    resetActionForm();
  }

  function handleApplyAction(item: ResearchInboxItem) {
    if (!selectedAction || isTerminalResearchInboxStatus(item.status)) {
      return;
    }

    const existingRecords = actionHistory[item.id] ?? [];
    const { item: updatedItem, record } = applyResearchInboxAction(
      item,
      {
        action: selectedAction,
        rationale: rationale.trim() ? rationale.trim() : null,
      },
      totalActionCount
    );

    setItems((current) =>
      current.map((entry) => (entry.id === updatedItem.id ? updatedItem : entry))
    );
    setActionHistory((current) => ({
      ...current,
      [item.id]: [...existingRecords, record],
    }));
    resetActionForm();
  }

  return (
    <div style={panel}>
      <h3 style={title}>Research Inbox</h3>

      <StatusBox variant="neutral">
        Mock research inbox — local preview only. Combines manual inbox items
        with alert-engine, fund monitoring, and research-request generated
        items. Adviser actions update local state only; no persistence or live
        external data feeds.
      </StatusBox>

      <div style={summaryGrid}>
        <div style={summaryItem}>
          <span style={summaryLabel}>Total items</span>
          <span style={summaryValue}>{inbox.summary.totalItems}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>System generated</span>
          <span style={{ ...summaryValue, color: '#93c5fd' }}>
            {inbox.summary.systemGeneratedItems}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Research requests</span>
          <span style={{ ...summaryValue, color: '#c4b5fd' }}>
            {inbox.summary.researchRequestItems}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Manual</span>
          <span style={summaryValue}>{inbox.summary.manualItems}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>New</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {inbox.summary.newItems}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>In review</span>
          <span style={{ ...summaryValue, color: '#93c5fd' }}>
            {inbox.summary.inReviewItems}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Deferred</span>
          <span style={summaryValue}>{inbox.summary.deferredItems}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Resolved</span>
          <span style={{ ...summaryValue, color: '#86efac' }}>
            {inbox.summary.resolvedItems}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Critical / high</span>
          <span style={{ ...summaryValue, color: '#f87171' }}>
            {inbox.summary.criticalPriority + inbox.summary.highPriority}
          </span>
        </div>
      </div>

      <h4 style={sectionTitle}>Inbox items</h4>

      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Received</th>
              <th style={th}>Title</th>
              <th style={th}>Origin</th>
              <th style={th}>Type</th>
              <th style={th}>Source</th>
              <th style={th}>Priority</th>
              <th style={th}>Status</th>
              <th style={th}>Assigned</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {inbox.sortedItems.map((item) => {
              const itemActions = actionHistory[item.id] ?? [];
              const latestAction = getLatestResearchInboxAction(itemActions);
              const isExpanded = expandedItemId === item.id;
              const actionsDisabled = isTerminalResearchInboxStatus(item.status);

              return (
                <Fragment key={item.id}>
                  <tr>
                    <td style={td}>
                      {formatIsoTimestampDisplay(item.receivedAt)}
                    </td>
                    <td style={td}>
                      <div style={titleCell}>
                        <div style={titleRow}>
                          <span style={itemTitle}>{item.title}</span>
                          {item.origin === 'system' ? (
                            <span
                              style={originBadge(
                                item.origin,
                                item.sourceAlertOrigin,
                                item.sourceResearchRequestId
                              )}
                            >
                              {formatResearchInboxItemOrigin(
                                item.origin,
                                item.sourceAlertOrigin,
                                item.sourceResearchRequestId
                              )}
                            </span>
                          ) : null}
                        </div>
                        <span style={itemSummary}>{item.summary}</span>
                        {latestAction ? (
                          <div style={latestActionBox}>
                            <span style={latestActionLabel}>
                              Latest action:{' '}
                              {formatResearchInboxAction(latestAction.action)}{' '}
                              · {formatIsoTimestampDisplay(latestAction.actedAt)}
                            </span>
                            {latestAction.rationale ? (
                              <span style={latestActionRationale}>
                                {latestAction.rationale}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td style={td}>
                      <span
                        style={originBadge(
                          item.origin,
                          item.sourceAlertOrigin,
                          item.sourceResearchRequestId
                        )}
                      >
                        {formatResearchInboxItemOrigin(
                          item.origin,
                          item.sourceAlertOrigin,
                          item.sourceResearchRequestId
                        )}
                      </span>
                    </td>
                    <td style={td}>
                      {formatResearchInboxItemType(item.itemType)}
                    </td>
                    <td style={td}>
                      {formatResearchInboxSourceType(item.sourceType)}
                    </td>
                    <td style={td}>
                      <span
                        style={badge(priorityVariantForInbox(item.priority))}
                      >
                        {formatResearchInboxPriority(item.priority)}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={badge(statusVariantForInbox(item.status))}>
                        {formatResearchInboxStatus(item.status)}
                      </span>
                    </td>
                    <td style={td}>{item.assignedTo ?? '—'}</td>
                    <td style={td}>
                      <button
                        type="button"
                        style={toggleButton}
                        onClick={() => toggleExpandedItem(item.id)}
                      >
                        {isExpanded ? 'Hide' : 'Manage'}
                      </button>
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr>
                      <td colSpan={9} style={actionCell}>
                        {actionsDisabled ? (
                          <StatusBox variant="success">
                            Item is {formatResearchInboxStatus(item.status)} —
                            no further actions available in this local preview.
                          </StatusBox>
                        ) : (
                          <>
                            <div style={actionIntro}>
                              Record an adviser action for this inbox item.
                              Rationale is optional but recommended for audit
                              trail completeness.
                            </div>
                            <div style={actionButtonsRow}>
                              {RESEARCH_INBOX_ACTIONS.map((action) => (
                                <button
                                  key={action}
                                  type="button"
                                  style={
                                    selectedAction === action
                                      ? actionButtonSelected
                                      : actionButton
                                  }
                                  onClick={() => setSelectedAction(action)}
                                >
                                  {formatResearchInboxAction(action)}
                                </button>
                              ))}
                            </div>
                            <label style={fieldLabel}>
                              Adviser rationale (optional)
                              <textarea
                                style={textarea}
                                placeholder="Document rationale for deferral, resolution, rejection, or research request..."
                                value={rationale}
                                onChange={(event) =>
                                  setRationale(event.target.value)
                                }
                                rows={2}
                              />
                            </label>
                            <div style={actionFooter}>
                              <button
                                type="button"
                                style={applyButton}
                                onClick={() => handleApplyAction(item)}
                                disabled={!selectedAction}
                              >
                                Apply action
                              </button>
                            </div>
                          </>
                        )}
                        {itemActions.length > 0 ? (
                          <div style={historyBlock}>
                            <span style={historyTitle}>Action history</span>
                            {itemActions.map((record) => (
                              <div key={record.id} style={historyEntry}>
                                <span style={historyMeta}>
                                  {formatIsoTimestampDisplay(record.actedAt)} ·{' '}
                                  {formatResearchInboxAction(record.action)} ·{' '}
                                  {formatResearchInboxStatus(record.statusAfter)}
                                </span>
                                {record.rationale ? (
                                  <span style={historyRationale}>
                                    {record.rationale}
                                  </span>
                                ) : (
                                  <span style={historyRationaleMuted}>
                                    No rationale recorded
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
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

const summaryGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: '12px',
  marginBottom: '20px',
};

const summaryItem = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
  padding: '12px',
  background: '#12345b',
  borderRadius: '8px',
  border: '1px solid #2d4a6b',
};

const summaryLabel = {
  fontSize: '12px',
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const summaryValue = {
  fontSize: '18px',
  fontWeight: 600,
};

const sectionTitle = {
  margin: '0 0 12px 0',
  fontSize: '15px',
  fontWeight: 600,
  color: '#94a3b8',
};

const tableWrap = {
  overflowX: 'auto' as const,
};

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: '14px',
};

const th = {
  textAlign: 'left' as const,
  padding: '10px 12px',
  borderBottom: '1px solid #2d4a6b',
  color: '#94a3b8',
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  fontWeight: 600,
};

const td = {
  padding: '12px',
  borderBottom: '1px solid #1e3a5f',
  verticalAlign: 'top' as const,
};

const titleCell = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '6px',
};

const titleRow = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  alignItems: 'center',
  gap: '8px',
};

const itemTitle = {
  fontWeight: 600,
};

const itemSummary = {
  fontSize: '12px',
  color: '#94a3b8',
  lineHeight: 1.4,
};

const latestActionBox = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
  marginTop: '4px',
  padding: '8px 10px',
  background: '#0f2744',
  borderRadius: '6px',
  border: '1px solid #2d4a6b',
};

const latestActionLabel = {
  fontSize: '12px',
  color: '#93c5fd',
  fontWeight: 600,
};

const latestActionRationale = {
  fontSize: '12px',
  color: '#cbd5e1',
  lineHeight: 1.4,
};

const toggleButton = {
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: '12px',
  border: '1px solid #2d4a6b',
  background: '#12345b',
  color: '#93c5fd',
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
};

const actionCell = {
  padding: '16px 12px',
  background: '#0f2744',
  borderBottom: '1px solid #1e3a5f',
};

const actionIntro = {
  fontSize: '13px',
  color: '#94a3b8',
  marginBottom: '12px',
};

const actionButtonsRow = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '8px',
  marginBottom: '12px',
};

const actionButton = {
  padding: '8px 12px',
  borderRadius: '6px',
  fontSize: '12px',
  border: '1px solid #334155',
  background: '#12345b',
  color: '#e2e8f0',
  cursor: 'pointer',
};

const actionButtonSelected = {
  padding: '8px 12px',
  borderRadius: '6px',
  fontSize: '12px',
  border: '1px solid #93c5fd',
  background: '#1e3a5f',
  color: '#93c5fd',
  cursor: 'pointer',
  fontWeight: 600,
};

const fieldLabel = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '6px',
  fontSize: '12px',
  color: '#94a3b8',
  marginBottom: '12px',
};

const textarea = {
  padding: '10px 12px',
  background: '#0f2744',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '13px',
  resize: 'vertical' as const,
  fontFamily: 'inherit',
};

const actionFooter = {
  display: 'flex',
  gap: '10px',
};

const applyButton = {
  padding: '8px 14px',
  borderRadius: '6px',
  fontSize: '13px',
  border: '1px solid #2d4a6b',
  background: '#12345b',
  color: '#93c5fd',
  cursor: 'pointer',
};

const historyBlock = {
  marginTop: '16px',
  paddingTop: '12px',
  borderTop: '1px solid #334155',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '8px',
};

const historyTitle = {
  fontSize: '12px',
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  fontWeight: 600,
};

const historyEntry = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
  padding: '8px 10px',
  background: '#12345b',
  borderRadius: '6px',
  border: '1px solid #2d4a6b',
};

const historyMeta = {
  fontSize: '12px',
  color: '#93c5fd',
};

const historyRationale = {
  fontSize: '12px',
  color: '#cbd5e1',
  lineHeight: 1.4,
};

const historyRationaleMuted = {
  fontSize: '12px',
  color: '#64748b',
  fontStyle: 'italic' as const,
};

function originBadge(
  origin: 'manual' | 'system',
  sourceAlertOrigin?: import('../domain/types/alert').AlertOrigin | null,
  sourceResearchRequestId?: string | null
) {
  if (origin === 'manual') {
    return {
      display: 'inline-block',
      padding: '3px 8px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.04em',
      background: '#12345b',
      border: '1px solid #334155',
      color: '#94a3b8',
    };
  }

  if (sourceResearchRequestId) {
    return {
      display: 'inline-block',
      padding: '3px 8px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.04em',
      background: '#312e81',
      border: '1px solid #a5b4fc',
      color: '#a5b4fc',
    };
  }

  if (sourceAlertOrigin === 'fund_monitoring') {
    return {
      display: 'inline-block',
      padding: '3px 8px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.04em',
      background: '#3b1d5c',
      border: '1px solid #c4b5fd',
      color: '#c4b5fd',
    };
  }

  if (sourceAlertOrigin === 'rule_generated') {
    return {
      display: 'inline-block',
      padding: '3px 8px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.04em',
      background: '#12345b',
      border: '1px solid #93c5fd',
      color: '#93c5fd',
    };
  }

  return {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    background: '#1e3a5f',
    border: '1px solid #93c5fd',
    color: '#93c5fd',
  };
}

function badge(variant: 'success' | 'warning' | 'neutral') {
  const colors = {
    success: { background: '#0f3d2e', border: '#10b981', color: '#86efac' },
    warning: { background: '#5b2b12', border: '#d97706', color: '#fbbf24' },
    neutral: { background: '#12345b', border: '#2d4a6b', color: '#93c5fd' },
  };

  const palette = colors[variant];

  return {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
    background: palette.background,
    border: `1px solid ${palette.border}`,
    color: palette.color,
  };
}

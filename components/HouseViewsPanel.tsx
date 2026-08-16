'use client';

import { useEffect, useState } from 'react';
import type { ResearchDocument, ResearchDocumentSource } from '../domain/types/research-document';
import { getResearchDocumentDownloadUrl, listResearchDocuments } from '../lib/engines/research-library';
import { formatIsoTimestampDisplay } from '../lib/format-timestamp';
import Panel from './ui/Panel';
import StatusBox from './dashboard/StatusBox';

// A dedicated, prominent view of the two house views specifically -
// pulled from the same research library the upload form below writes
// to, just filtered and grouped so Ord Minnett's and Barrenjoey's own
// views are immediately visible rather than mixed into the general
// document list.

const HOUSE_SOURCES: ResearchDocumentSource[] = ['Ord Minnett', 'Barrenjoey'];

export function HouseViewsPanel() {
  const [documents, setDocuments] = useState<ResearchDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listResearchDocuments()
      .then((docs) => {
        if (!cancelled) setDocuments(docs);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load house views.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDownload(document: ResearchDocument) {
    try {
      const url = await getResearchDocumentDownloadUrl(document.storagePath);
      window.open(url, '_blank');
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Failed to generate download link.');
    }
  }

  return (
    <Panel eyebrow="Uploaded via the Research Library below" title="House Views">
      <p style={intro}>
        Ord Minnett&apos;s and Barrenjoey&apos;s own house views, as uploaded — separated out here so
        they&apos;re immediately visible rather than mixed into the general document list.
      </p>

      {loading ? (
        <StatusBox variant="neutral" display="inline">
          Loading house views…
        </StatusBox>
      ) : loadError ? (
        <StatusBox variant="error" display="inline">
          {loadError}
        </StatusBox>
      ) : (
        <>
          {downloadError && (
            <StatusBox variant="error" display="inline">
              {downloadError}
            </StatusBox>
          )}
          <div style={columnsGrid}>
            {HOUSE_SOURCES.map((source) => {
              const sourceDocs = documents.filter((d) => d.source === source);
              return (
                <div key={source} style={sourceColumn}>
                  <h4 style={sourceTitle}>{source}</h4>
                  {sourceDocs.length === 0 ? (
                    <p style={emptyText}>
                      No {source} house view uploaded yet — use the Research Library below.
                    </p>
                  ) : (
                    <ul style={docList}>
                      {sourceDocs.map((doc) => (
                        <li key={doc.id} style={docRow}>
                          <div style={docHeader}>
                            <span style={docTitleText}>{doc.title}</span>
                            <span style={docTypeBadge}>{doc.documentType}</span>
                          </div>
                          {doc.summary && <p style={docSummary}>{doc.summary}</p>}
                          <div style={docMetaRow}>
                            {doc.tickers.length > 0 && (
                              <span style={docTag}>{doc.tickers.join(', ')}</span>
                            )}
                            {doc.sectors.length > 0 && (
                              <span style={docTagMuted}>{doc.sectors.join(', ')}</span>
                            )}
                            <span style={docDate}>{formatIsoTimestampDisplay(doc.createdAt)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDownload(doc)}
                            style={downloadButton}
                          >
                            Download
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </Panel>
  );
}

const intro = {
  color: 'var(--text-secondary)',
  fontSize: '0.85rem',
  marginTop: '-8px',
  marginBottom: '14px',
  lineHeight: 1.5,
};

const columnsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '20px',
};

const sourceColumn = {
  display: 'flex',
  flexDirection: 'column' as const,
};

const sourceTitle = {
  margin: '0 0 10px',
  fontSize: '14px',
  fontWeight: 700,
  color: '#93c5fd',
};

const docList = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '10px',
};

const docRow = {
  padding: '10px 12px',
  background: '#0b2342',
  borderRadius: '8px',
  border: '1px solid #1e3a5f',
};

const docHeader = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap' as const,
};

const docTitleText = {
  fontSize: '13px',
  fontWeight: 700,
  color: '#e2e8f0',
};

const docTypeBadge = {
  marginLeft: 'auto',
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: '10px',
  fontWeight: 600,
  background: '#12345b',
  color: '#93c5fd',
};

const docSummary = {
  margin: '6px 0 0',
  fontSize: '12px',
  color: '#94a3b8',
  lineHeight: 1.4,
};

const docMetaRow = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '6px',
  marginTop: '8px',
  alignItems: 'center',
};

const docTag = {
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: '10px',
  fontWeight: 700,
  background: '#0f3d2e',
  color: '#86efac',
};

const docTagMuted = {
  fontSize: '11px',
  color: '#94a3b8',
};

const docDate = {
  fontSize: '11px',
  color: '#64748b',
  marginLeft: 'auto',
};

const downloadButton = {
  marginTop: '8px',
  padding: '4px 10px',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: 600,
  background: 'transparent',
  border: '1px solid #2d4a6b',
  color: '#93c5fd',
  cursor: 'pointer',
};

const emptyText = {
  margin: 0,
  fontSize: '12px',
  color: '#94a3b8',
  fontStyle: 'italic' as const,
};

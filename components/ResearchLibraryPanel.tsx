'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type {
  ResearchDocument,
  ResearchDocumentSource,
  ResearchDocumentType,
} from '../domain/types/research-document';
import {
  getResearchDocumentDownloadUrl,
  listResearchDocuments,
  normaliseTags,
  uploadResearchDocument,
} from '../lib/engines/research-library';
import { formatIsoTimestampDisplay } from '../lib/format-timestamp';
import StatusBox from './dashboard/StatusBox';

const SOURCES: ResearchDocumentSource[] = ['Ord Minnett', 'Barrenjoey', 'Other'];
const DOCUMENT_TYPES: ResearchDocumentType[] = [
  'Research Note',
  'Sector Report',
  'Company Update',
  'Model Portfolio Note',
  'Other',
];

export default function ResearchLibraryPanel() {
  const [documents, setDocuments] = useState<ResearchDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [title, setTitle] = useState('');
  const [source, setSource] = useState<ResearchDocumentSource>('Ord Minnett');
  const [documentType, setDocumentType] =
    useState<ResearchDocumentType>('Research Note');
  const [tickersInput, setTickersInput] = useState('');
  const [sectorsInput, setSectorsInput] = useState('');
  const [summary, setSummary] = useState('');
  const [file, setFile] = useState<File | null>(null);

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      const results = await listResearchDocuments();
      setDocuments(results);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'Failed to load research library.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!file || !title.trim()) {
      setSubmitError('A title and a file are both required.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await uploadResearchDocument({
        title: title.trim(),
        source,
        documentType,
        tickers: normaliseTags(tickersInput, 'ticker'),
        sectors: normaliseTags(sectorsInput, 'sector'),
        summary: summary.trim() || undefined,
        file,
      });

      setTitle('');
      setTickersInput('');
      setSectorsInput('');
      setSummary('');
      setFile(null);
      setSubmitSuccess(true);
      await refresh();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Upload failed.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownload(document: ResearchDocument) {
    try {
      const url = await getResearchDocumentDownloadUrl(document.storagePath);
      window.open(url, '_blank');
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'Failed to generate download link.'
      );
    }
  }

  return (
    <section style={panel}>
      <p style={eyebrow}>Research Library</p>
      <h2 style={heading}>Ord Minnett &amp; Barrenjoey Research</h2>
      <p style={description}>
        Upload research documents and tag them by ticker and sector. Tagged
        documents are cross-referenced automatically by the weekly research
        brief engine.
      </p>

      <form onSubmit={handleSubmit} style={form}>
        <div style={formRow}>
          <label style={label}>
            Title
            <input
              style={input}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Global Quality Fund — Q2 Update"
            />
          </label>

          <label style={label}>
            Source
            <select
              style={input}
              value={source}
              onChange={(event) =>
                setSource(event.target.value as ResearchDocumentSource)
              }
            >
              {SOURCES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label style={label}>
            Document Type
            <select
              style={input}
              value={documentType}
              onChange={(event) =>
                setDocumentType(event.target.value as ResearchDocumentType)
              }
            >
              {DOCUMENT_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={formRow}>
          <label style={label}>
            Tickers (comma separated)
            <input
              style={input}
              value={tickersInput}
              onChange={(event) => setTickersInput(event.target.value)}
              placeholder="e.g. CBA, BHP, WES"
            />
          </label>

          <label style={label}>
            Sectors (comma separated)
            <input
              style={input}
              value={sectorsInput}
              onChange={(event) => setSectorsInput(event.target.value)}
              placeholder="e.g. Financials, Resources"
            />
          </label>
        </div>

        <label style={label}>
          Summary (optional)
          <textarea
            style={{ ...input, height: '64px', resize: 'vertical' as const }}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="One or two lines on what this document covers."
          />
        </label>

        <label style={label}>
          File
          <input
            style={fileInput}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        {submitError ? (
          <StatusBox variant="error">{submitError}</StatusBox>
        ) : null}

        {submitSuccess ? (
          <StatusBox variant="success">Document uploaded to the research library.</StatusBox>
        ) : null}

        <button type="submit" disabled={submitting} style={submitButton}>
          {submitting ? 'Uploading…' : 'Upload Document'}
        </button>
      </form>

      <div style={{ marginTop: '28px' }}>
        <p style={subheading}>
          Library ({documents.length} document{documents.length === 1 ? '' : 's'})
        </p>

        {loading ? (
          <p style={footnote}>Loading research library…</p>
        ) : loadError ? (
          <StatusBox variant="error">{loadError}</StatusBox>
        ) : documents.length === 0 ? (
          <p style={footnote}>
            No documents uploaded yet. This is expected until the Supabase
            migration and storage bucket have been set up — see the setup
            notes for this feature.
          </p>
        ) : (
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Title</th>
                  <th style={th}>Source</th>
                  <th style={th}>Type</th>
                  <th style={th}>Tickers</th>
                  <th style={th}>Sectors</th>
                  <th style={th}>Uploaded</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td style={td}>
                      <span style={titleCell}>{document.title}</span>
                      {document.summary ? (
                        <span style={summaryCell}>{document.summary}</span>
                      ) : null}
                    </td>
                    <td style={td}>{document.source}</td>
                    <td style={td}>{document.documentType}</td>
                    <td style={td}>{document.tickers.join(', ') || '—'}</td>
                    <td style={td}>{document.sectors.join(', ') || '—'}</td>
                    <td style={td}>
                      {formatIsoTimestampDisplay(document.createdAt)}
                    </td>
                    <td style={td}>
                      <button
                        type="button"
                        onClick={() => handleDownload(document)}
                        style={linkButton}
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

const panel = {
  marginTop: '32px',
  padding: '24px',
  background: '#0f2744',
  borderRadius: '12px',
  border: '1px solid #2d4a6b',
};

const eyebrow = {
  fontSize: '12px',
  fontWeight: 700,
  color: '#5eead4',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  marginBottom: '6px',
};

const heading = {
  fontSize: '20px',
  fontWeight: 700,
  marginTop: 0,
  marginBottom: '8px',
};

const description = {
  fontSize: '13px',
  color: '#94a3b8',
  lineHeight: 1.5,
  marginBottom: '20px',
  maxWidth: '640px',
};

const subheading = {
  fontSize: '14px',
  fontWeight: 700,
  marginBottom: '12px',
};

const form = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '14px',
};

const formRow = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '14px',
};

const label = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '6px',
  fontSize: '12px',
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  flex: '1 1 220px',
};

const input = {
  background: '#0b1f38',
  border: '1px solid #2d4a6b',
  borderRadius: '8px',
  padding: '10px 12px',
  color: '#e2e8f0',
  fontSize: '13px',
};

const fileInput = {
  ...input,
  padding: '8px',
};

const submitButton = {
  alignSelf: 'flex-start' as const,
  padding: '10px 20px',
  background: '#1B7A7A',
  border: 'none',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
};

const footnote = {
  fontSize: '13px',
  color: '#64748b',
};

const tableWrap = {
  overflowX: 'auto' as const,
};

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: '13px',
};

const th = {
  textAlign: 'left' as const,
  padding: '10px 12px',
  borderBottom: '1px solid #334155',
  color: '#94a3b8',
  fontWeight: 600,
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const td = {
  padding: '10px 12px',
  borderBottom: '1px solid #1e293b',
  verticalAlign: 'top' as const,
};

const titleCell = {
  display: 'block',
  fontWeight: 600,
  marginBottom: '4px',
};

const summaryCell = {
  display: 'block',
  fontSize: '12px',
  color: '#94a3b8',
  lineHeight: 1.4,
};

const linkButton = {
  background: 'none',
  border: 'none',
  color: '#5eead4',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  padding: 0,
};

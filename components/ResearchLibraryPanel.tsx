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
  stageResearchFile,
  discardStagedFile,
  type ExtractedSecurity,
} from '../lib/engines/research-library';
import { formatIsoTimestampDisplay } from '../lib/format-timestamp';
import StatusBox from './dashboard/StatusBox';
import { csvToRows, parseUniverseRows } from '../lib/research/universe-import';

const SOURCES: ResearchDocumentSource[] = ['Ord Minnett', 'Barrenjoey', 'Other'];
const DOCUMENT_TYPES: ResearchDocumentType[] = [
  'Top Ideas',
  'Coverage Universe',
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
  const [houseViewRating, setHouseViewRating] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);

  // Automatic reading: a PDF is staged in storage and read as soon as it's
  // chosen, pre-filling the form and the securities it covers. Nothing is
  // saved until the adviser checks it and clicks Save.
  const [stagedPath, setStagedPath] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [readWarnings, setReadWarnings] = useState<string[]>([]);
  const [securities, setSecurities] = useState<ExtractedSecurity[]>([]);

  async function chooseFile(next: File | null) {
    if (stagedPath) {
      discardStagedFile(stagedPath).catch(() => {});
      setStagedPath(null);
    }
    setFile(next);
    setSecurities([]);
    setReadError(null);
    setReadWarnings([]);
    setSubmitSuccess(false);
    if (!next) return;
    if (/\.(xlsx|csv)$/i.test(next.name)) {
      await readSpreadsheet(next);
      return;
    }
    if (next.type !== 'application/pdf') {
      setReadError('Only PDFs are read automatically — fill in the details below by hand for this file.');
      return;
    }

    setReading(true);
    try {
      const path = await stageResearchFile(next, 'staging');
      setStagedPath(path);
      const res = await fetch('/api/research/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath: path }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Failed to read the document.');
      const x = data.extracted;
      if (x.title) setTitle(x.title);
      if (x.source) setSource(x.source);
      if (x.documentType) setDocumentType(x.documentType);
      if (x.summary) setSummary(x.summary);
      setPublishedAt(x.publishedAt ?? null);
      setSectorsInput((x.sectors ?? []).join(', '));
      setSecurities(x.securities ?? []);
      setTickersInput((x.securities ?? []).map((sec: ExtractedSecurity) => sec.code).join(', '));
      setReadWarnings(data.warnings ?? []);
    } catch (error) {
      setReadError(
        `${error instanceof Error ? error.message : 'Failed to read the document.'} You can still fill in the details by hand and save.`,
      );
    } finally {
      setReading(false);
    }
  }

  // A coverage-universe spreadsheet is read in the browser - no AI involved,
  // every rating comes straight from the file.
  async function readSpreadsheet(next: File) {
    setReading(true);
    try {
      let rows;
      if (/\.csv$/i.test(next.name)) {
        rows = csvToRows(await next.text());
      } else {
        const { readSheet } = await import('read-excel-file/browser');
        rows = await readSheet(next);
      }
      const result = parseUniverseRows(rows as Parameters<typeof parseUniverseRows>[0]);
      if (result.securities.length === 0) throw new Error('No securities with a rating were found in the file.');
      const guessedSource: ResearchDocumentSource = /barrenjoey|\bbj\b/i.test(next.name) ? 'Barrenjoey' : 'Ord Minnett';
      const asAt = result.latestDate
        ? new Date(`${result.latestDate}T00:00:00Z`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
        : null;
      setSource(guessedSource);
      setDocumentType('Coverage Universe');
      setTitle(`${guessedSource} coverage universe${asAt ? ` — ${asAt}` : ''}`);
      setSummary(`${result.securities.length} securities with ${guessedSource}'s recommendation, risk rating and price target.`);
      setPublishedAt(result.latestDate);
      setSecurities(result.securities);
      setTickersInput(result.securities.map((sec) => sec.code).join(', '));
      setReadWarnings(result.warnings);
    } catch (error) {
      setReadError(
        `${error instanceof Error ? error.message : 'Could not read the spreadsheet.'} Check it has Security and Recommendation columns.`,
      );
    } finally {
      setReading(false);
    }
  }

  function updateSecurity(index: number, patch: Partial<ExtractedSecurity>) {
    setSecurities((prev) => prev.map((sec, i) => (i === index ? { ...sec, ...patch } : sec)));
  }

  function removeSecurity(index: number) {
    setSecurities((prev) => prev.filter((_, i) => i !== index));
  }

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
      const tickers = securities.length > 0
        ? securities.map((sec) => sec.code.toUpperCase())
        : normaliseTags(tickersInput, 'ticker');
      await uploadResearchDocument({
        stagedPath: stagedPath ?? undefined,
        securities,
        publishedAt: publishedAt ?? undefined,
        title: title.trim(),
        source,
        documentType,
        tickers,
        sectors: normaliseTags(sectorsInput, 'sector'),
        summary: summary.trim() || undefined,
        houseViewRating:
          (source === 'Ord Minnett' || source === 'Barrenjoey') && houseViewRating.trim()
            ? houseViewRating.trim()
            : undefined,
        file,
      });

      setTitle('');
      setTickersInput('');
      setSectorsInput('');
      setSummary('');
      setHouseViewRating('');
      setFile(null);
      setStagedPath(null);
      setSecurities([]);
      setPublishedAt(null);
      setReadWarnings([]);
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
        Choose a research PDF and it&apos;s read automatically: source, document type, and every security
        it covers with its rating, price target, and whether it&apos;s a Top Idea. A coverage universe
        spreadsheet (.xlsx or .csv) is read row by row and replaces the previous one from that source.
        Check the details, then save. Ratings feed conviction scores, and Top Ideas are compared against the model.
      </p>

      <form onSubmit={handleSubmit} style={form}>
        <label style={label}>
          Document
          <input
            style={fileInput}
            type="file"
            accept=".pdf,.doc,.docx,.xlsx,.csv"
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          />
        </label>
        {reading ? <StatusBox variant="neutral">Reading the document…</StatusBox> : null}
        {readError ? <StatusBox variant="warning">{readError}</StatusBox> : null}
        {readWarnings.length > 0 ? (
          <StatusBox variant="warning">
            <strong>Check before saving:</strong> {readWarnings.join(' ')}
          </StatusBox>
        ) : null}

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

          {securities.length === 0 && (source === 'Ord Minnett' || source === 'Barrenjoey') ? (
            <label style={label} title="Optional - feeds the conviction rating on Security Master">
              {source} rating (optional)
              <input
                style={input}
                value={houseViewRating}
                onChange={(event) => setHouseViewRating(event.target.value)}
                placeholder="e.g. Buy, Accumulate, Hold"
              />
            </label>
          ) : null}
        </div>

        {securities.length > 0 ? (
          <div style={securities.length > 25 ? { ...tableWrap, maxHeight: '460px', overflowY: 'auto' as const } : tableWrap}>
            <p style={subheading}>
              Securities read from the {documentType === 'Coverage Universe' ? 'spreadsheet' : 'document'} ({securities.length}) — edit anything that&apos;s wrong
            </p>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Code</th>
                  <th style={th}>Name</th>
                  <th style={th}>Rating</th>
                  <th style={th}>Price target</th>
                  {documentType === 'Coverage Universe' ? <th style={th}>Risk · updated</th> : null}
                  <th style={th}>Top Idea</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {securities.map((sec, i) => (
                  <tr key={`${sec.code}-${i}`}>
                    <td style={td}>
                      <input
                        style={{ ...input, width: '80px', height: '32px' }}
                        value={sec.code}
                        onChange={(e) => updateSecurity(i, { code: e.target.value.toUpperCase() })}
                      />
                    </td>
                    <td style={td}>{sec.name ?? '—'}</td>
                    <td style={td}>
                      <input
                        style={{ ...input, width: '120px', height: '32px' }}
                        value={sec.rating ?? ''}
                        onChange={(e) => updateSecurity(i, { rating: e.target.value || null })}
                      />
                    </td>
                    <td style={td}>
                      <input
                        style={{ ...input, width: '90px', height: '32px' }}
                        type="number"
                        step="0.01"
                        value={sec.priceTarget ?? ''}
                        onChange={(e) =>
                          updateSecurity(i, { priceTarget: e.target.value === '' ? null : parseFloat(e.target.value) })
                        }
                      />
                    </td>
                    {documentType === 'Coverage Universe' ? <td style={td}>{sec.note ?? '—'}</td> : null}
                    <td style={td}>
                      <input
                        type="checkbox"
                        checked={sec.isTopIdea}
                        onChange={(e) => updateSecurity(i, { isTopIdea: e.target.checked })}
                      />
                    </td>
                    <td style={td}>
                      <button type="button" style={linkButton} onClick={() => removeSecurity(i)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <label style={label}>
          Summary (optional)
          <textarea
            style={{ ...input, height: '64px', padding: '10px 12px', fontFamily: 'inherit', resize: 'vertical' as const }}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="One or two lines on what this document covers."
          />
        </label>


        {submitError ? (
          <StatusBox variant="error">{submitError}</StatusBox>
        ) : null}

        {submitSuccess ? (
          <StatusBox variant="success">Document uploaded to the research library.</StatusBox>
        ) : null}

        <button type="submit" disabled={submitting || reading} style={submitButton}>
          {submitting ? 'Saving…' : reading ? 'Reading…' : 'Save to Research Library'}
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
                  <th style={th}>Rating</th>
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
                    <td style={td}>{document.houseViewRating ?? '—'}</td>
                    <td style={td}>
                      {document.documentType}
                      {(document.documentType === 'Top Ideas' || document.documentType === 'Coverage Universe') && !document.isCurrent && (
                        <span style={supersededTag}>Superseded</span>
                      )}
                    </td>
                    <td style={td}>{tickerList(document.tickers)}</td>
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

// One three-column grid for every row, so fields line up from row to row.
const formRow = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
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
  minWidth: 0,
};

const input = {
  background: '#0b1f38',
  border: '1px solid #2d4a6b',
  borderRadius: '8px',
  padding: '0 12px',
  // Text boxes and dropdowns share one height so a row lines up.
  height: '40px',
  boxSizing: 'border-box' as const,
  width: '100%',
  color: '#e2e8f0',
  fontSize: '13px',
};

const fileInput = {
  ...input,
  height: 'auto',
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

const supersededTag = {
  display: 'inline-block',
  marginLeft: '6px',
  padding: '1px 7px',
  borderRadius: '999px',
  fontSize: '10px',
  fontWeight: 700,
  background: '#12203a',
  color: '#94a3b8',
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

function tickerList(tickers: string[]): string {
  if (tickers.length === 0) return '—';
  if (tickers.length <= 12) return tickers.join(', ');
  return `${tickers.slice(0, 12).join(', ')} +${tickers.length - 12} more`;
}

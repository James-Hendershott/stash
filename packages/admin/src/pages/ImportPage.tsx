import { useState, useRef, DragEvent } from 'react';

type ImportStep = 'upload' | 'map' | 'preview' | 'result';

interface ParseResult {
  headers: string[];
  previewRows: string[][];
  totalRows: number;
  importableFields: { key: string; label: string; required: boolean }[];
}

interface ImportResult {
  created: number;
  errors: { row: number; message: string }[];
}

export function ImportPage() {
  const [step, setStep] = useState<ImportStep>('upload');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [csvText, setCsvText] = useState('');
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a .csv file');
      return;
    }

    setError('');
    const text = await file.text();
    setCsvText(text);

    const token = localStorage.getItem('stash_token');
    const form = new FormData();
    form.append('file', file);

    const res = await fetch('/api/import/csv/parse', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to parse CSV');
      return;
    }

    const data: ParseResult = await res.json();
    setParseResult(data);

    // Auto-map columns that match field labels
    const autoMapping: Record<number, string> = {};
    data.headers.forEach((header, idx) => {
      const normalized = header.toLowerCase().trim();
      const match = data.importableFields.find(
        (f) => f.label.toLowerCase() === normalized || f.key.toLowerCase() === normalized
      );
      if (match) autoMapping[idx] = match.key;
    });
    setMapping(autoMapping);

    setStep('map');
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  async function handleImport() {
    if (!Object.values(mapping).includes('name')) {
      setError('You must map at least one column to "Name"');
      return;
    }

    setImporting(true);
    setError('');

    const token = localStorage.getItem('stash_token');
    const res = await fetch('/api/import/csv/execute', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ csvText, mapping }),
    });

    const data = await res.json();
    setImporting(false);

    if (!res.ok) {
      setError(data.error || 'Import failed');
      return;
    }

    setResult(data);
    setStep('result');
  }

  function reset() {
    setStep('upload');
    setParseResult(null);
    setCsvText('');
    setMapping({});
    setResult(null);
    setError('');
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Import CSV</h2>
        {step !== 'upload' && (
          <button onClick={reset} className="btn">Start Over</button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div
          className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div className="drop-zone-content">
            <div className="drop-zone-icon">CSV</div>
            <p className="drop-zone-title">Drop a CSV file here</p>
            <p className="drop-zone-subtitle">or click to browse</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFileInput} hidden />
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 'map' && parseResult && (
        <div>
          <div className="detail-card" style={{ marginBottom: 16 }}>
            <h3>Map Columns ({parseResult.totalRows} rows found)</h3>
            <p className="export-desc" style={{ marginBottom: 16 }}>
              Match each CSV column to a Stash field. Columns marked with * are required. Unmatched columns will be skipped.
            </p>
            <div className="mapping-grid">
              {parseResult.headers.map((header, idx) => (
                <div key={idx} className="mapping-row">
                  <div className="mapping-csv-col">
                    <span className="mapping-label">CSV Column</span>
                    <span className="mapping-value">{header}</span>
                    <span className="mapping-preview">
                      e.g. "{parseResult.previewRows[0]?.[idx] || ''}"
                    </span>
                  </div>
                  <span className="mapping-arrow">→</span>
                  <select
                    className="mapping-select"
                    value={mapping[idx] || ''}
                    onChange={(e) => {
                      const newMapping = { ...mapping };
                      if (e.target.value) newMapping[idx] = e.target.value;
                      else delete newMapping[idx];
                      setMapping(newMapping);
                    }}
                  >
                    <option value="">(skip)</option>
                    {parseResult.importableFields.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}{f.required ? ' *' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="detail-card" style={{ marginBottom: 16 }}>
            <h3>Preview (first 5 rows)</h3>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    {parseResult.headers.map((h, i) => (
                      <th key={i} style={{ color: mapping[i] ? '#3b82f6' : '#94a3b8' }}>
                        {mapping[i] ? parseResult.importableFields.find((f) => f.key === mapping[i])?.label : h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parseResult.previewRows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} style={{ opacity: mapping[ci] ? 1 : 0.4 }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="form-actions">
            <button
              onClick={handleImport}
              className="btn btn-primary"
              disabled={importing || !Object.values(mapping).includes('name')}
            >
              {importing ? `Importing ${parseResult.totalRows} rows...` : `Import ${parseResult.totalRows} Items`}
            </button>
            <button onClick={reset} className="btn">Cancel</button>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 'result' && result && (
        <div className="detail-card">
          <h3>Import Complete</h3>
          <div className="stats-grid" style={{ marginTop: 12, marginBottom: 16 }}>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#16a34a' }}>{result.created}</div>
              <div className="stat-label">Items Created</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: result.errors.length > 0 ? '#dc2626' : '#94a3b8' }}>
                {result.errors.length}
              </div>
              <div className="stat-label">Errors</div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Row</th><th>Error</th></tr>
                </thead>
                <tbody>
                  {result.errors.slice(0, 20).map((e, i) => (
                    <tr key={i}>
                      <td>{e.row}</td>
                      <td style={{ color: '#dc2626' }}>{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.errors.length > 20 && (
                <p className="export-desc" style={{ marginTop: 8 }}>
                  ...and {result.errors.length - 20} more errors
                </p>
              )}
            </div>
          )}

          <div className="form-actions" style={{ marginTop: 16 }}>
            <button onClick={reset} className="btn btn-primary">Import More</button>
            <a href="/items" className="btn">View Items</a>
          </div>
        </div>
      )}
    </div>
  );
}

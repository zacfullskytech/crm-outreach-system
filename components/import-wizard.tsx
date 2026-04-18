"use client";

import { ChangeEvent, useMemo, useState } from "react";

type PreviewResponse = {
  data: {
    importJobId: string;
    headers: string[];
    preview: Record<string, string>[];
    rowCount: number;
  };
};

type Step = "upload" | "map" | "execute";

const mappingFields = [
  "company_name",
  "contact_name",
  "email",
  "phone",
  "website",
  "city",
  "state",
  "postal_code",
  "industry",
  "source",
  "company_phone",
] as const;

export function ImportWizard() {
  const [step, setStep] = useState<Step>("upload");
  const [csv, setCsv] = useState("");
  const [filename, setFilename] = useState("upload.csv");
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const mappedFieldCount = Object.values(mapping).filter(Boolean).length;

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setFilename(file.name);
    const text = await file.text();
    setCsv(text);
  }

  async function uploadCsv() {
    if (!csv.trim()) {
      setMessage("Choose a CSV file first.");
      return;
    }

    setPending(true);
    setMessage(null);

    const response = await fetch("/api/imports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, csv }),
    });

    const body = (await response.json()) as PreviewResponse | { error?: string };
    if (!response.ok || !("data" in body)) {
      setMessage((body as { error?: string }).error || "Failed to parse CSV.");
      setPending(false);
      return;
    }

    setImportJobId(body.data.importJobId);
    setHeaders(body.data.headers);
    setPreview(body.data.preview);
    setStep("map");
    setPending(false);
  }

  async function saveMapping() {
    if (!importJobId) {
      setMessage("No import job loaded.");
      return;
    }

    setPending(true);
    setMessage(null);

    const response = await fetch(`/api/imports/${importJobId}/map`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mapping),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage(body.error || "Failed to save mapping.");
      setPending(false);
      return;
    }

    setStep("execute");
    setPending(false);
  }

  async function executeImport() {
    if (!importJobId) {
      setMessage("No import job loaded.");
      return;
    }

    setPending(true);
    setMessage(null);

    const response = await fetch(`/api/imports/${importJobId}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: preview }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "Failed to execute import.");
      setPending(false);
      return;
    }

    setMessage(`Import complete. Created ${body.data.createdCompanies} companies and ${body.data.createdContacts} contacts.`);
    setPending(false);
  }

  const sampleRows = useMemo(() => preview.slice(0, 5), [preview]);

  return (
    <div className="inline-grid">
      <div className="card subtle-card">
        <div className="record-summary-main">
          <div className="record-summary-topline">
            <h3>Import Progress</h3>
            <span className="badge badge-blue">{step}</span>
          </div>
          <div className="record-meta-row">
            <span>{filename}</span>
            <span>{headers.length} columns loaded</span>
            <span>{preview.length} preview rows</span>
            <span>{mappedFieldCount} mapped fields</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>1. Upload CSV</h3>
        <div className="field">
          <label htmlFor="import-file">CSV file</label>
          <input id="import-file" type="file" accept=".csv,text/csv" onChange={onFileChange} />
        </div>
        <div className="actions">
          <button className="button primary" type="button" onClick={uploadCsv} disabled={pending}>
            {pending && step === "upload" ? "Parsing..." : "Parse CSV"}
          </button>
          <span className="help">Current file: {filename}</span>
        </div>
      </div>

      {step !== "upload" ? (
        <div className="card">
          <h3>2. Map Columns</h3>
          <div className="form-grid">
            {mappingFields.map((field) => (
              <div key={field} className="field">
                <label htmlFor={`map-${field}`}>{field}</label>
                <select
                  id={`map-${field}`}
                  value={mapping[field] || ""}
                  onChange={(event) =>
                    setMapping((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                >
                  <option value="">Ignore</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="actions">
            <button className="button primary" type="button" onClick={saveMapping} disabled={pending}>
              {pending && step === "map" ? "Saving..." : "Save Mapping"}
            </button>
          </div>
        </div>
      ) : null}

      {step === "execute" ? (
        <div className="card">
          <h3>3. Execute Import</h3>
          <div className="actions">
            <button className="button primary" type="button" onClick={executeImport} disabled={pending}>
              {pending ? "Importing..." : "Run Import"}
            </button>
            <span className="help">Preview rows loaded: {preview.length}</span>
            <span className="help">Mapped fields: {mappedFieldCount}</span>
          </div>
        </div>
      ) : null}

      {sampleRows.length > 0 ? (
        <div className="card">
          <h3>Preview</h3>
          <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleRows.map((row, index) => (
                <tr key={index}>
                  {headers.map((header) => (
                    <td key={header}>{row[header]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="inline-grid mobile-card-list">
            {sampleRows.map((row, index) => (
              <div key={`preview-mobile-${index}`} className="dashboard-list-row mobile-record-card">
                <div className="record-summary-main">
                  <div className="record-summary-topline">
                    <strong>Preview row {index + 1}</strong>
                  </div>
                  <div className="inline-grid">
                    {headers.map((header) => (
                      <div key={`${index}-${header}`} className="field">
                        <label>{header}</label>
                        <div className="help">{row[header] || "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {message ? <div className="card"><p>{message}</p></div> : null}
    </div>
  );
}

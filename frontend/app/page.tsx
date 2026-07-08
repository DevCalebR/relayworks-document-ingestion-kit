"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type ConvertResponse = {
  success: boolean;
  filename: string;
  markdown: string;
  download_name: string;
};

type BatchSummary = {
  batch_id?: string;
  total_files: number;
  successful_files: number;
  failed_files: number;
  filenames: string[];
  errors: Array<{ filename: string; error: string }>;
};

type LeadForm = {
  name: string;
  email: string;
  company: string;
  document_count: string;
  document_type: string;
  message: string;
};

const emptyLeadForm: LeadForm = {
  name: "",
  email: "",
  company: "",
  document_count: "",
  document_type: "",
  message: "",
};

const useCases = [
  ["AI builders", "Prepare clean context files for RAG, agents, and eval sets."],
  ["Researchers", "Turn papers and reports into Markdown for notes and analysis."],
  ["Consultants", "Convert client PDFs into editable source material fast."],
  ["Students", "Extract readable study notes from dense course PDFs."],
  ["Teams with manuals/reports", "Clean internal docs before feeding them into AI tools."],
];

const pricing = [
  ["Free demo", "Convert individual PDFs locally during demos and discovery calls."],
  ["Paid manual conversion service", "Send messy document sets and get clean Markdown delivered."],
  ["SaaS coming soon", "Accounts, batch history, exports, and hosted workflows after demand is proven."],
];

function errorMessageFromResponse(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail: unknown }).detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      return detail
        .map((item) =>
          item && typeof item === "object" && "msg" in item
            ? String((item as { msg: unknown }).msg)
            : "Invalid request.",
        )
        .join("\n");
    }
    if (detail && typeof detail === "object" && "message" in detail) {
      const parts = [String((detail as { message: unknown }).message)];
      const stdout = (detail as { stdout?: unknown }).stdout;
      const stderr = (detail as { stderr?: unknown }).stderr;
      if (stderr) parts.push(`stderr: ${String(stderr)}`);
      if (stdout) parts.push(`stdout: ${String(stdout)}`);
      return parts.join("\n\n");
    }
  }
  return "Request failed. Please try another PDF.";
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function countWords(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [markdown, setMarkdown] = useState("");
  const [downloadName, setDownloadName] = useState("docforge-output.md");
  const [singleStatus, setSingleStatus] = useState("Ready for a PDF.");
  const [batchStatus, setBatchStatus] = useState("Ready for multiple PDFs.");
  const [error, setError] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [copyState, setCopyState] = useState("Copy Markdown");
  const [batchSummary, setBatchSummary] = useState<BatchSummary | null>(null);
  const [batchZip, setBatchZip] = useState<Blob | null>(null);
  const [leadForm, setLeadForm] = useState<LeadForm>(emptyLeadForm);
  const [leadStatus, setLeadStatus] = useState("");
  const [leadError, setLeadError] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  const markdownStats = useMemo(
    () => ({
      words: countWords(markdown),
      characters: markdown.length,
    }),
    [markdown],
  );
  const batchSize = batchFiles.reduce((total, file) => total + file.size, 0);

  function onSingleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setSingleFile(nextFile);
    setError("");
    setMarkdown("");
    setSingleStatus(nextFile ? "PDF selected. Ready to convert." : "Ready for a PDF.");
    setCopyState("Copy Markdown");
  }

  function onBatchFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);
    setBatchFiles(nextFiles);
    setError("");
    setBatchSummary(null);
    setBatchZip(null);
    setBatchStatus(nextFiles.length ? `${nextFiles.length} PDFs selected.` : "Ready for multiple PDFs.");
  }

  async function convertSinglePdf() {
    if (!singleFile) {
      setError("Choose a PDF before converting.");
      return;
    }

    setMode("single");
    setIsConverting(true);
    setError("");
    setMarkdown("");
    setSingleStatus("Uploading PDF and running Marker...");
    setCopyState("Copy Markdown");

    const formData = new FormData();
    formData.append("file", singleFile);

    try {
      const response = await fetch(`${API_BASE_URL}/convert`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(errorMessageFromResponse(payload));
      }

      const data = payload as ConvertResponse;
      setMarkdown(data.markdown);
      setDownloadName(data.download_name || "docforge-output.md");
      setSingleStatus(`Converted ${data.filename} into Markdown.`);
    } catch (err) {
      setSingleStatus("Conversion failed.");
      setError(err instanceof Error ? err.message : "Conversion failed.");
    } finally {
      setIsConverting(false);
    }
  }

  async function convertBatchPdfs() {
    if (!batchFiles.length) {
      setError("Choose at least one PDF before converting a batch.");
      return;
    }

    setMode("batch");
    setIsConverting(true);
    setError("");
    setBatchSummary(null);
    setBatchZip(null);
    setBatchStatus("Uploading PDFs and converting them one by one...");

    const formData = new FormData();
    batchFiles.forEach((file) => formData.append("files", file));

    try {
      const response = await fetch(`${API_BASE_URL}/convert-batch`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let payload: unknown = "Batch conversion failed.";
        try {
          payload = await response.json();
        } catch {
          payload = await response.text();
        }
        throw new Error(errorMessageFromResponse(payload));
      }

      const zipBlob = await response.blob();
      const summaryHeader = response.headers.get("X-DocForge-Summary");
      const parsedSummary = summaryHeader
        ? (JSON.parse(summaryHeader) as BatchSummary)
        : {
            total_files: batchFiles.length,
            successful_files: 0,
            failed_files: 0,
            filenames: batchFiles.map((file) => file.name),
            errors: [],
          };

      setBatchZip(zipBlob);
      setBatchSummary(parsedSummary);
      setBatchStatus(
        `Batch complete: ${parsedSummary.successful_files} succeeded, ${parsedSummary.failed_files} failed.`,
      );
      downloadBlob(zipBlob, `docforge-markdown-${parsedSummary.batch_id || "batch"}.zip`);
    } catch (err) {
      setBatchStatus("Batch conversion failed.");
      setError(err instanceof Error ? err.message : "Batch conversion failed.");
    } finally {
      setIsConverting(false);
    }
  }

  async function copyMarkdown() {
    if (!markdown) return;
    await navigator.clipboard.writeText(markdown);
    setCopyState("Copied");
    window.setTimeout(() => setCopyState("Copy Markdown"), 1600);
  }

  function downloadMarkdown() {
    if (!markdown) return;
    downloadBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), downloadName);
  }

  function resetConversion() {
    setSingleFile(null);
    setBatchFiles([]);
    setMarkdown("");
    setDownloadName("docforge-output.md");
    setSingleStatus("Ready for a PDF.");
    setBatchStatus("Ready for multiple PDFs.");
    setError("");
    setCopyState("Copy Markdown");
    setBatchSummary(null);
    setBatchZip(null);
  }

  function updateLeadField(field: keyof LeadForm, value: string) {
    setLeadForm((current) => ({ ...current, [field]: value }));
    setLeadError("");
    setLeadStatus("");
  }

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmittingLead(true);
    setLeadError("");
    setLeadStatus("");

    try {
      const response = await fetch(`${API_BASE_URL}/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadForm),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(errorMessageFromResponse(payload));
      }
      setLeadStatus("Request saved. Follow up manually from storage/leads/leads.jsonl.");
      setLeadForm(emptyLeadForm);
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : "Lead request failed.");
    } finally {
      setIsSubmittingLead(false);
    }
  }

  return (
    <main>
      <section className="hero" id="top">
        <nav className="nav" aria-label="Main navigation">
          <a className="brand-row" href="#top" aria-label="DocForge AI home">
            <span className="mark">D</span>
            <span>DocForge AI</span>
          </a>
          <div className="nav-links">
            <a href="#converter">Converter</a>
            <a href="#use-cases">Use cases</a>
            <a href="#pricing">Pricing</a>
            <a href="#bulk">Bulk conversion</a>
          </div>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <h1>Convert messy PDFs into clean AI-ready Markdown.</h1>
            <p>
              DocForge AI turns reports, manuals, research papers, and client documents into
              clean Markdown you can feed into AI tools, knowledge bases, and delivery workflows.
            </p>
            <div className="cta-row">
              <a className="primary-link" href="#converter">
                Convert a PDF
              </a>
              <a className="secondary-link" href="#bulk">
                Request bulk conversion
              </a>
            </div>
          </div>

          <aside className="hero-proof" aria-label="DocForge AI workflow">
            <div className="workflow-card">
              <div className="workflow-step active">Upload PDFs</div>
              <div className="workflow-line" />
              <div className="workflow-step">Marker conversion</div>
              <div className="workflow-line" />
              <div className="workflow-step">Markdown delivery</div>
            </div>
            <pre className="mini-preview">{`# Extracted Manual\n\n## Safety notes\n- Clean headings\n- Preserved sections\n- Ready for AI context`}</pre>
          </aside>
        </div>
      </section>

      <section className="section converter-section" id="converter">
        <div className="section-heading">
          <h2>Upload PDF</h2>
          <p>
            Use the free local demo for one-off files, or convert a batch into a ZIP when a
            customer has multiple documents.
          </p>
        </div>

        <div className="mode-switch" role="tablist" aria-label="Conversion mode">
          <button
            className={mode === "single" ? "active" : ""}
            type="button"
            onClick={() => setMode("single")}
          >
            Single PDF
          </button>
          <button
            className={mode === "batch" ? "active" : ""}
            type="button"
            onClick={() => setMode("batch")}
          >
            Batch PDFs
          </button>
        </div>

        <div className="converter-grid">
          <section className="panel upload-panel" aria-labelledby="upload-title">
            {mode === "single" ? (
              <>
                <div>
                  <p className="label">Single conversion</p>
                  <h3 id="upload-title">Convert one PDF to Markdown</h3>
                  <p className="muted">{singleStatus}</p>
                </div>

                <label className="drop-zone">
                  <input type="file" accept="application/pdf,.pdf" onChange={onSingleFileChange} />
                  <span>{singleFile ? singleFile.name : "Choose PDF"}</span>
                  <small>
                    {singleFile ? `${formatBytes(singleFile.size)} selected` : "PDF files only"}
                  </small>
                </label>

                <button
                  className="primary-button"
                  type="button"
                  onClick={convertSinglePdf}
                  disabled={!singleFile || isConverting}
                >
                  {isConverting ? "Converting..." : "Convert PDF"}
                </button>
              </>
            ) : (
              <>
                <div>
                  <p className="label">Batch foundation</p>
                  <h3 id="upload-title">Convert multiple PDFs to a ZIP</h3>
                  <p className="muted">{batchStatus}</p>
                </div>

                <label className="drop-zone">
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    onChange={onBatchFilesChange}
                  />
                  <span>{batchFiles.length ? `${batchFiles.length} PDFs selected` : "Choose PDFs"}</span>
                  <small>
                    {batchFiles.length ? `${formatBytes(batchSize)} total` : "Multiple PDF files"}
                  </small>
                </label>

                {batchFiles.length ? (
                  <ul className="file-list">
                    {batchFiles.slice(0, 6).map((file) => (
                      <li key={`${file.name}-${file.size}`}>
                        <span>{file.name}</span>
                        <small>{formatBytes(file.size)}</small>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <button
                  className="primary-button"
                  type="button"
                  onClick={convertBatchPdfs}
                  disabled={!batchFiles.length || isConverting}
                >
                  {isConverting ? "Converting batch..." : "Convert Batch"}
                </button>
              </>
            )}

            <button className="ghost-button" type="button" onClick={resetConversion}>
              Reset / New conversion
            </button>

            {error ? <pre className="error-box">{error}</pre> : null}
          </section>

          <section className="panel preview-panel" aria-labelledby="preview-title">
            <div className="preview-header">
              <div>
                <p className="label">Markdown preview</p>
                <h3 id="preview-title">Result</h3>
              </div>
              <div className="actions">
                <button type="button" onClick={copyMarkdown} disabled={!markdown}>
                  {copyState}
                </button>
                <button type="button" onClick={downloadMarkdown} disabled={!markdown}>
                  Download Markdown
                </button>
              </div>
            </div>

            <div className="stats-row">
              <span>{markdownStats.words.toLocaleString()} words</span>
              <span>{markdownStats.characters.toLocaleString()} characters</span>
              {downloadName ? <span>{downloadName}</span> : null}
            </div>

            <pre className={markdown ? "markdown-box" : "markdown-box empty"}>
              {markdown || "Your converted Markdown will appear here after a single PDF conversion."}
            </pre>

            {batchSummary ? (
              <div className="batch-summary">
                <div>
                  <strong>Batch summary</strong>
                  <p>
                    {batchSummary.successful_files} of {batchSummary.total_files} converted.
                    {batchSummary.failed_files ? ` ${batchSummary.failed_files} failed.` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    batchZip &&
                    downloadBlob(batchZip, `docforge-markdown-${batchSummary.batch_id || "batch"}.zip`)
                  }
                  disabled={!batchZip}
                >
                  Download ZIP again
                </button>
                {batchSummary.errors.length ? (
                  <ul>
                    {batchSummary.errors.map((item) => (
                      <li key={`${item.filename}-${item.error}`}>
                        <strong>{item.filename}:</strong> {item.error}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      </section>

      <section className="section" id="use-cases">
        <div className="section-heading">
          <h2>Built for document-heavy AI work</h2>
          <p>Start by selling outcomes, not software complexity.</p>
        </div>
        <div className="use-case-grid">
          {useCases.map(([title, description]) => (
            <article className="plain-card" key={title}>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section pricing-section" id="pricing">
        <div className="section-heading">
          <h2>Simple pricing path</h2>
          <p>The product can sell before the hosted SaaS exists.</p>
        </div>
        <div className="pricing-grid">
          {pricing.map(([title, description]) => (
            <article className="pricing-card" key={title}>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section lead-section" id="bulk">
        <div className="lead-copy">
          <h2>Request bulk conversion</h2>
          <p>
            Capture paid-service leads now. Submissions are saved locally so you can follow up
            manually and close the first conversion project without building accounts or billing.
          </p>
        </div>

        <form className="lead-form" onSubmit={submitLead}>
          <div className="form-grid">
            <label>
              Name
              <input
                required
                value={leadForm.name}
                onChange={(event) => updateLeadField("name", event.target.value)}
              />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                value={leadForm.email}
                onChange={(event) => updateLeadField("email", event.target.value)}
              />
            </label>
            <label>
              Company optional
              <input
                value={leadForm.company}
                onChange={(event) => updateLeadField("company", event.target.value)}
              />
            </label>
            <label>
              Number of documents
              <input
                required
                value={leadForm.document_count}
                onChange={(event) => updateLeadField("document_count", event.target.value)}
              />
            </label>
            <label>
              Document type
              <input
                required
                placeholder="Manuals, reports, research papers..."
                value={leadForm.document_type}
                onChange={(event) => updateLeadField("document_type", event.target.value)}
              />
            </label>
          </div>
          <label>
            Message
            <textarea
              required
              rows={5}
              value={leadForm.message}
              onChange={(event) => updateLeadField("message", event.target.value)}
            />
          </label>
          <button className="primary-button" type="submit" disabled={isSubmittingLead}>
            {isSubmittingLead ? "Saving request..." : "Request bulk conversion"}
          </button>
          {leadStatus ? <p className="success-box">{leadStatus}</p> : null}
          {leadError ? <pre className="error-box">{leadError}</pre> : null}
        </form>
      </section>
    </main>
  );
}

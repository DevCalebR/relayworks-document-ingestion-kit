"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type OutputFormat = "markdown" | "html" | "json" | "text";
type TemplateKey =
  | "general_markdown"
  | "rag_dataset"
  | "study_notes"
  | "meeting_notes"
  | "knowledge_base"
  | "technical_documentation"
  | "blog_draft"
  | "api_documentation";

type ExportFile = {
  format: OutputFormat;
  filename: string;
  size_bytes: number;
  url: string;
};

type ConvertResponse = {
  success: boolean;
  job_id: string;
  filename: string;
  template: TemplateKey;
  template_label: string;
  markdown: string;
  html: string;
  text: string;
  structured_json: unknown;
  download_name: string;
  metadata: {
    filename: string;
    pages: number;
    word_count: number;
    character_count: number;
    heading_count: number;
    table_count: number;
    image_count: number;
    list_count: number;
    conversion_time_seconds: number;
    output_size_bytes: number;
  };
  pipeline: Array<{ label: string; status: string }>;
  images: Array<{ filename: string; size_bytes: number; url: string }>;
  exports: Record<OutputFormat, ExportFile>;
  report: { text: string; download: ExportFile };
  images_zip: ExportFile | null;
  package: ExportFile;
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

const templates: Array<{ key: TemplateKey; label: string; description: string }> = [
  { key: "general_markdown", label: "General Markdown", description: "Clean source content for broad AI workflows." },
  { key: "rag_dataset", label: "RAG Dataset", description: "Chunked sections with source context." },
  { key: "study_notes", label: "Study Notes", description: "Topic-focused notes for learning and review." },
  { key: "meeting_notes", label: "Meeting Notes", description: "Summary, decisions, and action sections." },
  { key: "knowledge_base", label: "Knowledge Base", description: "Article-style content for support libraries." },
  {
    key: "technical_documentation",
    label: "Technical Documentation",
    description: "Overview and reference-oriented structure.",
  },
  { key: "blog_draft", label: "Blog Draft", description: "Editorial draft with main points." },
  { key: "api_documentation", label: "API Documentation", description: "Reference shell for technical content." },
];

const outputLabels: Record<OutputFormat, string> = {
  markdown: "Markdown",
  html: "Clean HTML",
  json: "Structured JSON",
  text: "Plain Text",
};

const useCases = [
  ["AI teams", "Prepare knowledge-ready content for assistants, retrieval systems, and evaluation sets."],
  ["Operations teams", "Turn policies, manuals, and reports into reliable content packages."],
  ["Research teams", "Extract clean notes, tables, and source structure from dense documents."],
  ["Agencies", "Convert client document libraries into reusable delivery assets."],
  ["Training teams", "Create study notes and knowledge base material from long PDFs."],
];

const pricing = [
  ["Free document demo", "Process individual files and inspect the complete AI-ready package."],
  ["Bulk conversion service", "Send document sets and receive structured content packages."],
  ["Team platform roadmap", "Shared workspaces, job history, and managed workflows after demand is proven."],
];

function errorMessageFromResponse(payload: unknown): string {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail: unknown }).detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (detail && typeof detail === "object" && "message" in detail) {
      return String((detail as { message: unknown }).message);
    }
  }
  return "We could not process this document. Please try another PDF or request bulk conversion.";
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const html: string[] = [];
  let inCode = false;
  let code: string[] = [];
  let inList = false;
  let table: string[] = [];

  const inline = (value: string) =>
    escapeHtml(value)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  const flushTable = () => {
    if (table.length < 2) {
      table = [];
      return;
    }
    const rows = table.map((row) => row.trim().replace(/^\||\|$/g, "").split("|"));
    html.push("<table><tbody>");
    rows
      .filter((row) => !row.every((cell) => /^:?-{3,}:?$/.test(cell.trim())))
      .forEach((row, index) => {
        html.push("<tr>");
        row.forEach((cell) => html.push(index === 0 ? `<th>${inline(cell.trim())}</th>` : `<td>${inline(cell.trim())}</td>`));
        html.push("</tr>");
      });
    html.push("</tbody></table>");
    table = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      flushTable();
      closeList();
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = [];
        inCode = false;
      } else {
        inCode = true;
      }
      return;
    }
    if (inCode) {
      code.push(line);
      return;
    }
    if (trimmed.startsWith("|") && trimmed.includes("|")) {
      closeList();
      table.push(line);
      return;
    }
    flushTable();
    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      return;
    }
    const list = /^[-*+]\s+(.+)$/.exec(trimmed);
    if (list) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inline(list[1])}</li>`);
      return;
    }
    if (!trimmed) {
      closeList();
      return;
    }
    closeList();
    html.push(`<p>${inline(trimmed)}</p>`);
  });

  flushTable();
  closeList();
  return html.join("\n");
}

export default function Home() {
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>("general_markdown");
  const [selectedOutput, setSelectedOutput] = useState<OutputFormat>("markdown");
  const [result, setResult] = useState<ConvertResponse | null>(null);
  const [editableMarkdown, setEditableMarkdown] = useState("");
  const [singleStatus, setSingleStatus] = useState("Ready for a PDF.");
  const [batchStatus, setBatchStatus] = useState("Ready for multiple PDFs.");
  const [error, setError] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [copyState, setCopyState] = useState("Copy");
  const [batchSummary, setBatchSummary] = useState<BatchSummary | null>(null);
  const [batchZip, setBatchZip] = useState<Blob | null>(null);
  const [leadForm, setLeadForm] = useState<LeadForm>(emptyLeadForm);
  const [leadStatus, setLeadStatus] = useState("");
  const [leadError, setLeadError] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  const renderedPreview = useMemo(() => markdownToHtml(editableMarkdown), [editableMarkdown]);
  const batchSize = batchFiles.reduce((total, file) => total + file.size, 0);

  function onSingleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setSingleFile(nextFile);
    setError("");
    setResult(null);
    setEditableMarkdown("");
    setSingleStatus(nextFile ? "Document selected. Ready to process." : "Ready for a PDF.");
    setCopyState("Copy");
  }

  function onBatchFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);
    setBatchFiles(nextFiles);
    setError("");
    setBatchSummary(null);
    setBatchZip(null);
    setBatchStatus(nextFiles.length ? `${nextFiles.length} documents selected.` : "Ready for multiple PDFs.");
  }

  async function convertSinglePdf() {
    if (!singleFile) {
      setError("Choose a PDF before processing.");
      return;
    }

    setMode("single");
    setIsConverting(true);
    setError("");
    setResult(null);
    setEditableMarkdown("");
    setSingleStatus("Preparing your AI-ready document package...");
    setCopyState("Copy");

    const formData = new FormData();
    formData.append("file", singleFile);

    try {
      const response = await fetch(`${API_BASE_URL}/convert?template=${selectedTemplate}`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(errorMessageFromResponse(payload));
      }

      const data = payload as ConvertResponse;
      setResult(data);
      setEditableMarkdown(data.markdown);
      setSingleStatus(`${data.filename} is ready for AI workflows.`);
    } catch (err) {
      setSingleStatus("Document processing could not complete.");
      setError(err instanceof Error ? err.message : "Document processing could not complete.");
    } finally {
      setIsConverting(false);
    }
  }

  async function convertBatchPdfs() {
    if (!batchFiles.length) {
      setError("Choose at least one PDF before processing a batch.");
      return;
    }

    setMode("batch");
    setIsConverting(true);
    setError("");
    setBatchSummary(null);
    setBatchZip(null);
    setBatchStatus("Preparing a bulk document package...");

    const formData = new FormData();
    batchFiles.forEach((file) => formData.append("files", file));

    try {
      const response = await fetch(`${API_BASE_URL}/convert-batch`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let payload: unknown = "Bulk document processing could not complete.";
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
        `Bulk package complete: ${parsedSummary.successful_files} succeeded, ${parsedSummary.failed_files} need review.`,
      );
      downloadBlob(zipBlob, `docforge-documents-${parsedSummary.batch_id || "batch"}.zip`);
    } catch (err) {
      setBatchStatus("Bulk document processing could not complete.");
      setError(err instanceof Error ? err.message : "Bulk document processing could not complete.");
    } finally {
      setIsConverting(false);
    }
  }

  async function copyMarkdown() {
    if (!editableMarkdown) return;
    await navigator.clipboard.writeText(editableMarkdown);
    setCopyState("Copied");
    window.setTimeout(() => setCopyState("Copy"), 1600);
  }

  function downloadSelectedOutput() {
    if (!result) return;
    const exportFile = result.exports[selectedOutput];
    window.open(absoluteUrl(exportFile.url), "_blank");
  }

  function downloadReport() {
    if (!result) return;
    window.open(absoluteUrl(result.report.download.url), "_blank");
  }

  function downloadPackage() {
    if (!result) return;
    window.open(absoluteUrl(result.package.url), "_blank");
  }

  function resetConversion() {
    setSingleFile(null);
    setBatchFiles([]);
    setResult(null);
    setEditableMarkdown("");
    setSingleStatus("Ready for a PDF.");
    setBatchStatus("Ready for multiple PDFs.");
    setError("");
    setCopyState("Copy");
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
      setLeadStatus("Request received. We will follow up with next steps.");
      setLeadForm(emptyLeadForm);
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : "We could not save your request.");
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
            <a href="#converter">Platform</a>
            <a href="#use-cases">Use cases</a>
            <a href="#pricing">Pricing</a>
            <a href="#bulk">Bulk conversion</a>
          </div>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <h1>Turn complex documents into AI-ready content packages.</h1>
            <p>
              DocForge AI processes PDFs into Markdown, clean HTML, structured JSON, plain text,
              extracted images, and processing reports for modern AI workflows.
            </p>
            <div className="cta-row">
              <a className="primary-link" href="#converter">
                Process a document
              </a>
              <a className="secondary-link" href="#bulk">
                Request bulk conversion
              </a>
            </div>
          </div>

          <aside className="hero-proof" aria-label="DocForge AI workflow">
            <div className="workflow-card">
              {["Upload", "Parse", "Transform", "Export", "Complete"].map((step, index) => (
                <div key={step}>
                  <div className={index < 3 ? "workflow-step active" : "workflow-step"}>{step}</div>
                  {index < 4 ? <div className="workflow-line" /> : null}
                </div>
              ))}
            </div>
            <pre className="mini-preview">{`Document package\n\n- Markdown\n- Clean HTML\n- Structured JSON\n- Plain text\n- Extracted images\n- Processing report`}</pre>
          </aside>
        </div>
      </section>

      <section className="section converter-section" id="converter">
        <div className="section-heading">
          <h2>Document processing workspace</h2>
          <p>
            Choose a transformation template, process a PDF, inspect the output, and download the
            format your workflow needs.
          </p>
        </div>

        <div className="mode-switch" role="tablist" aria-label="Conversion mode">
          <button className={mode === "single" ? "active" : ""} type="button" onClick={() => setMode("single")}>
            Single PDF
          </button>
          <button className={mode === "batch" ? "active" : ""} type="button" onClick={() => setMode("batch")}>
            Batch PDFs
          </button>
        </div>

        <div className="workspace-grid">
          <section className="panel upload-panel" aria-labelledby="upload-title">
            {mode === "single" ? (
              <>
                <div>
                  <p className="label">Transformation template</p>
                  <h3 id="upload-title">Choose your output shape</h3>
                  <p className="muted">{singleStatus}</p>
                </div>

                <div className="template-grid" role="radiogroup" aria-label="Transformation templates">
                  {templates.map((template) => (
                    <button
                      className={selectedTemplate === template.key ? "template-card active" : "template-card"}
                      key={template.key}
                      type="button"
                      onClick={() => setSelectedTemplate(template.key)}
                    >
                      <strong>{template.label}</strong>
                      <span>{template.description}</span>
                    </button>
                  ))}
                </div>

                <label className="drop-zone">
                  <input type="file" accept="application/pdf,.pdf" onChange={onSingleFileChange} />
                  <span>{singleFile ? singleFile.name : "Choose PDF"}</span>
                  <small>{singleFile ? `${formatBytes(singleFile.size)} selected` : "PDF files only"}</small>
                </label>

                <button className="primary-button" type="button" onClick={convertSinglePdf} disabled={!singleFile || isConverting}>
                  {isConverting ? "Processing..." : "Process Document"}
                </button>
              </>
            ) : (
              <>
                <div>
                  <p className="label">Bulk document conversion</p>
                  <h3 id="upload-title">Create a download package</h3>
                  <p className="muted">{batchStatus}</p>
                </div>

                <label className="drop-zone">
                  <input type="file" accept="application/pdf,.pdf" multiple onChange={onBatchFilesChange} />
                  <span>{batchFiles.length ? `${batchFiles.length} PDFs selected` : "Choose PDFs"}</span>
                  <small>{batchFiles.length ? `${formatBytes(batchSize)} total` : "Multiple PDF files"}</small>
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

                <button className="primary-button" type="button" onClick={convertBatchPdfs} disabled={!batchFiles.length || isConverting}>
                  {isConverting ? "Processing batch..." : "Create Bulk Package"}
                </button>
              </>
            )}

            <button className="ghost-button" type="button" onClick={resetConversion}>
              Start new conversion
            </button>

            {error ? <div className="error-box">{error}</div> : null}
          </section>

          <section className="panel result-panel" aria-labelledby="result-title">
            <div className="preview-header">
              <div>
                <p className="label">Processing pipeline</p>
                <h3 id="result-title">{result ? result.template_label : "Result"}</h3>
              </div>
              <button className="ghost-compact" type="button" onClick={downloadPackage} disabled={!result}>
                Download package
              </button>
            </div>

            <div className="pipeline-row">
              {(result?.pipeline ?? ["Upload", "Parse", "Transform", "Export", "Complete"].map((label) => ({ label, status: "waiting" }))).map(
                (step) => (
                  <span className={step.status === "complete" ? "pipeline-chip complete" : "pipeline-chip"} key={step.label}>
                    {step.label}
                  </span>
                ),
              )}
            </div>

            <div className="metadata-grid">
              {[
                ["Filename", result?.metadata.filename || "-"],
                ["Pages", result?.metadata.pages.toLocaleString() || "0"],
                ["Words", result?.metadata.word_count.toLocaleString() || "0"],
                ["Characters", result?.metadata.character_count.toLocaleString() || "0"],
                ["Headings", result?.metadata.heading_count.toLocaleString() || "0"],
                ["Tables", result?.metadata.table_count.toLocaleString() || "0"],
                ["Images", result?.metadata.image_count.toLocaleString() || "0"],
                ["Lists", result?.metadata.list_count.toLocaleString() || "0"],
                ["Conversion time", result ? `${result.metadata.conversion_time_seconds}s` : "0s"],
                ["Output size", result ? formatBytes(result.metadata.output_size_bytes) : "0 B"],
              ].map(([label, value]) => (
                <div className="metadata-item" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>

            <div className="export-bar">
              <label>
                Output format
                <select value={selectedOutput} onChange={(event) => setSelectedOutput(event.target.value as OutputFormat)}>
                  {Object.entries(outputLabels).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={downloadSelectedOutput} disabled={!result}>
                Download {outputLabels[selectedOutput]}
              </button>
              <button type="button" onClick={copyMarkdown} disabled={!editableMarkdown}>
                {copyState}
              </button>
            </div>

            <div className="split-view">
              <label className="markdown-editor">
                <span>Markdown</span>
                <textarea value={editableMarkdown} onChange={(event) => setEditableMarkdown(event.target.value)} />
              </label>
              <div className="rendered-preview">
                <span>Rendered Preview</span>
                <div className="rendered-body" dangerouslySetInnerHTML={{ __html: renderedPreview || "<p>Your preview will appear here after processing.</p>" }} />
              </div>
            </div>

            {result ? (
              <div className="processing-report">
                <div>
                  <strong>Processing summary</strong>
                  <pre>{result.report.text}</pre>
                </div>
                <button type="button" onClick={downloadReport}>
                  Download report
                </button>
              </div>
            ) : null}

            {result?.images.length ? (
              <div className="image-panel">
                <div className="image-panel-header">
                  <div>
                    <strong>Extracted images</strong>
                    <p>{result.images.length} images included in this document package.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => result.images_zip && window.open(absoluteUrl(result.images_zip.url), "_blank")}
                    disabled={!result.images_zip}
                  >
                    Download images
                  </button>
                </div>
                <div className="image-grid">
                  {result.images.map((image) => (
                    <figure key={image.filename}>
                      <img src={absoluteUrl(image.url)} alt={image.filename} />
                      <figcaption>
                        <span>{image.filename}</span>
                        <small>{formatBytes(image.size_bytes)}</small>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            ) : null}

            {batchSummary ? (
              <div className="batch-summary">
                <div>
                  <strong>Bulk conversion summary</strong>
                  <p>
                    {batchSummary.successful_files} of {batchSummary.total_files} processed.
                    {batchSummary.failed_files ? ` ${batchSummary.failed_files} need review.` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => batchZip && downloadBlob(batchZip, `docforge-documents-${batchSummary.batch_id || "batch"}.zip`)}
                  disabled={!batchZip}
                >
                  Download package again
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
          <p>Package source documents into formats teams can inspect, reuse, and operationalize.</p>
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
          <h2>Commercial path</h2>
          <p>Start with useful conversion packages, then expand into managed team workflows.</p>
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
            Send a document set for a structured conversion package with AI-ready content,
            extracted images, and a processing report.
          </p>
        </div>

        <form className="lead-form" onSubmit={submitLead}>
          <div className="form-grid">
            <label>
              Name
              <input required value={leadForm.name} onChange={(event) => updateLeadField("name", event.target.value)} />
            </label>
            <label>
              Email
              <input required type="email" value={leadForm.email} onChange={(event) => updateLeadField("email", event.target.value)} />
            </label>
            <label>
              Company optional
              <input value={leadForm.company} onChange={(event) => updateLeadField("company", event.target.value)} />
            </label>
            <label>
              Number of documents
              <input required value={leadForm.document_count} onChange={(event) => updateLeadField("document_count", event.target.value)} />
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
            <textarea required rows={5} value={leadForm.message} onChange={(event) => updateLeadField("message", event.target.value)} />
          </label>
          <button className="primary-button" type="submit" disabled={isSubmittingLead}>
            {isSubmittingLead ? "Submitting..." : "Request bulk conversion"}
          </button>
          {leadStatus ? <p className="success-box">{leadStatus}</p> : null}
          {leadError ? <div className="error-box">{leadError}</div> : null}
        </form>
      </section>
    </main>
  );
}


"use client";

import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";

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
  | "training_manual"
  | "clean_markdown_export";

type WorkspaceTab = "markdown" | "preview" | "html" | "json" | "text" | "images" | "report";

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

type JobStage = "queued" | "preparing" | "parsing" | "transforming" | "exporting" | "packaging" | "completed" | "failed";

type ConversionJob = {
  job_id: string;
  filename: string;
  template: TemplateKey;
  status: "queued" | "processing" | "completed" | "failed";
  stage: JobStage;
  message: string;
  created_at?: string;
  started_at?: string | null;
  completed_at?: string | null;
  error?: string | null;
  status_url: string;
  available_downloads?: Array<{ type: string; filename: string; size_bytes: number; url: string }>;
  result?: ConvertResponse | null;
};

type BatchSummary = {
  batch_id?: string;
  total_files: number;
  successful_files: number;
  failed_files: number;
  total_output_files: number;
  filenames: string[];
  errors: Array<{ filename: string; error: string }>;
};

type LeadForm = {
  name: string;
  email: string;
  company: string;
  document_count: string;
  document_type: string;
  goal: string;
  urgency: string;
  message: string;
};

type LeadRecord = LeadForm & {
  id: string;
  created_at: string;
};

const emptyLeadForm: LeadForm = {
  name: "",
  email: "",
  company: "",
  document_count: "",
  document_type: "",
  goal: "",
  urgency: "",
  message: "",
};

const goals: Array<{ key: TemplateKey; label: string; description: string }> = [
  { key: "knowledge_base", label: "AI Knowledge Base", description: "Structured articles for searchable team knowledge." },
  { key: "rag_dataset", label: "RAG Dataset", description: "Sectioned content with source context for retrieval workflows." },
  { key: "study_notes", label: "Study Guide", description: "Topic-focused notes for learning and review." },
  {
    key: "technical_documentation",
    label: "Technical Documentation",
    description: "Overview and reference-ready sections for technical teams.",
  },
  { key: "blog_draft", label: "Blog Draft", description: "Editorial outline with main points and draft body." },
  { key: "meeting_notes", label: "Meeting Notes", description: "Summary, decisions, and action-ready sections." },
  { key: "training_manual", label: "Training Manual", description: "Learning objectives, training sections, and review prompts." },
  { key: "clean_markdown_export", label: "Clean Markdown Export", description: "Clean source content for broad AI workflows." },
];

const workspaceTabs: Array<{ key: WorkspaceTab; label: string }> = [
  { key: "markdown", label: "Markdown" },
  { key: "preview", label: "Rendered Preview" },
  { key: "html", label: "Clean HTML" },
  { key: "json", label: "Structured JSON" },
  { key: "text", label: "Plain Text" },
  { key: "images", label: "Images" },
  { key: "report", label: "Processing Report" },
];

const useCases = [
  ["AI teams", "Prepare knowledge-ready content for assistants, retrieval systems, and evaluation sets."],
  ["Operations teams", "Turn policies, manuals, and reports into reliable content packages."],
  ["Research teams", "Extract clean notes, tables, and source structure from dense documents."],
  ["Agencies", "Convert client document libraries into reusable delivery assets."],
  ["Training teams", "Create study notes and knowledge base material from long PDFs."],
];

const pricing = [
  ["$25 cleanup", "Small document cleanup and AI-ready Markdown delivery."],
  ["$75-$150 package", "Report or manual conversion with Markdown, JSON, HTML, and text outputs."],
  ["$250+ bulk package", "Multi-document conversion with download package and processing report."],
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

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function stageLabel(stage: JobStage): string {
  const labels: Record<JobStage, string> = {
    queued: "Queued",
    preparing: "Preparing document",
    parsing: "Parsing PDF",
    transforming: "Transforming content",
    exporting: "Exporting files",
    packaging: "Packaging outputs",
    completed: "Complete",
    failed: "Failed",
  };
  return labels[stage] ?? "Processing";
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
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>("knowledge_base");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("markdown");
  const [result, setResult] = useState<ConvertResponse | null>(null);
  const [editableMarkdown, setEditableMarkdown] = useState("");
  const [singleStatus, setSingleStatus] = useState("Ready for a PDF.");
  const [activeJob, setActiveJob] = useState<ConversionJob | null>(null);
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
  const [leadRequests, setLeadRequests] = useState<LeadRecord[]>([]);
  const [leadReviewStatus, setLeadReviewStatus] = useState("Lead requests load on demand for private demos.");
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const pollTokenRef = useRef(0);

  const renderedPreview = useMemo(() => markdownToHtml(editableMarkdown), [editableMarkdown]);
  const batchSize = batchFiles.reduce((total, file) => total + file.size, 0);
  const selectedGoal = goals.find((goal) => goal.key === selectedTemplate) ?? goals[0];
  const structuredJson = result ? JSON.stringify(result.structured_json, null, 2) : "";

  function onSingleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    pollTokenRef.current += 1;
    setSingleFile(nextFile);
    setError("");
    setResult(null);
    setActiveJob(null);
    setEditableMarkdown("");
    setSingleStatus(nextFile ? "Document selected. Ready to process." : "Ready for a PDF.");
    setCopyState("Copy");
  }

  function onBatchFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);
    pollTokenRef.current += 1;
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
    const pollToken = pollTokenRef.current + 1;
    pollTokenRef.current = pollToken;
    const isCurrentPoll = () => pollTokenRef.current === pollToken;
    setIsConverting(true);
    setError("");
    setResult(null);
    setEditableMarkdown("");
    setActiveJob(null);
    setSingleStatus("Uploading document...");
    setCopyState("Copy");

    const formData = new FormData();
    formData.append("file", singleFile);

    try {
      const response = await fetch(`${API_BASE_URL}/jobs/convert?template=${selectedTemplate}`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(errorMessageFromResponse(payload));
      }

      let job = payload as ConversionJob;
      setActiveJob(job);
      setSingleStatus(`${stageLabel(job.stage)}: ${job.message}`);

      while (job.status === "queued" || job.status === "processing") {
        await wait(2000);
        if (!isCurrentPoll()) {
          return;
        }
        const statusResponse = await fetch(`${API_BASE_URL}/jobs/${job.job_id}`);
        const statusPayload = await statusResponse.json();
        if (!statusResponse.ok) {
          throw new Error(errorMessageFromResponse(statusPayload));
        }
        if (!isCurrentPoll()) {
          return;
        }
        job = statusPayload as ConversionJob;
        setActiveJob(job);
        setSingleStatus(`${stageLabel(job.stage)}: ${job.message}`);
      }

      if (!isCurrentPoll()) {
        return;
      }

      if (job.status === "failed") {
        throw new Error(job.error || job.message || "Document processing could not complete.");
      }

      if (!job.result) {
        throw new Error("The job completed, but no output package was returned.");
      }

      setResult(job.result);
      setEditableMarkdown(job.result.markdown);
      setSingleStatus(`${job.result.filename} is ready for AI workflows.`);
    } catch (err) {
      if (isCurrentPoll()) {
        setSingleStatus("Document processing could not complete.");
        setError(err instanceof Error ? err.message : "Document processing could not complete.");
      }
    } finally {
      if (isCurrentPoll()) {
        setIsConverting(false);
      }
    }
  }

  async function convertBatchPdfs() {
    if (!batchFiles.length) {
      setError("Choose at least one PDF before processing a batch.");
      return;
    }

    setMode("batch");
    pollTokenRef.current += 1;
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
      const summaryHeader = response.headers.get("X-RelayWorks-Summary");
      const parsedSummary = summaryHeader
        ? (JSON.parse(summaryHeader) as BatchSummary)
        : {
            total_files: batchFiles.length,
            successful_files: 0,
            failed_files: 0,
            total_output_files: 0,
            filenames: batchFiles.map((file) => file.name),
            errors: [],
          };

      setBatchZip(zipBlob);
      setBatchSummary(parsedSummary);
      setBatchStatus(
        `Bulk package complete: ${parsedSummary.successful_files} succeeded, ${parsedSummary.failed_files} need review.`,
      );
      downloadBlob(zipBlob, `relayworks-documents-${parsedSummary.batch_id || "batch"}.zip`);
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

  function downloadReport() {
    if (!result) return;
    window.open(absoluteUrl(result.report.download.url), "_blank");
  }

  function downloadPackage() {
    if (!result) return;
    window.open(absoluteUrl(result.package.url), "_blank");
  }

  function resetConversion() {
    pollTokenRef.current += 1;
    setSingleFile(null);
    setBatchFiles([]);
    setResult(null);
    setActiveJob(null);
    setEditableMarkdown("");
    setSingleStatus("Ready for a PDF.");
    setBatchStatus("Ready for multiple PDFs.");
    setError("");
    setCopyState("Copy");
    setBatchSummary(null);
    setBatchZip(null);
    setActiveTab("markdown");
    setIsConverting(false);
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

  async function loadLeadRequests() {
    setIsLoadingLeads(true);
    setLeadReviewStatus("Loading quote requests...");
    try {
      const response = await fetch(`${API_BASE_URL}/leads`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(errorMessageFromResponse(payload));
      }
      const leads = Array.isArray(payload.leads) ? (payload.leads as LeadRecord[]) : [];
      setLeadRequests(leads);
      setLeadReviewStatus(leads.length ? `${leads.length} quote requests found.` : "No quote requests saved yet.");
    } catch (err) {
      setLeadReviewStatus(err instanceof Error ? err.message : "Could not load quote requests.");
    } finally {
      setIsLoadingLeads(false);
    }
  }

  return (
    <main>
      <section className="hero" id="top">
        <nav className="nav" aria-label="Main navigation">
          <a className="brand-row" href="#top" aria-label="RelayWorks home">
            <span className="mark">R</span>
            <span>RelayWorks</span>
          </a>
          <div className="nav-links">
            <a href="#converter">Workspace</a>
            <a href="#use-cases">Use cases</a>
            <a href="#service">Service</a>
            <a href="#bulk">Bulk conversion</a>
            <a href="#lead-requests">Lead Requests</a>
          </div>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <h1>Turn complex documents into AI-ready content packages.</h1>
            <p>
              RelayWorks turns PDFs, reports, and manuals into knowledge-ready content,
              structured files, extracted images, and complete download packages for AI workflows.
            </p>
            <div className="cta-row">
              <a className="primary-link" href="#converter">
                Open document workspace
              </a>
              <a className="secondary-link" href="#bulk">
                Request bulk conversion
              </a>
            </div>
          </div>

          <aside className="hero-proof" aria-label="RelayWorks workflow">
            <div className="workflow-card">
              {["Upload", "Read", "Prepare", "Package", "Complete"].map((step, index) => (
                <div key={step}>
                  <div className={index < 3 ? "workflow-step active" : "workflow-step"}>{step}</div>
                  {index < 4 ? <div className="workflow-line" /> : null}
                </div>
              ))}
            </div>
            <pre className="mini-preview">{`Complete package\n\n- document.md\n- document.html\n- document.json\n- document.txt\n- selected-goal-output.md\n- processing-report.md`}</pre>
          </aside>
        </div>
      </section>

      <section className="section converter-section" id="converter">
        <div className="section-heading">
          <h2>Document processing workspace</h2>
          <p>
            Choose what you want to create, process a PDF, inspect every output, and download a
            complete package for your workflow.
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
                  <p className="label">Goal-based deliverables</p>
                  <h3 id="upload-title">What do you want to create?</h3>
                  <p className="muted">{singleStatus}</p>
                </div>

                <div className="template-grid" role="radiogroup" aria-label="Document goals">
                  {goals.map((template) => (
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

                <div className="batch-metrics">
                  <div>
                    <span>Selected files</span>
                    <strong>{batchFiles.length}</strong>
                  </div>
                  <div>
                    <span>Total size</span>
                    <strong>{formatBytes(batchSize)}</strong>
                  </div>
                  <div>
                    <span>Package type</span>
                    <strong>ZIP</strong>
                  </div>
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
                <p className="label">{result ? "Processing complete" : "Document workspace"}</p>
                <h3 id="result-title">{result ? result.filename : selectedGoal.label}</h3>
                <p className="muted">
                  {result ? `${result.template_label} package is ready.` : "Your outputs will appear here after processing."}
                </p>
              </div>
              <button className="primary-compact" type="button" onClick={downloadPackage} disabled={!result}>
                Download Complete Package
              </button>
            </div>

            <div className="pipeline-row">
              {(activeJob && !result
                ? [
                    "queued",
                    "preparing",
                    "parsing",
                    "transforming",
                    "exporting",
                    "packaging",
                    "completed",
                  ].map((stage) => ({
                    label: stageLabel(stage as JobStage),
                    status:
                      stage === activeJob.stage || activeJob.stage === "completed"
                        ? "complete"
                        : "waiting",
                  }))
                : result?.pipeline ?? ["Upload", "Read", "Prepare", "Package", "Complete"].map((label) => ({ label, status: "waiting" }))
              ).map(
                (step) => (
                  <span className={step.status === "complete" ? "pipeline-chip complete" : "pipeline-chip"} key={step.label}>
                    {step.label}
                  </span>
                ),
              )}
            </div>

            {activeJob && !result ? (
              <div className={activeJob.status === "failed" ? "error-box" : "status-box"}>
                <strong>{stageLabel(activeJob.stage)}</strong>
                <p>{activeJob.message}</p>
              </div>
            ) : null}

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

            <div className="workspace-tabs" role="tablist" aria-label="Document outputs">
              {workspaceTabs.map((tab) => (
                <button
                  className={activeTab === tab.key ? "active" : ""}
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="tab-surface">
              {activeTab === "markdown" ? (
                <label className="markdown-editor full">
                  <span>
                    Markdown
                    <button type="button" onClick={copyMarkdown} disabled={!editableMarkdown}>
                      {copyState}
                    </button>
                  </span>
                  <textarea value={editableMarkdown} onChange={(event) => setEditableMarkdown(event.target.value)} />
                </label>
              ) : null}

              {activeTab === "preview" ? (
                <div className="rendered-preview full">
                  <span>Rendered Preview</span>
                  <div className="rendered-body" dangerouslySetInnerHTML={{ __html: renderedPreview || "<p>Your preview will appear here after processing.</p>" }} />
                </div>
              ) : null}

              {activeTab === "html" ? (
                <pre className="output-code">{result?.html || "Clean HTML will appear here after processing."}</pre>
              ) : null}

              {activeTab === "json" ? (
                <pre className="output-code">{structuredJson || "Structured JSON will appear here after processing."}</pre>
              ) : null}

              {activeTab === "text" ? (
                <pre className="output-code">{result?.text || "Plain text will appear here after processing."}</pre>
              ) : null}

              {activeTab === "images" ? (
                <div className="image-panel">
                  <div className="image-panel-header">
                    <div>
                      <strong>Extracted images</strong>
                      <p>
                        {result?.images.length
                          ? `${result.images.length} images included in this document package.`
                          : "Extracted images will appear here when the document includes them."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => result?.images_zip && window.open(absoluteUrl(result.images_zip.url), "_blank")}
                      disabled={!result?.images_zip}
                    >
                      Download images
                    </button>
                  </div>
                  {result?.images.length ? (
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
                  ) : null}
                </div>
              ) : null}

              {activeTab === "report" ? (
                <div className="processing-report">
                  <div>
                    <strong>Processing summary</strong>
                    <pre>{result?.report.text || "Processing summary will appear here after processing."}</pre>
                  </div>
                  <button type="button" onClick={downloadReport} disabled={!result}>
                    Download report
                  </button>
                </div>
              ) : null}
            </div>

            {batchSummary ? (
              <div className="batch-summary">
                <div>
                  <strong>Bulk conversion summary</strong>
                  <p>
                    {batchSummary.successful_files} of {batchSummary.total_files} processed with{" "}
                    {batchSummary.total_output_files} output files included.
                    {batchSummary.failed_files ? ` ${batchSummary.failed_files} need review.` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => batchZip && downloadBlob(batchZip, `relayworks-documents-${batchSummary.batch_id || "batch"}.zip`)}
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

      <section className="section service-section" id="service">
        <div className="section-heading">
          <h2>Done-for-you bulk conversion</h2>
          <p>
            Send messy PDFs, reports, manuals, or research files and receive clean AI-ready
            Markdown, structured content packages, extracted images, and processing summaries.
          </p>
        </div>
        <div className="service-grid">
          {[
            ["Who it helps", "Teams, consultants, students, researchers, training groups, and AI builders."],
            ["What you receive", "Knowledge-ready content packages with Markdown, JSON, HTML, plain text, and reports."],
            ["Turnaround", "Fast manual delivery for small batches, with quote-based timing for larger document sets."],
          ].map(([title, description]) => (
            <article className="plain-card" key={title}>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <div className="service-cta">
          <a className="primary-link" href="#bulk">
            Request quote
          </a>
          <a className="secondary-link" href="#converter">
            Try the workspace
          </a>
        </div>
      </section>

      <section className="section pricing-section" id="pricing">
        <div className="section-heading">
          <h2>Manual service pricing</h2>
          <p>Simple starting prices for private demos and first customer conversations.</p>
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
              Approximate document count
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
            <label>
              Goal/output needed
              <select required value={leadForm.goal} onChange={(event) => updateLeadField("goal", event.target.value)}>
                <option value="">Choose goal</option>
                {goals.map((goal) => (
                  <option value={goal.label} key={goal.key}>
                    {goal.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Urgency
              <select required value={leadForm.urgency} onChange={(event) => updateLeadField("urgency", event.target.value)}>
                <option value="">Choose timing</option>
                <option>24-48 hours</option>
                <option>This week</option>
                <option>This month</option>
                <option>Planning ahead</option>
              </select>
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

      <section className="section lead-review-section" id="lead-requests">
        <div className="section-heading">
          <h2>Lead Requests</h2>
          <p>
            Private-demo operator view for saved quote requests. Use it after submitting the form
            to plan follow-up and manual delivery.
          </p>
        </div>
        <div className="lead-review-panel">
          <div className="lead-review-toolbar">
            <p>{leadReviewStatus}</p>
            <button type="button" onClick={loadLeadRequests} disabled={isLoadingLeads}>
              {isLoadingLeads ? "Loading..." : "Refresh requests"}
            </button>
          </div>
          {leadRequests.length ? (
            <div className="lead-request-list">
              {leadRequests.map((lead) => (
                <article className="lead-request-card" key={lead.id}>
                  <div>
                    <h3>{lead.name}</h3>
                    <p>{lead.email}</p>
                  </div>
                  <dl>
                    <div>
                      <dt>Company</dt>
                      <dd>{lead.company || "Not provided"}</dd>
                    </div>
                    <div>
                      <dt>Document count</dt>
                      <dd>{lead.document_count}</dd>
                    </div>
                    <div>
                      <dt>Document type</dt>
                      <dd>{lead.document_type}</dd>
                    </div>
                    <div>
                      <dt>Goal</dt>
                      <dd>{lead.goal}</dd>
                    </div>
                    <div>
                      <dt>Urgency</dt>
                      <dd>{lead.urgency}</dd>
                    </div>
                    <div>
                      <dt>Created</dt>
                      <dd>{new Date(lead.created_at).toLocaleString()}</dd>
                    </div>
                  </dl>
                  <p className="lead-message">{lead.message}</p>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

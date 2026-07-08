"use client";

import { ChangeEvent, useMemo, useState } from "react";

type ConvertResponse = {
  success: boolean;
  filename: string;
  markdown: string;
  download_name: string;
};

function errorMessageFromResponse(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail: unknown }).detail;
    if (typeof detail === "string") {
      return detail;
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
  return "Conversion failed. Please try another PDF.";
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [downloadName, setDownloadName] = useState("docforge-output.md");
  const [error, setError] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [copyState, setCopyState] = useState("Copy Markdown");

  const canConvert = useMemo(() => file && !isConverting, [file, isConverting]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setError("");
    setCopyState("Copy Markdown");
  }

  async function convertPdf() {
    if (!file) {
      setError("Choose a PDF before converting.");
      return;
    }

    setIsConverting(true);
    setError("");
    setMarkdown("");
    setCopyState("Copy Markdown");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/convert", {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed.");
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
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="page-shell">
      <section className="workspace">
        <div className="intro">
          <div className="brand-row">
            <div className="mark">D</div>
            <span>DocForge AI</span>
          </div>
          <h1>Convert PDFs into clean AI-ready Markdown</h1>
          <p>
            Built for researchers, AI builders, consultants, and teams who need
            clean document text fast.
          </p>
        </div>

        <div className="tool-grid">
          <section className="panel upload-panel" aria-labelledby="upload-title">
            <div>
              <p className="eyebrow">Local MVP</p>
              <h2 id="upload-title">Upload a PDF</h2>
              <p className="muted">
                Marker runs locally and returns Markdown you can preview, copy,
                or download.
              </p>
            </div>

            <label className="drop-zone">
              <input type="file" accept="application/pdf,.pdf" onChange={onFileChange} />
              <span>{file ? file.name : "Choose PDF"}</span>
              <small>{file ? "Ready to convert" : "PDF files only"}</small>
            </label>

            <button
              className="primary-button"
              type="button"
              onClick={convertPdf}
              disabled={!canConvert}
            >
              {isConverting ? "Converting..." : "Convert PDF"}
            </button>

            {error ? <pre className="error-box">{error}</pre> : null}
          </section>

          <section className="panel preview-panel" aria-labelledby="preview-title">
            <div className="preview-header">
              <div>
                <p className="eyebrow">Markdown Preview</p>
                <h2 id="preview-title">Result</h2>
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

            <pre className={markdown ? "markdown-box" : "markdown-box empty"}>
              {markdown || "Your converted Markdown will appear here."}
            </pre>
          </section>
        </div>
      </section>
    </main>
  );
}

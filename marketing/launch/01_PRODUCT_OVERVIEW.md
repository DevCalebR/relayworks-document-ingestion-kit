# RelayWorks AI Document Processing Kit - Product Overview

RelayWorks AI Document Processing Kit is a source-code product for developers and teams that need a working PDF ingestion baseline. It combines a FastAPI backend, a Next.js frontend, and a Marker-based PDF conversion pipeline that turns uploaded PDFs into AI-ready content packages.

The product is built for local ownership. Buyers receive code they can inspect, run, modify, and adapt inside their own environment instead of subscribing to a hosted document-processing account.

## What The Product Is

RelayWorks is a downloadable software kit for processing PDFs into structured outputs. It provides:

- A FastAPI backend for upload, processing, job status, downloads, and lead capture.
- A Next.js frontend for selecting a document goal, uploading PDFs, reviewing outputs, and downloading packages.
- Integration with Marker through the local `marker_single` command.
- Background single-document conversion with local file-backed job metadata.
- Batch PDF conversion for local bulk packages.
- Exporters for Markdown, HTML, JSON, plain text, selected goal output, reports, images, and ZIP packages.
- Buyer-facing screenshots, proof folders, setup docs, and sample guidance.

It is not a SaaS platform, chatbot, document management system, or hosted API service. It is a source-owned application baseline.

## Who It Is For

RelayWorks is for:

- AI developers building RAG, knowledge base, document QA, or content preparation workflows.
- Technical founders who need a document ingestion starting point before building custom product logic.
- Internal tools teams that need local document processing for policies, manuals, reports, or research PDFs.
- Agencies delivering document cleanup, migration, or AI-readiness projects for clients.
- Developers who want a practical FastAPI + Next.js implementation rather than a blank repository.

It is best suited for buyers who can run Python, Node.js, and local CLI tools, and who are comfortable adapting source code.

## Primary Value Proposition

RelayWorks saves buyers the time required to assemble the repeated baseline pieces of a document ingestion product:

- Upload handling.
- PDF parsing through Marker.
- Background processing for long-running conversions.
- Honest job status.
- Multiple output formats.
- Downloadable ZIP packages.
- Extracted image handling.
- Processing reports.
- A usable frontend workspace.
- Local storage conventions.
- Documentation and launch proof assets.

The core value is not perfect extraction for every PDF. The value is a functioning, inspectable source-code baseline that buyers can modify for their own document-heavy AI workflows.

## Supported Document Types

Current support is PDF-first.

Supported:

- `.pdf` uploads.
- Single PDF conversion through the background-job workflow.
- Multiple PDF uploads through the batch conversion workflow.

Not currently supported as primary input formats:

- DOCX.
- PPTX.
- XLSX.
- HTML pages.
- Images as standalone uploads.
- Email files.
- Cloud-drive imports.

The product may extract images embedded in PDFs when Marker produces image assets.

## Outputs Generated

For a single processed PDF, RelayWorks can generate:

- Markdown.
- Clean HTML.
- Structured JSON.
- Plain text.
- Selected goal output.
- Processing report.
- Extracted image list.
- Image ZIP when images are available.
- Complete ZIP package.

Single-document package contents can include:

```text
document.md
document.html
document.json
document.txt
processing-report.md
selected-goal-output.md
images/
```

Batch package contents can include:

```text
markdown/
html/
json/
text/
goal-output/
reports/
batch-processing-report.md
_summary.json
```

Actual output depends on the source PDF and Marker extraction behavior.

## Requirements

Recommended local requirements:

- Python 3.11.
- Node.js 20+ or 22+.
- npm.
- Marker installed in the active Python environment.
- `marker_single` available on the shell path used to start the backend.
- Local filesystem access for uploads, outputs, ZIPs, job metadata, and lead records.

The current local version does not require API keys.

## Installation Overview

High-level setup:

1. Clone or download the repository.
2. Create and activate a Python environment.
3. Install backend requirements from `backend/requirements.txt`.
4. Install Marker separately and confirm `marker_single --help` works.
5. Start the FastAPI backend on port `8000`.
6. Install frontend dependencies with npm.
7. Start the Next.js frontend on port `3000`.
8. Open `http://localhost:3000`.
9. Upload a PDF and process it through the document workspace.

Backend:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
marker_single --help
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev -- -p 3000
```

The default frontend development command uses Webpack because this repository had local Turbopack file-read timeout issues during development.


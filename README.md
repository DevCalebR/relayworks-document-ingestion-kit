# RelayWorks Document Ingestion Kit

A source-owned FastAPI + Next.js document ingestion app for turning PDFs into clean Markdown, HTML, JSON, text, extracted images, reports, and downloadable packages.

RelayWorks Document Ingestion Kit is intended for AI developers, technical founders, internal tools teams, and agencies building document-heavy workflows. It gives you a working local baseline for PDF ingestion without starting from an empty repository.

## Problem

Developers lose days or weeks building document ingestion pipelines from scratch.

A useful ingestion baseline usually needs upload handling, PDF parsing, Markdown output, alternate export formats, image extraction, batch processing, downloadable packages, reports, and a frontend for evaluating results. This repository packages those pieces into a source-owned app you can inspect, run, and adapt.

## Who It Is For

- AI developers building RAG, knowledge base, document QA, or content preparation workflows.
- Technical founders who need a document ingestion baseline before building custom product logic.
- Internal tools teams converting reports, manuals, and PDFs into reusable internal content.
- Agencies delivering document cleanup, migration, or AI-readiness projects for clients.

## What Is Included

- FastAPI backend
- Next.js frontend
- Marker integration through `marker_single`
- Background single-PDF workflow with honest job status
- Batch PDF workflow
- Markdown export
- HTML export
- JSON export
- Plain text export
- Extracted images
- Processing reports
- Downloadable ZIP packages
- Sample folder and sample guidance
- Smoke test script
- Project documentation

## What It Is Not

- Not a SaaS platform
- Not an AI chatbot
- Not a document management system
- Not a promise of perfect extraction from every PDF
- Not a hosted service

## Requirements

- Python 3.11 recommended
- Node.js 20+ or 22+ recommended
- npm
- Marker installed in the active Python environment
- `marker_single` available on the shell path used to start the backend
- Local filesystem access for uploads, generated outputs, ZIPs, and lead capture files

The app does not require API keys for the current local version.

## Quickstart

Clone the repository and enter the repo root:

```bash
git clone https://github.com/DevCalebR/relayworks-document-ingestion-kit.git
cd relayworks-document-ingestion-kit
```

Create or activate a Python environment where Marker is installed. If you already have a Marker-ready environment, activate that environment instead.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

Confirm Marker is available:

```bash
marker_single --help
```

Start the backend:

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Start the frontend in a second terminal:

```bash
cd frontend
npm install
npm run dev -- -p 3000
```

Open the app:

```text
http://localhost:3000
```

## Local Workflow

1. Start the FastAPI backend on port `8000`.
2. Start the Next.js frontend on port `3000`.
3. Open the document workspace.
4. Upload a PDF in single-file mode or multiple PDFs in batch mode.
5. Single-file uploads create a local background job and the frontend polls for status.
6. Review generated Markdown, rendered preview, HTML, JSON, plain text, images, and processing report.
7. Download the complete package ZIP.
8. Use the lead form only as a local/private-demo capture mechanism.

## API Overview

The backend exposes these primary endpoints:

### `POST /jobs/convert`

Recommended single-PDF workflow. Accepts one PDF file, saves the upload, creates a local background job, starts conversion in a bounded local worker, and returns HTTP `202` immediately.

The response includes:

- `job_id`
- `status`
- `stage`
- `message`
- `status_url`

### `GET /jobs/{job_id}`

Returns the current job metadata. Supported statuses are `queued`, `processing`, `completed`, and `failed`. Stages are honest lifecycle labels such as `queued`, `preparing`, `parsing`, `transforming`, `exporting`, `packaging`, `completed`, and `failed`.

The frontend polls this endpoint about every two seconds and stops when the job reaches `completed` or `failed`. Completed jobs include `available_downloads` and the preview/output payload under `result`.

### `GET /jobs/{job_id}/downloads`

Returns the available download options for the job.

### `POST /convert`

Legacy blocking endpoint for small-document compatibility. It accepts one PDF file and returns a preview response with metadata, pipeline status, generated content, export links, image links, report data, and package download link. The frontend uses `/jobs/convert` instead.

### `POST /convert-batch`

Accepts multiple PDF files and returns a ZIP package containing per-document outputs and a batch summary.

### `GET /download/{job_id}/{download_type}`

Downloads a generated output for a processed job. Supported download types include Markdown, HTML, JSON, text, report, package, and image ZIP where available.

### `POST /lead`

Stores a local bulk-conversion lead request in `storage/leads/leads.jsonl`.

### `GET /leads`

Returns locally captured lead records for private demo review.

## Output Package Contents

Single-document packages can include:

```text
document.md
document.html
document.json
document.txt
processing-report.md
selected-goal-output.md
images/
```

Batch packages can include:

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

Actual output depends on the input PDF and whether Marker extracts images from the file.

## Repository Structure

```text
backend/
  main.py                  FastAPI routes and orchestration
  requirements.txt         Python dependencies
  services/                Parser, transformer, exporter, preview, and models
frontend/
  app/                     Next.js app UI and styling
  package.json             Frontend scripts and dependencies
samples/                   Safe sample guidance; private PDFs are ignored
scripts/                   Local smoke test script
storage/                   Local runtime data; uploads and outputs are ignored
  jobs/                    Local background job metadata
```

See `PROJECT_STRUCTURE.md` for a more detailed layout.

## Proof And Examples

Buyer-facing proof materials are organized in `proof/`. The current pack includes the folder structure and sample requirements; actual PDFs should only be added when redistribution rights are clear.

Use `SAMPLE_SELECTION_GUIDE.md` to choose safe sample PDFs and regenerate expected outputs. Use `INSTALLATION_PROOF.md` to review clean-checkout install and validation results.

## Validation

The current validation commands are:

```bash
python -m py_compile backend/main.py backend/services/*.py
```

```bash
cd frontend
npm run typecheck
npm run build
```

A local smoke test is also available:

```bash
scripts/smoke_test.sh
```

The smoke test checks backend imports, expected local folders, Marker availability, and optionally runs a sample conversion when `samples/sample.pdf` exists and the backend is running.

## Known Limitations

- PDF-first support. Other document formats are not the current target.
- Extraction quality depends on the input PDF and Marker behavior.
- Some scanned, image-heavy, malformed, or layout-complex PDFs may need manual review.
- Marker must be installed and working locally.
- Single-PDF frontend conversions use local background jobs backed by JSON metadata files in `storage/jobs/`.
- The legacy `/convert` endpoint still processes synchronously and is intended only for compatibility or small-document checks.
- Local file-backed jobs are simple and source-code-buyer friendly, but they are not a distributed queue. They are best for local evaluation and single-machine deployments.
- If the backend stops while a job is queued or processing, that job is marked failed/interrupted on startup or the next read instead of being shown as still processing.
- Local storage is used for uploads, outputs, ZIPs, and leads.
- This is not a hosted multi-user system.
- No authentication, billing, cloud storage, background queue, or database is included.

## Commercial Positioning

RelayWorks Document Ingestion Kit is a professional source-code product for developers who want ownership and a working baseline. It is designed to be evaluated, modified, and extended by technical teams that need document ingestion inside their own product or internal workflow.

The value is not a hosted account. The value is source ownership, a functioning FastAPI + Next.js baseline, and a practical document ingestion workflow that can be adapted to a buyer's stack.

## Configuration Notes

Environment examples are provided in:

```text
.env.example
backend/.env.example
frontend/.env.example
```

No secrets are required for the current local version. Do not commit private PDFs, generated outputs, ZIP packages, lead data, or local environment files.

Backend conversion settings:

```text
MARKER_TIMEOUT_SECONDS=3600
CONVERSION_CONCURRENCY=1
MAX_UPLOAD_SIZE_MB=100
```

`MARKER_TIMEOUT_SECONDS` is a Marker subprocess safety limit, not an HTTP request timeout. `CONVERSION_CONCURRENCY` controls how many local Marker jobs run at once and defaults to one worker for developer laptops. `MAX_UPLOAD_SIZE_MB` keeps local PDF uploads bounded.

## License

Commercial license terms are in draft form and must be finalized before paid release. See `LICENSE.md`.

Third-party dependency notices are documented at a high level in `THIRD_PARTY_NOTICES.md`; final dependency/license review is required before commercial release.

## Support

Support process will be finalized before commercial launch.

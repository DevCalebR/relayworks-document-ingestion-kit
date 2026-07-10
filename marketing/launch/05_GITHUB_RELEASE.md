# GitHub Release Draft

## Release Title

RelayWorks AI Document Processing Kit - Launch Release

## Release Announcement

RelayWorks AI Document Processing Kit is now packaged as a source-code baseline for PDF ingestion and AI-ready document processing.

This release includes a FastAPI backend, a Next.js frontend, Marker-based PDF processing, background conversion jobs, local file-backed job metadata, multiple export formats, downloadable packages, screenshots, and launch documentation.

The product is intended for developers, technical founders, internal tools teams, and agencies that need a working PDF ingestion baseline they can inspect and adapt.

## Changelog

### Added

- FastAPI backend for document conversion workflows.
- Next.js frontend document workspace.
- Marker integration through `marker_single`.
- Background single-PDF conversion endpoint.
- Job status polling workflow.
- Local file-backed job persistence under `storage/jobs/`.
- Stale job recovery for interrupted queued/processing jobs.
- Markdown export.
- HTML export.
- Structured JSON export.
- Plain text export.
- Selected goal output.
- Processing report output.
- Extracted image downloads.
- Image ZIP package.
- Complete ZIP package.
- Batch PDF conversion package.
- Lead capture route for local/private demos.
- Backend tests for job storage and job API behavior.
- Launch screenshot package under `marketing/screenshots/`.
- Screenshot manifest.
- Launch marketing documentation under `marketing/launch/`.
- Installation proof documentation.
- Sample selection guidance.

### Changed

- Frontend development command uses Webpack by default with `next dev --webpack`.
- Single-PDF frontend workflow uses background jobs instead of the legacy blocking conversion route.
- Marker timeout is configurable through `MARKER_TIMEOUT_SECONDS`.
- Local conversion concurrency is configurable through `CONVERSION_CONCURRENCY`.
- Local PDF upload size limit is configurable through `MAX_UPLOAD_SIZE_MB`.

### Fixed

- Extracted image download route handles filenames with leading underscores.
- Extracted image route is registered before the generic download route.
- UI-facing job errors avoid exposing raw tracebacks.

## Installation

Clone the repository:

```bash
git clone https://github.com/DevCalebR/relayworks-document-ingestion-kit.git
cd relayworks-document-ingestion-kit
```

Create a Python environment and install backend dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

Install Marker separately and confirm the CLI is available:

```bash
marker_single --help
```

Start the backend:

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Start the frontend:

```bash
cd frontend
npm install
npm run dev -- -p 3000
```

Open:

```text
http://localhost:3000
```

## Demo Section

Suggested demo flow:

1. Open the document workspace.
2. Select the AI Knowledge Base goal.
3. Upload a PDF.
4. Start processing.
5. Show the background job stage/status.
6. Wait for completion.
7. Review summary metrics.
8. Open Markdown output.
9. Open rendered preview.
10. Open structured JSON.
11. Open processing report.
12. Open extracted images if available.
13. Download the complete ZIP package.
14. Open FastAPI docs at `http://localhost:8000/docs`.

## Screenshot Section

Recommended screenshot gallery:

1. `marketing/screenshots/final/01-homepage.png`
2. `marketing/screenshots/final/02-goal-selection.png`
3. `marketing/screenshots/final/05-conversion-complete.png`
4. `marketing/screenshots/final/06-markdown-output.png`
5. `marketing/screenshots/final/08-structured-json.png`
6. `marketing/screenshots/final/11-download-package.png`

Additional proof screenshots:

- Upload-ready state.
- Real background job processing state.
- Rendered preview.
- Processing report.
- Extracted images.
- FastAPI endpoint proof.

See `marketing/screenshots/SCREENSHOT_MANIFEST.md` for usage guidance.

## Known Limitations

- PDF-first support.
- Marker must be installed separately.
- Extraction quality depends on source PDF quality and Marker behavior.
- Local file-backed jobs are not a distributed production queue.
- No authentication, billing, cloud storage, or hosted infrastructure is included.
- Current license terms must be finalized before paid commercial launch.


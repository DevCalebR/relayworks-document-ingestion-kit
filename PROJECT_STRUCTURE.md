# Project Structure

RelayWorks is organized as a small local/private-demo document-processing app.

## Top Level

- `README.md` explains what the project does, how to run it locally, and how to demo it.
- `.env.example` documents local environment defaults without secrets.
- `.gitignore` keeps generated files, local customer documents, virtual environments, and build artifacts out of git.
- `PROJECT_STRUCTURE.md` explains the repository layout.
- `CHANGELOG.md` records release-level changes.
- `RELEASE_CHECKLIST.md` tracks what must be true before publishing or demoing a release.

## Backend

- `backend/main.py` contains the FastAPI routes and request orchestration.
- `backend/requirements.txt` lists Python backend dependencies.
- `backend/README.md` documents backend endpoints and local startup.
- `backend/services/parser.py` validates uploads and runs Marker.
- `backend/services/models.py` defines the internal document and export dataclasses.
- `backend/services/transformer.py` applies rule-based output templates.
- `backend/services/exporter.py` writes Markdown, HTML, JSON, text, reports, image ZIPs, and package ZIPs.
- `backend/services/preview.py` shapes API responses for the frontend.

## Frontend

- `frontend/app/page.tsx` contains the single-page RelayWorks workspace and landing/demo flow.
- `frontend/app/globals.css` contains the frontend styling.
- `frontend/app/layout.tsx` defines Next.js metadata and root layout.
- `frontend/package.json` and `frontend/package-lock.json` define the frontend runtime and locked npm dependency tree.
- `frontend/.env.example` documents the local API URL setting.

## Samples

- `samples/README.md` explains how to use safe local demo PDFs.
- `samples/.gitignore` prevents private PDFs from being committed accidentally.
- `samples/.gitkeep` keeps the folder present in git.

## Scripts

- `scripts/smoke_test.sh` provides a local smoke test for backend imports, expected folders, Marker availability, and optional sample conversion.

## Storage

The `storage/` folders are local runtime folders. Customer uploads, generated outputs, ZIP packages, and leads are ignored by git.

- `storage/uploads/` stores uploaded PDFs.
- `storage/output/` stores Marker and export outputs.
- `storage/zips/` stores generated ZIP packages.
- `storage/leads/` stores local lead capture records.

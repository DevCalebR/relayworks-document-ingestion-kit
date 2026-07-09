# RelayWorks

RelayWorks is a polished private-demo product for turning PDFs, reports, and manuals into AI-ready content packages. The goal is fastest first payday: sell done-for-you document conversion before adding full SaaS infrastructure.

The current build supports single conversion, batch conversion, goal-based deliverables, Markdown/HTML/JSON/plain text outputs, extracted images, complete ZIP packages, processing reports, and lead capture.

Do not add Supabase, Stripe, auth, Redis, cloud storage, Docker, complex admin panels, or team accounts yet.

## Correct Local Path

Use the checked-out repo root:

```bash
cd <repo-root>
```

Do not run commands from a nested virtualenv, generated output folder, or extracted archive copy. Commands and storage paths below assume the repo root.

## Runtime Notes

- Frontend: Next.js 16.2.10.
- Recommended Node: current active Node 20+ or 22+.
- Backend: FastAPI with `marker_single` available in the active Python environment.
- Frontend port: `3000`.
- Backend port: `8000`.

If the Next dev server does not bind to port 3000:

```bash
cd <repo-root>/frontend
npm run dev -- -p 3000
```

If the command starts but never prints a local URL and `lsof -nP -iTCP:3000 -sTCP:LISTEN` shows nothing, use the production demo fallback:

```bash
npm run build
npm run start -- -p 3000
```

If the port is already used, stop the old process or temporarily run:

```bash
npm run dev -- -p 3001
```

Then set the frontend API URL only if needed:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 npm run dev -- -p 3001
```

## Start The Demo

Backend:

```bash
cd <repo-root>
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd <repo-root>/frontend
npm install
npm run dev -- -p 3000
```

Open:

```text
http://localhost:3000
```

## Demo Checklist

1. Start backend on port 8000.
2. Start frontend on port 3000.
3. Open the document workspace.
4. Choose a goal such as `AI Knowledge Base` or `RAG Dataset`.
5. Test single conversion with a PDF.
6. Open each output tab: Markdown, Rendered Preview, Clean HTML, Structured JSON, Plain Text, Images, Processing Report.
7. Click `Download Complete Package`.
8. Test batch conversion with two PDFs if sample files are available.
9. Confirm the ZIP includes a batch processing report.
10. Submit the bulk conversion form.
11. Open `Lead Requests` and click `Refresh requests`.
12. Inspect saved leads directly if needed:

```bash
tail -n 5 storage/leads/leads.jsonl
```

## Final Demo Checklist

- Backend running on port 8000.
- Frontend running on port 3000.
- Single conversion tested.
- Batch conversion tested.
- Complete package downloaded and opened.
- Lead form submitted.
- Lead review checked.
- Smoke test run:

```bash
scripts/smoke_test.sh
```

## What The Complete Package Includes

Single conversion package:

```text
document.md
document.html
document.json
document.txt
processing-report.md
selected-goal-output.md
images/
```

Batch package:

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

## Samples And Smoke Test

Sample PDF guidance lives in:

```text
samples/README.md
```

Private PDFs should not be committed. The `samples/` folder ignores PDFs by default; use `samples/sample.pdf` locally when you want the smoke test to exercise conversion.

Run the smoke test:

```bash
cd <repo-root>
scripts/smoke_test.sh
```

## Goal-Based Deliverables

The document workspace asks what the customer wants to create:

- AI Knowledge Base
- RAG Dataset
- Study Guide
- Technical Documentation
- Blog Draft
- Meeting Notes
- Training Manual
- Clean Markdown Export

These are rule-based transformations for now. No LLM APIs are called.

## Architecture

```mermaid
flowchart LR
  A[Document Upload] --> B[Parser Service]
  B --> C[Unified Document Model]
  C --> D[Transformer Service]
  D --> E[Exporter Service]
  D --> F[Preview Service]
  E --> G[Download Package]
  F --> H[Document Workspace]
```

Request flow:

```text
FastAPI route
  -> service orchestration
  -> parser
  -> transformer
  -> exporter
  -> preview response
```

## Folder Structure

```text
backend/
  main.py
  services/
    parser.py
    transformer.py
    exporter.py
    preview.py
    models.py
frontend/
  app/
    page.tsx
    globals.css
storage/
  uploads/
  output/
  zips/
  leads/
```

## Unified Document Model

Each processed PDF becomes one internal `Document` object:

```text
Document
  metadata
  pages
  sections
  headings
  paragraphs
  tables
  images
  lists
  code_blocks
  footnotes
```

Exports, reports, previews, and image handling consume this model instead of passing raw Markdown across the app.

## Adding New Goals

Goal transformations live in `backend/services/transformer.py`.

To add a goal:

1. Add a `TemplateKey` value in `backend/services/models.py`.
2. Add a label in `TEMPLATE_LABELS`.
3. Create a function that accepts `Document` and returns Markdown.
4. Register it in `TEMPLATE_TRANSFORMERS`.
5. Add a goal card in `frontend/app/page.tsx`.

## Adding New Exporters

Export writing lives in `backend/services/exporter.py`.

To add a format:

1. Extend `OutputFormat` in `backend/services/models.py`.
2. Add file extension and content handling in `backend/services/exporter.py`.
3. Add the corresponding customer-facing output tab in `frontend/app/page.tsx`.

## Fastest First Payday Plan

Sell the manual service first. Use the demo to show the customer one representative PDF, then quote a package to process the rest.

### What To Sell First

- Clean AI-ready Markdown for one messy PDF.
- Report/manual conversion package with Markdown, JSON, HTML, text, and a processing report.
- Bulk conversion package for a folder of PDFs, manuals, reports, or course materials.
- Add-on: organize the results into a knowledge base or RAG-ready dataset.

### Who To Contact First

- Consultants with client reports and deliverables.
- AI builders making assistants or retrieval demos.
- Researchers with papers and PDFs.
- Students with lecture PDFs or study materials.
- Small teams with manuals, SOPs, policies, or onboarding docs.
- Agencies handling document-heavy client projects.

### How To Demo It

1. Ask for one representative PDF.
2. Choose the most relevant goal card.
3. Process the document live.
4. Show the metadata summary and pipeline status.
5. Click through the output tabs.
6. Download the complete package.
7. Open the ZIP and show the named files.
8. Offer to process the remaining files manually.

### What To Charge Manually

- `$25` small document cleanup.
- `$75-$150` report or manual conversion package.
- `$250+` bulk conversion package.

Raise prices for urgent turnaround, many files, scanned PDFs, or manual cleanup.

## Manual Delivery Workflow

1. Receive the lead or quote request.
2. Reply and ask for the source files.
3. Process files in batch mode.
4. Download the complete ZIP package.
5. Review output quality before delivery.
6. Send the ZIP package to the customer.
7. Collect payment manually.

## First Customer Outreach Copy

### LinkedIn DM

Hi {{name}}, I’m offering a fast document cleanup service for teams using AI tools. Send me a PDF, report, or manual and I’ll turn it into clean AI-ready Markdown, structured JSON, plain text, and a complete content package. Want me to process one sample file?

### Short Email

Subject: Clean AI-ready files from your PDFs

Hi {{name}},

I help teams turn messy PDFs, manuals, reports, and research docs into clean AI-ready content packages: Markdown, structured JSON, HTML, plain text, extracted images, and a processing report.

If you send one sample PDF, I can show you what the finished package looks like and quote the rest.

Small cleanup starts at $25, report/manual packages are usually $75-$150, and bulk packages start at $250.

### Fiverr/Upwork Gig Description

I will convert your PDFs, manuals, reports, or research documents into clean AI-ready content packages. Delivery can include Markdown, structured JSON, clean HTML, plain text, extracted images, and a processing report. Best for AI knowledge bases, RAG datasets, study guides, training material, and technical documentation.

### Simple Pricing Message

Pricing starts at $25 for a small cleanup, $75-$150 for a report or manual conversion package, and $250+ for bulk document conversion. Final price depends on file count, length, urgency, scan quality, and cleanup needs.

## Current Limitations

- Private-demo/local operator workflow.
- Marker runs synchronously inside each request.
- Batch conversion processes files one by one.
- Page count is estimated without adding a PDF parsing dependency.
- Rule-based goals are intentionally simple.
- No auth, billing, database, hosted storage, background worker, or admin dashboard.
- Large or complex PDFs may take several minutes.
- Output quality depends on Marker and source PDF quality.

## Next Build

The next build should happen after sales conversations reveal a real bottleneck:

- Add a safe committed sample PDF only if one is truly public and tiny.
- Add a small local lead status field if follow-up tracking becomes painful.
- Add a one-page invoice template for manual payment requests.

Do not add full SaaS infrastructure until a customer has paid or clearly committed.

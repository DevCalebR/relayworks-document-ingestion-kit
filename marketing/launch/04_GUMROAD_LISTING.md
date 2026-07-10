# Gumroad Listing Draft

## Product Title

RelayWorks AI Document Processing Kit - FastAPI + Next.js PDF Ingestion Source Code

## Short Description

A source-code document ingestion kit that turns PDFs into Markdown, HTML, JSON, text, reports, extracted images, and downloadable ZIP packages using FastAPI, Next.js, and Marker.

## Long Description

RelayWorks AI Document Processing Kit is a downloadable source-code product for developers building document-heavy AI workflows.

Instead of starting from a blank repository, you get a working FastAPI + Next.js application that accepts PDFs, processes them through Marker, creates background conversion jobs, reports honest processing status, and produces AI-ready output packages.

Use it as a starting point for:

- RAG content preparation.
- Knowledge base ingestion.
- Internal document processing tools.
- PDF cleanup workflows.
- Agency document conversion projects.
- AI-ready Markdown and JSON pipelines.

RelayWorks is not a hosted SaaS account. It is source code you can inspect, run, modify, and adapt for your own stack.

The current product is PDF-first. It does not promise perfect extraction for every PDF, scanned document, or complex layout. Extraction quality depends on Marker and the source file. What it gives you is a practical local baseline with upload handling, background jobs, output exports, reports, screenshots, and documentation already assembled.

## Feature Bullets

- FastAPI backend.
- Next.js frontend.
- React document workspace.
- Marker integration through `marker_single`.
- PDF upload handling.
- Background single-PDF job workflow.
- File-backed local job metadata.
- Honest stage/status display.
- Configurable Marker timeout.
- Configurable local worker concurrency.
- Markdown export.
- HTML export.
- Structured JSON export.
- Plain text export.
- Selected goal output.
- Processing report.
- Extracted image handling.
- Image ZIP downloads.
- Complete ZIP package downloads.
- Batch PDF package workflow.
- FastAPI docs for API inspection.
- Screenshot package for launch/demo use.
- Local-first setup with no required API keys.

## What's Included

- `backend/` FastAPI application.
- `frontend/` Next.js application.
- `services/` modules for parsing, transformation, export, preview, and jobs.
- Background job endpoints.
- Download endpoints.
- Batch conversion route.
- Lead capture route for local/private demos.
- README and backend documentation.
- Installation proof document.
- Sample selection guide.
- Draft commercial license placeholder.
- Third-party dependency notice placeholder.
- Launch screenshot set.
- Screenshot manifest.
- Launch marketing docs.

## Requirements

Buyers should be comfortable with local development tools.

Recommended:

- Python 3.11.
- Node.js 20+ or 22+.
- npm.
- Marker installed separately.
- `marker_single` available in the backend shell path.
- Local filesystem access.

Basic startup:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
marker_single --help
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

```bash
cd frontend
npm install
npm run dev -- -p 3000
```

Open:

```text
http://localhost:3000
```

## Refund Policy Suggestion

Suggested Gumroad policy:

Because this is a downloadable source-code product, refunds should be limited to clear purchase mistakes or cases where the buyer cannot access the files. No refund should be promised for inability to customize, inability to install third-party dependencies, unsupported PDF types, or extraction quality limitations that are disclosed in the listing.

Plain-language draft:

> Due to the digital/source-code nature of this product, all sales are final once files are downloaded. If you purchased by mistake or cannot access the download, contact support within 7 days and I will review the issue. This product is sold as a developer starting point, not as a guarantee that every PDF will extract perfectly.

Final refund language should be reviewed against marketplace rules and local law.

## License Explanation

RelayWorks is intended as a commercial source-code product, not an open-source project.

The included `LICENSE.md` is currently a draft placeholder and must be finalized before paid release. The intended license direction is:

- Buyers may download and run the code under their purchased license tier.
- Buyers may modify the code for permitted internal or project use.
- Buyers may not redistribute, resell, sublicense, publish, or repackage the source code unless a final license explicitly allows it.
- Team, commercial, and agency/client-work rights should be separated by license tier.

Do not launch paid sales until final legal terms are reviewed.

## SEO Keywords

PDF ingestion source code, AI document processing kit, FastAPI PDF parser, Next.js document processing app, Marker PDF pipeline, RAG document ingestion, AI-ready Markdown, PDF to JSON source code, PDF to Markdown app, document ingestion starter kit, local PDF processing, source-code product for AI developers, knowledge base ingestion, document conversion app, FastAPI Next.js starter, extracted images PDF, PDF batch conversion, AI workflow document prep.


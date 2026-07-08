# DocForge AI

DocForge AI is a local MVP for converting PDFs into clean, AI-ready Markdown. Upload a PDF, run Marker locally, preview the generated Markdown, copy it, and download it as a `.md` file.

The goal is a fast demo that can become a paid utility quickly without auth, billing, queues, cloud storage, or a full SaaS stack.

## Start the Backend

From the repo root:

```bash
source /Users/caleb/docforge-ai/.venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The API runs at `http://localhost:8000`.

If you create a virtual environment directly in this checkout later, use `source .venv/bin/activate` instead.

## Start the Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

## Test with a PDF

1. Open `http://localhost:3000`.
2. Choose a PDF file.
3. Click `Convert PDF`.
4. Verify the Markdown preview appears.
5. Use `Copy Markdown` or `Download Markdown`.

Uploads are saved in `storage/uploads/`. Marker output is saved in unique folders under `storage/output/`.

## Current MVP Limitations

- Local-only demo.
- One PDF per conversion.
- No authentication, billing, database, background queue, or cloud storage.
- Large or complex PDFs may take time while Marker runs.
- Output quality depends on Marker and the source PDF quality.

## Fastest First Payday Plan

The first sellable version is a local/private demo that converts PDFs to Markdown and supports manual delivery if needed. Use it to charge for converting messy PDFs, research reports, manuals, policy documents, and technical docs into clean AI-ready Markdown or structured content.

Do not build payment infrastructure yet. The fastest monetization path is to demo the conversion workflow, run customer files locally, deliver the cleaned Markdown or structured output, and charge for the document cleanup service.

## Next Commercial Features to Add Later

- Batch PDF conversion.
- Better output packaging, such as Markdown plus extracted metadata.
- Optional structured formats like JSON sections, tables, or summaries.
- Customer-ready export bundles.
- A simple job history once repeated usage demands it.
- Payment and accounts only after the manual workflow proves demand.

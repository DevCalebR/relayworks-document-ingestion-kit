# DocForge AI

DocForge AI converts PDFs into clean, AI-ready Markdown. The current product is a local/private-demo MVP designed to get to a first paid customer quickly: upload PDFs, run Marker locally, preview or download Markdown, convert batches to ZIP files, and capture bulk-conversion leads for manual follow-up.

No auth, billing, database, queue, Docker, cloud storage, or hosted deployment is required for the current version.

## Current Features

- Single PDF to Markdown conversion.
- Batch PDF conversion to a downloadable ZIP.
- Markdown preview, copy, download, word count, and character count.
- Batch summary with successful and failed files.
- Local lead capture for bulk conversion requests.
- Commercial landing page with use cases, pricing placeholders, and CTAs.

## Local Setup

Create or activate the Python environment where Marker is installed:

```bash
cd /Users/caleb/Documents/docforge-ai
source .venv/bin/activate
```

If your Marker virtual environment lives somewhere else, activate that environment instead. The backend only requires that `marker_single` is available in the active shell.

Install backend requirements and start FastAPI:

```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Start the frontend in a second terminal:

```bash
cd /Users/caleb/Documents/docforge-ai/frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Single Conversion Flow

1. Open `http://localhost:3000`.
2. Click `Convert a PDF`.
3. Choose one PDF in `Single PDF` mode.
4. Click `Convert PDF`.
5. Verify the Markdown preview, word count, and character count.
6. Use `Copy Markdown` or `Download Markdown`.
7. Click `Reset / New conversion` to start over.

Backend endpoint:

```bash
curl -F "file=@sample.pdf" http://localhost:8000/convert
```

## Batch Conversion Flow

1. Open `http://localhost:3000`.
2. Go to the converter and choose `Batch PDFs`.
3. Select multiple PDF files.
4. Click `Convert Batch`.
5. The browser downloads a ZIP containing generated Markdown files and `_summary.json`.
6. Review the on-page summary for successful and failed files.

Backend endpoint:

```bash
curl -o docforge-batch.zip \
  -F "files=@sample-a.pdf" \
  -F "files=@sample-b.pdf" \
  http://localhost:8000/convert-batch
```

## Lead Capture Flow

1. Open `http://localhost:3000`.
2. Click `Request bulk conversion`.
3. Submit the form with name, email, document count, document type, and message.
4. The backend appends the lead to `storage/leads/leads.jsonl`.

Backend endpoint:

```bash
curl -X POST http://localhost:8000/lead \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "company": "Example Co",
    "document_count": "25",
    "document_type": "Technical manuals",
    "message": "We need clean Markdown for an AI knowledge base."
  }'
```

## Local Storage

Local files are intentionally ignored by git:

- `storage/uploads/`
- `storage/output/`
- `storage/zips/`
- `storage/leads/`

These folders may contain customer documents, generated Markdown, ZIP exports, and lead details.

## Fastest First Payday Strategy

Sell the service before building the full SaaS. Use this local/private demo to show PDF to Markdown conversion live, then charge for converting messy PDFs, reports, manuals, research papers, and document sets into clean AI-ready Markdown or structured content.

The most practical first offer:

- Free demo for one representative PDF.
- Paid manual conversion service for a batch of customer documents.
- Manual delivery by ZIP, shared folder, or email.
- SaaS account, billing, storage, and job history only after repeated demand is proven.

## API Keys and Services Needed for Hosted Version

None of these are required now.

| Service | Why we need it | When to set it up | Required now? |
| --- | --- | --- | --- |
| Supabase project URL/key | Database for users, jobs, lead records, and auth when the product becomes hosted. | After manual paid conversions prove repeat demand. | Later |
| Cloudflare R2 or S3 credentials | Durable storage for uploaded PDFs, generated Markdown, and ZIP exports. | Before accepting customer files in a hosted app. | Later |
| Upstash Redis URL/token | Queue and job state for longer batch conversions. | When conversions should run in the background instead of blocking requests. | Later |
| Stripe secret/public keys | Billing for subscriptions, credits, or paid conversion jobs. | After pricing is validated manually. | Later |
| Resend API key | Transactional emails for lead notifications, job completion, and file delivery. | When manual checking of `leads.jsonl` becomes a bottleneck. | Later |
| Vercel project | Hosted frontend for the public marketing/converter experience. | When ready to share beyond local demos. | Later |
| Render/Railway/Fly backend/worker deployment | Hosted FastAPI and conversion worker runtime. | When customer uploads need to run outside your laptop. | Later |

## Current MVP Limitations

- Local/private-demo only.
- Marker runs synchronously inside each request.
- Batch conversion processes files one by one.
- No auth, billing, database, hosted storage, background worker, or admin dashboard.
- Large or complex PDFs may take several minutes.
- Output quality depends on Marker and source PDF quality.
- Leads are saved locally and must be followed up manually.

## Next Commercial Features to Add Later

- Batch job history and lead review screen.
- ZIP export options with Markdown, metadata, and structured JSON.
- Email notification when a bulk lead submits.
- Hosted storage and background jobs.
- Payment only after the manual conversion service sells.

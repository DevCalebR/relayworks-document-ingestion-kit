# RelayWorks Backend

FastAPI backend for the RelayWorks document processing platform.

## Service Layout

```text
main.py
  routes and request orchestration
services/
  parser.py
    validates PDFs, calls Marker, returns the normalized Document model
  transformer.py
    applies rule-based templates and derives Markdown, HTML, JSON, and text
  exporter.py
    writes downloadable outputs, goal deliverables, reports, image ZIPs, and full packages
  preview.py
    shapes metadata, pipeline, images, and report data for the frontend
  models.py
    dataclasses for Document, TransformedDocument, and exports
```

## Start

From the repo root:

```bash
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

## API

### `POST /convert`

Accepts one PDF upload as multipart form field `file`, processes the document, and returns:

- Metadata summary
- Pipeline status
- Markdown
- Clean HTML
- Structured JSON
- Plain text
- Extracted image list
- Report and download links

Example:

```bash
curl -F "file=@sample.pdf" \
  "http://localhost:8000/convert?template=knowledge_base"
```

### `POST /convert-batch`

Accepts multiple PDFs as multipart form field `files` and returns a ZIP with generated Markdown, HTML, JSON, text, selected goal outputs, reports, `batch-processing-report.md`, and `_summary.json`.

Example:

```bash
curl -o relayworks-batch.zip \
  -F "files=@sample-a.pdf" \
  -F "files=@sample-b.pdf" \
  http://localhost:8000/convert-batch
```

### `GET /download/{job_id}/{download_type}`

Supported download types:

- `markdown`
- `html`
- `json`
- `text`
- `report`
- `package`
- `images.zip`

### `GET /download/{job_id}/images/{filename}`

Returns an extracted image from a completed job.

### `POST /lead`

Saves a bulk conversion lead to `storage/leads/leads.jsonl`.

Payload fields:

- `name`
- `email`
- `company`
- `document_count`
- `document_type`
- `goal`
- `urgency`
- `message`

### `GET /leads`

Returns saved quote requests for the local/private-demo lead review view. This is intentionally unauthenticated for the manual demo workflow and should not be exposed as a hosted public admin surface.

## Notes

- Uploads are saved to `storage/uploads/`.
- Processed output is written to unique folders under `storage/output/`.
- ZIP files are saved to `storage/zips/`.
- Bulk conversion leads are appended to `storage/leads/leads.jsonl`.
- CORS is configured for `http://localhost:3000`.

# RelayWorks Backend

FastAPI backend for the RelayWorks document processing platform.

## Service Layout

```text
main.py
  routes and request orchestration
services/
  jobs.py
    stores local background job metadata and recovers interrupted jobs
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

### `POST /jobs/convert`

Recommended single-document workflow. Accepts one PDF upload as multipart form field `file`, saves it locally, creates a background job, and returns immediately with HTTP `202`.

Response fields include:

- `job_id`
- `status`
- `stage`
- `message`
- `status_url`

Example:

```bash
curl -F "file=@sample.pdf" \
  "http://localhost:8000/jobs/convert?template=knowledge_base"
```

### `GET /jobs/{job_id}`

Returns current job metadata, including `queued`, `processing`, `completed`, or `failed` status. The frontend polls this endpoint about every two seconds and stops when the job reaches `completed` or `failed`.

Completed jobs include `available_downloads` and the same preview payload previously returned by `/convert` under `result`.

### `GET /jobs/{job_id}/downloads`

Returns the available download options for a completed job.

### `POST /convert`

Legacy blocking single-document workflow for small PDFs and compatibility testing.

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
- Background job metadata is saved as one JSON file per job under `storage/jobs/`.
- Bulk conversion leads are appended to `storage/leads/leads.jsonl`.
- CORS is configured for `http://localhost:3000`.
- `MARKER_TIMEOUT_SECONDS` controls the Marker subprocess safety limit. It is not an HTTP request timeout.
- `CONVERSION_CONCURRENCY` controls the local background worker pool and defaults to `1`.
- `MAX_UPLOAD_SIZE_MB` controls the local PDF upload safety limit and defaults to `100`.
- Queued or processing jobs found after a backend restart are marked failed with an interrupted message so the UI does not report work that is no longer running.

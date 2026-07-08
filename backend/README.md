# DocForge AI Backend

FastAPI backend for the local DocForge AI MVP.

## Start

From the repo root:

```bash
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

## API

### `POST /convert`

Accepts one PDF upload as multipart form field `file`, runs Marker locally, and returns the generated Markdown.

Example:

```bash
curl -F "file=@sample.pdf" http://localhost:8000/convert
```

### `POST /convert-batch`

Accepts multiple PDFs as multipart form field `files`, runs Marker for each file, and returns a ZIP with generated Markdown files plus `_summary.json`.

Example:

```bash
curl -o docforge-batch.zip \
  -F "files=@sample-a.pdf" \
  -F "files=@sample-b.pdf" \
  http://localhost:8000/convert-batch
```

### `POST /lead`

Saves a bulk conversion lead to `storage/leads/leads.jsonl`.

## Notes

- Uploads are saved to `storage/uploads/`.
- Marker output is written to unique folders under `storage/output/`.
- Batch ZIP files are saved to `storage/zips/`.
- Bulk conversion leads are appended to `storage/leads/leads.jsonl`.
- CORS is configured for `http://localhost:3000`.

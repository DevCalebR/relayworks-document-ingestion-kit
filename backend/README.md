# DocForge AI Backend

FastAPI backend for the local DocForge AI MVP.

## Start

From the repo root:

```bash
source /Users/caleb/docforge-ai/.venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

## API

`POST /convert`

Accepts one PDF upload as multipart form field `file`, runs Marker locally, and returns the generated Markdown.

Example:

```bash
curl -F "file=@sample.pdf" http://localhost:8000/convert
```

## Notes

- Uploads are saved to `storage/uploads/`.
- Marker output is written to unique folders under `storage/output/`.
- CORS is configured for `http://localhost:3000`.

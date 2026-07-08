from pathlib import Path
import re
import subprocess
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse


app = FastAPI(title="DocForge AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REPO_ROOT = Path(__file__).resolve().parents[1]
UPLOAD_DIR = REPO_ROOT / "storage" / "uploads"
OUTPUT_DIR = REPO_ROOT / "storage" / "output"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_, exc: RequestValidationError):
    missing_file = any(
        error.get("type") == "missing" and "file" in error.get("loc", [])
        for error in exc.errors()
    )
    if missing_file:
        return JSONResponse(
            status_code=400,
            content={"detail": "Please upload one PDF file using the form field 'file'."},
        )
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


def safe_filename(filename: str) -> str:
    name = Path(filename or "upload.pdf").name
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("._")
    return name or "upload.pdf"


def clean_process_output(value: str | None, limit: int = 4000) -> str:
    if not value:
        return ""
    value = value.strip()
    if len(value) <= limit:
        return value
    return value[-limit:]


def validate_pdf(file: UploadFile) -> None:
    filename = file.filename or ""
    content_type = file.content_type or ""
    if not filename.lower().endswith(".pdf") and content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF file. DocForge AI currently accepts .pdf files only.",
        )


@app.post("/convert")
async def convert(file: UploadFile = File(...)):
    if file is None:
        raise HTTPException(status_code=400, detail="Please upload one PDF file.")

    validate_pdf(file)

    original_name = safe_filename(file.filename or "upload.pdf")
    job_id = uuid4().hex
    upload_path = UPLOAD_DIR / f"{job_id}_{original_name}"
    job_output_dir = OUTPUT_DIR / job_id
    job_output_dir.mkdir(parents=True, exist_ok=True)

    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="The uploaded PDF is empty.")
        upload_path.write_bytes(contents)

        result = subprocess.run(
            ["marker_single", str(upload_path), "--output_dir", str(job_output_dir)],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            timeout=300,
            check=False,
        )

        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail={
                    "message": "Marker failed to convert this PDF.",
                    "stdout": clean_process_output(result.stdout),
                    "stderr": clean_process_output(result.stderr),
                },
            )

        markdown_files = sorted(job_output_dir.rglob("*.md"))
        if not markdown_files:
            raise HTTPException(
                status_code=500,
                detail={
                    "message": "Marker finished, but no Markdown file was found.",
                    "stdout": clean_process_output(result.stdout),
                    "stderr": clean_process_output(result.stderr),
                },
            )

        markdown = markdown_files[0].read_text(encoding="utf-8")
        download_name = f"{Path(original_name).stem}.md"

        return {
            "success": True,
            "filename": original_name,
            "markdown": markdown,
            "download_name": download_name,
        }
    except HTTPException:
        raise
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(
            status_code=504,
            detail={
                "message": "Marker took too long to convert this PDF.",
                "stdout": clean_process_output(exc.stdout),
                "stderr": clean_process_output(exc.stderr),
            },
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Conversion failed unexpectedly: {exc}",
        ) from exc

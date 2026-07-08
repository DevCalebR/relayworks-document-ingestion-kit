from datetime import datetime, timezone
import json
from pathlib import Path
import re
import subprocess
from uuid import uuid4
from zipfile import ZIP_DEFLATED, ZipFile

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field, field_validator


app = FastAPI(title="DocForge AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-DocForge-Summary"],
)

REPO_ROOT = Path(__file__).resolve().parents[1]
UPLOAD_DIR = REPO_ROOT / "storage" / "uploads"
OUTPUT_DIR = REPO_ROOT / "storage" / "output"
ZIP_DIR = REPO_ROOT / "storage" / "zips"
LEADS_DIR = REPO_ROOT / "storage" / "leads"
LEADS_FILE = LEADS_DIR / "leads.jsonl"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
ZIP_DIR.mkdir(parents=True, exist_ok=True)
LEADS_DIR.mkdir(parents=True, exist_ok=True)


class LeadRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=254)
    company: str | None = Field(default=None, max_length=160)
    document_count: str = Field(min_length=1, max_length=80)
    document_type: str = Field(min_length=1, max_length=120)
    message: str = Field(min_length=1, max_length=2000)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        value = value.strip()
        if "@" not in value or "." not in value.rsplit("@", 1)[-1]:
            raise ValueError("Enter a valid email address.")
        return value


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_, exc: RequestValidationError):
    missing_file = False
    missing_files = False
    for error in exc.errors():
        loc = error.get("loc", [])
        if error.get("type") == "missing" and "file" in loc:
            missing_file = True
        if error.get("type") == "missing" and "files" in loc:
            missing_files = True
    if missing_file:
        return JSONResponse(
            status_code=400,
            content={"detail": "Please upload one PDF file using the form field 'file'."},
        )
    if missing_files:
        return JSONResponse(
            status_code=400,
            content={"detail": "Please upload one or more PDF files using the form field 'files'."},
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


async def convert_upload_to_markdown(file: UploadFile, job_id: str) -> dict:
    validate_pdf(file)

    original_name = safe_filename(file.filename or "upload.pdf")
    upload_path = UPLOAD_DIR / f"{job_id}_{original_name}"
    job_output_dir = OUTPUT_DIR / job_id
    job_output_dir.mkdir(parents=True, exist_ok=True)

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
        "markdown_path": markdown_files[0],
    }


def detail_to_text(detail: object) -> str:
    if isinstance(detail, str):
        return detail
    if isinstance(detail, dict):
        message = str(detail.get("message", "Conversion failed."))
        stderr = clean_process_output(str(detail.get("stderr", "")))
        stdout = clean_process_output(str(detail.get("stdout", "")))
        parts = [message]
        if stderr:
            parts.append(f"stderr: {stderr}")
        if stdout:
            parts.append(f"stdout: {stdout}")
        return "\n\n".join(parts)
    return "Conversion failed."


@app.post("/convert")
async def convert(file: UploadFile = File(...)):
    if file is None:
        raise HTTPException(status_code=400, detail="Please upload one PDF file.")

    try:
        result = await convert_upload_to_markdown(file, uuid4().hex)
        return {
            "success": True,
            "filename": result["filename"],
            "markdown": result["markdown"],
            "download_name": result["download_name"],
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


@app.post("/convert-batch")
async def convert_batch(files: list[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="Please upload at least one PDF file.")

    batch_id = uuid4().hex
    zip_path = ZIP_DIR / f"docforge-batch-{batch_id}.zip"
    successes: list[dict] = []
    failures: list[dict] = []

    for index, file in enumerate(files, start=1):
        input_name = safe_filename(file.filename or f"upload-{index}.pdf")
        try:
            result = await convert_upload_to_markdown(file, f"{batch_id}_{index}")
            successes.append(
                {
                    "filename": result["filename"],
                    "download_name": result["download_name"],
                    "markdown_path": result["markdown_path"],
                }
            )
        except subprocess.TimeoutExpired as exc:
            failures.append(
                {
                    "filename": input_name,
                    "error": detail_to_text(
                        {
                            "message": "Marker took too long to convert this PDF.",
                            "stdout": clean_process_output(exc.stdout),
                            "stderr": clean_process_output(exc.stderr),
                        }
                    ),
                }
            )
        except HTTPException as exc:
            failures.append({"filename": input_name, "error": detail_to_text(exc.detail)})
        except Exception as exc:
            failures.append(
                {
                    "filename": input_name,
                    "error": f"Conversion failed unexpectedly: {exc}",
                }
            )

    summary = {
        "batch_id": batch_id,
        "total_files": len(files),
        "successful_files": len(successes),
        "failed_files": len(failures),
        "filenames": [safe_filename(file.filename or "upload.pdf") for file in files],
        "errors": failures,
    }

    used_names: set[str] = set()
    with ZipFile(zip_path, "w", compression=ZIP_DEFLATED) as zip_file:
        for success in successes:
            arcname = success["download_name"]
            if arcname in used_names:
                stem = Path(arcname).stem
                arcname = f"{stem}-{len(used_names) + 1}.md"
            used_names.add(arcname)
            zip_file.write(success["markdown_path"], arcname)
        zip_file.writestr("_summary.json", json.dumps(summary, indent=2))

    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename=f"docforge-markdown-{batch_id}.zip",
        headers={"X-DocForge-Summary": json.dumps(summary)},
    )


@app.post("/lead")
async def create_lead(lead: LeadRequest):
    record = {
        "id": uuid4().hex,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "name": lead.name.strip(),
        "email": lead.email,
        "company": (lead.company or "").strip(),
        "document_count": lead.document_count.strip(),
        "document_type": lead.document_type.strip(),
        "message": lead.message.strip(),
    }

    with LEADS_FILE.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record) + "\n")

    return {
        "success": True,
        "message": "Bulk conversion request saved locally.",
        "lead_id": record["id"],
    }

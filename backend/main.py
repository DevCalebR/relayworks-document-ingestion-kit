from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
from uuid import uuid4
from zipfile import ZIP_DEFLATED, ZipFile

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field, field_validator

from backend.services.exporter import (
    MEDIA_TYPES,
    write_download_package,
    write_exports,
    write_images_zip,
    write_report,
)
from backend.services.models import OutputFormat, TemplateKey
from backend.services.parser import clean_process_output, detail_to_text, parse_upload_with_marker, safe_filename
from backend.services.preview import build_preview_response
from backend.services.transformer import transform_document


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

SUPPORTED_DOWNLOADS = {"markdown", "html", "json", "text", "report", "package", "images.zip"}


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


async def process_upload(file: UploadFile, job_id: str, template: TemplateKey = "general_markdown") -> dict:
    document = await parse_upload_with_marker(file, job_id, REPO_ROOT, UPLOAD_DIR, OUTPUT_DIR)
    transformed = transform_document(document, template)
    export_dir = OUTPUT_DIR / job_id / "exports"
    exports = write_exports(transformed, document.metadata.filename, job_id, export_dir)
    report = write_report(transformed, document.metadata.filename, job_id, export_dir)
    images_zip = write_images_zip(job_id, document.images, ZIP_DIR)
    package = write_download_package(job_id, exports, report, document.images, ZIP_DIR)
    return {
        "document": document,
        "transformed": transformed,
        "exports": exports,
        "report": report,
        "images_zip": images_zip,
        "package": package,
        "preview": build_preview_response(document, transformed, exports, report, images_zip, package),
    }


@app.post("/convert")
async def convert(file: UploadFile = File(...), template: TemplateKey = "general_markdown"):
    if file is None:
        raise HTTPException(status_code=400, detail="Please upload one PDF file.")

    try:
        result = await process_upload(file, uuid4().hex, template)
        return result["preview"]
    except HTTPException:
        raise
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(
            status_code=504,
            detail={
                "message": "Document processing took too long for this file.",
                "stdout": clean_process_output(exc.stdout),
                "stderr": clean_process_output(exc.stderr),
            },
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Document processing failed unexpectedly: {exc}",
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
            result = await process_upload(file, f"{batch_id}_{index}")
            exports = result["exports"]
            successes.append(
                {
                    "filename": result["document"].metadata.filename,
                    "download_name": exports["markdown"].filename,
                    "markdown_path": exports["markdown"].path,
                    "json_path": exports["json"].path,
                    "html_path": exports["html"].path,
                    "text_path": exports["text"].path,
                    "report_path": result["report"].path,
                }
            )
        except subprocess.TimeoutExpired as exc:
            failures.append(
                {
                    "filename": input_name,
                    "error": detail_to_text(
                        {
                            "message": "Document processing took too long for this file.",
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
                    "error": f"Document processing failed unexpectedly: {exc}",
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
            base = Path(success["download_name"]).stem
            for path_key, folder in [
                ("markdown_path", "markdown"),
                ("json_path", "json"),
                ("html_path", "html"),
                ("text_path", "text"),
                ("report_path", "reports"),
            ]:
                output_path = Path(success[path_key])
                arcname = f"{folder}/{output_path.name}"
                if arcname in used_names:
                    arcname = f"{folder}/{base}-{len(used_names) + 1}{output_path.suffix}"
                used_names.add(arcname)
                zip_file.write(output_path, arcname)
        zip_file.writestr("_summary.json", json.dumps(summary, indent=2))

    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename=f"docforge-documents-{batch_id}.zip",
        headers={"X-DocForge-Summary": json.dumps(summary)},
    )


@app.get("/download/{job_id}/{download_type}")
async def download_output(job_id: str, download_type: str):
    if not job_id.replace("_", "").isalnum() or download_type not in SUPPORTED_DOWNLOADS:
        raise HTTPException(status_code=404, detail="Download not found.")

    if download_type == "package":
        path = ZIP_DIR / f"docforge-package-{job_id}.zip"
        return FileResponse(path, media_type="application/zip", filename=path.name)
    if download_type == "images.zip":
        path = ZIP_DIR / f"docforge-images-{job_id}.zip"
        return FileResponse(path, media_type="application/zip", filename=path.name)

    export_dir = OUTPUT_DIR / job_id / "exports"
    if download_type == "report":
        matches = sorted(export_dir.glob("*-processing-report.txt"))
        media_type = "text/plain; charset=utf-8"
    else:
        extension = {"markdown": "md", "html": "html", "json": "json", "text": "txt"}[download_type]
        matches = sorted(export_dir.glob(f"*.{extension}"))
        media_type = MEDIA_TYPES[download_type]

    if not matches:
        raise HTTPException(status_code=404, detail="Download not found.")
    return FileResponse(matches[0], media_type=media_type, filename=matches[0].name)


@app.get("/download/{job_id}/images/{filename}")
async def download_image(job_id: str, filename: str):
    if not job_id.replace("_", "").isalnum():
        raise HTTPException(status_code=404, detail="Image not found.")
    safe_name = safe_filename(filename)
    matches = sorted((OUTPUT_DIR / job_id).rglob(safe_name))
    if not matches:
        raise HTTPException(status_code=404, detail="Image not found.")
    return FileResponse(matches[0], filename=safe_name)


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

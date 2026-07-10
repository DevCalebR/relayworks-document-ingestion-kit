from __future__ import annotations

from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
from typing import Any, Literal

from .models import TemplateKey


JobStatus = Literal["queued", "processing", "completed", "failed"]
JobStage = Literal[
    "queued",
    "preparing",
    "parsing",
    "transforming",
    "exporting",
    "packaging",
    "completed",
    "failed",
]

ACTIVE_STATUSES = {"queued", "processing"}
TERMINAL_STATUSES = {"completed", "failed"}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def safe_error_message(value: object, limit: int = 1200) -> str:
    if not value:
        return "Conversion failed."
    message = str(value).strip()
    if not message:
        return "Conversion failed."
    if "Traceback (most recent call last):" in message:
        message = message.split("Traceback (most recent call last):", 1)[0].strip()
        message = f"{message}\n\nProcess output included a traceback that was omitted.".strip()
    message = re.sub(r'^\s*File ".*", line \d+.*$', "Process stack frame omitted.", message, flags=re.MULTILINE)
    return message[:limit]


class JobStore:
    def __init__(self, jobs_dir: Path, process_id: int | None = None) -> None:
        self.jobs_dir = jobs_dir
        self.process_id = process_id or os.getpid()
        self.jobs_dir.mkdir(parents=True, exist_ok=True)

    def metadata_path(self, job_id: str) -> Path:
        if not job_id.replace("_", "").isalnum():
            raise ValueError("Invalid job id.")
        return self.jobs_dir / f"{job_id}.json"

    def create(self, job_id: str, filename: str, template: TemplateKey, upload_path: Path, output_dir: Path) -> dict[str, Any]:
        now = utc_now()
        job = {
            "job_id": job_id,
            "filename": filename,
            "template": template,
            "status": "queued",
            "stage": "queued",
            "message": "Upload accepted. Waiting for a local conversion slot.",
            "created_at": now,
            "started_at": None,
            "completed_at": None,
            "error": None,
            "upload_path": str(upload_path),
            "output_dir": str(output_dir),
            "available_downloads": [],
            "result": None,
            "process_id": self.process_id,
            "status_url": f"/jobs/{job_id}",
        }
        self.write(job)
        return job

    def read(self, job_id: str) -> dict[str, Any] | None:
        path = self.metadata_path(job_id)
        if not path.exists():
            return None
        try:
            job = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return None
        if job.get("status") in ACTIVE_STATUSES and job.get("process_id") != self.process_id:
            job = self.mark_interrupted(job, "The conversion process was interrupted by a backend restart.")
        return job

    def write(self, job: dict[str, Any]) -> None:
        path = self.metadata_path(str(job["job_id"]))
        tmp_path = path.with_suffix(".json.tmp")
        tmp_path.write_text(json.dumps(job, indent=2, sort_keys=True), encoding="utf-8")
        tmp_path.replace(path)

    def update(self, job_id: str, **changes: Any) -> dict[str, Any]:
        job = self.read(job_id)
        if not job:
            raise KeyError(job_id)
        job.update(changes)
        self.write(job)
        return job

    def mark_processing(self, job_id: str, stage: JobStage, message: str) -> dict[str, Any]:
        job = self.read(job_id)
        if not job:
            raise KeyError(job_id)
        if not job.get("started_at"):
            job["started_at"] = utc_now()
        job.update(
            {
                "status": "processing",
                "stage": stage,
                "message": message,
                "process_id": self.process_id,
            }
        )
        self.write(job)
        return job

    def mark_completed(self, job_id: str, result: dict[str, Any], downloads: list[dict[str, Any]]) -> dict[str, Any]:
        return self.update(
            job_id,
            status="completed",
            stage="completed",
            message="Document package is ready.",
            completed_at=utc_now(),
            error=None,
            result=result,
            available_downloads=downloads,
        )

    def mark_failed(self, job_id: str, message: str) -> dict[str, Any]:
        return self.update(
            job_id,
            status="failed",
            stage="failed",
            message=safe_error_message(message),
            completed_at=utc_now(),
            error=safe_error_message(message),
        )

    def mark_interrupted(self, job: dict[str, Any], message: str) -> dict[str, Any]:
        job.update(
            {
                "status": "failed",
                "stage": "failed",
                "message": message,
                "completed_at": job.get("completed_at") or utc_now(),
                "error": message,
            }
        )
        self.write(job)
        return job

    def recover_interrupted(self) -> None:
        for path in self.jobs_dir.glob("*.json"):
            try:
                job = json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue
            if job.get("status") in ACTIVE_STATUSES:
                self.mark_interrupted(job, "The conversion process was interrupted by a backend restart.")


def available_downloads_from_result(result: dict[str, Any]) -> list[dict[str, Any]]:
    downloads: list[dict[str, Any]] = []
    for download_type, exported in result.get("exports", {}).items():
        downloads.append(
            {
                "type": download_type,
                "filename": exported["filename"],
                "size_bytes": exported["size_bytes"],
                "url": exported["url"],
            }
        )
    report = result.get("report", {}).get("download")
    if report:
        downloads.append({"type": "report", **report})
    images_zip = result.get("images_zip")
    if images_zip:
        downloads.append({"type": "images.zip", **images_zip})
    package = result.get("package")
    if package:
        downloads.append({"type": "package", **package})
    return downloads

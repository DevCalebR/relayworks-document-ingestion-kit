from datetime import datetime, timezone
import os
from pathlib import Path
import re
import subprocess
import time

from fastapi import HTTPException, UploadFile

from .models import Document, DocumentImage, DocumentMetadata, DocumentSection


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


def validate_pdf(file: UploadFile) -> None:
    filename = file.filename or ""
    content_type = file.content_type or ""
    if not filename.lower().endswith(".pdf") and content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF file. RelayWorks currently accepts .pdf files only.",
        )


def marker_timeout_seconds() -> int:
    value = os.getenv("MARKER_TIMEOUT_SECONDS", "3600")
    try:
        timeout = int(value)
    except ValueError:
        return 3600
    return max(timeout, 1)


def marker_command() -> str:
    return os.getenv("MARKER_COMMAND", "marker_single")


def estimate_pdf_pages(contents: bytes) -> int:
    matches = re.findall(rb"/Type\s*/Page\b", contents)
    return max(len(matches), 1)


def normalize_markdown(markdown: str) -> dict[str, list]:
    headings: list[str] = []
    paragraphs: list[str] = []
    tables: list[str] = []
    lists: list[str] = []
    code_blocks: list[str] = []
    footnotes: list[str] = []
    sections: list[DocumentSection] = []

    lines = markdown.splitlines()
    in_code = False
    code_buffer: list[str] = []
    paragraph_buffer: list[str] = []
    table_buffer: list[str] = []
    list_buffer: list[str] = []
    current_section: DocumentSection | None = None
    current_content: list[str] = []

    def flush_paragraph() -> None:
        nonlocal paragraph_buffer
        if paragraph_buffer:
            paragraphs.append(" ".join(paragraph_buffer).strip())
            paragraph_buffer = []

    def flush_table() -> None:
        nonlocal table_buffer
        if table_buffer:
            tables.append("\n".join(table_buffer))
            table_buffer = []

    def flush_list() -> None:
        nonlocal list_buffer
        if list_buffer:
            lists.append("\n".join(list_buffer))
            list_buffer = []

    def flush_section() -> None:
        nonlocal current_section, current_content
        if current_section:
            current_section.content = "\n".join(current_content).strip()
            sections.append(current_section)
        current_section = None
        current_content = []

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("```"):
            if in_code:
                code_blocks.append("\n".join(code_buffer))
                code_buffer = []
                in_code = False
            else:
                flush_paragraph()
                flush_table()
                flush_list()
                in_code = True
            continue

        if in_code:
            code_buffer.append(line)
            continue

        if current_section and stripped:
            current_content.append(line)

        heading_match = re.match(r"^(#{1,6})\s+(.+)$", stripped)
        if heading_match:
            flush_paragraph()
            flush_table()
            flush_list()
            flush_section()
            title = heading_match.group(2).strip()
            headings.append(title)
            current_section = DocumentSection(
                level=len(heading_match.group(1)),
                title=title,
                content="",
            )
            continue

        if re.match(r"^\[\^[^\]]+\]:", stripped):
            flush_paragraph()
            footnotes.append(stripped)
            continue

        if "|" in stripped and stripped.startswith("|"):
            flush_paragraph()
            flush_list()
            table_buffer.append(line)
            continue

        if re.match(r"^(\s*)([-*+]|\d+\.)\s+", line):
            flush_paragraph()
            flush_table()
            list_buffer.append(line)
            continue

        if not stripped:
            flush_paragraph()
            flush_table()
            flush_list()
            continue

        flush_table()
        flush_list()
        paragraph_buffer.append(stripped)

    flush_paragraph()
    flush_table()
    flush_list()
    flush_section()

    return {
        "headings": headings,
        "paragraphs": paragraphs,
        "tables": tables,
        "lists": lists,
        "code_blocks": code_blocks,
        "footnotes": footnotes,
        "sections": sections,
    }


def collect_images(job_output_dir: Path, job_id: str) -> list[DocumentImage]:
    image_paths = sorted(
        path
        for path in job_output_dir.rglob("*")
        if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".gif"}
    )
    images: list[DocumentImage] = []
    for path in image_paths:
        filename = path.name
        images.append(
            DocumentImage(
                filename=filename,
                path=str(path),
                size_bytes=path.stat().st_size,
                url=f"/download/{job_id}/images/{filename}",
            )
        )
    return images


def parse_pdf_with_marker(
    upload_path: Path,
    original_name: str,
    job_id: str,
    repo_root: Path,
    output_dir: Path,
    contents: bytes | None = None,
) -> Document:
    job_output_dir = output_dir / job_id
    job_output_dir.mkdir(parents=True, exist_ok=True)

    contents = contents if contents is not None else upload_path.read_bytes()
    if not contents:
        raise HTTPException(status_code=400, detail="The uploaded PDF is empty.")

    started = time.perf_counter()
    result = subprocess.run(
        [marker_command(), str(upload_path), "--output_dir", str(job_output_dir)],
        cwd=repo_root,
        capture_output=True,
        text=True,
        timeout=marker_timeout_seconds(),
        check=False,
    )
    elapsed = time.perf_counter() - started

    if result.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Document processing could not complete for this file.",
                "stdout": clean_process_output(result.stdout),
                "stderr": clean_process_output(result.stderr),
            },
        )

    markdown_files = sorted(job_output_dir.rglob("*.md"))
    if not markdown_files:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Document processing completed but no AI-ready content was generated.",
                "stdout": clean_process_output(result.stdout),
                "stderr": clean_process_output(result.stderr),
            },
        )

    markdown_path = markdown_files[0]
    markdown = markdown_path.read_text(encoding="utf-8")
    normalized = normalize_markdown(markdown)
    page_count = estimate_pdf_pages(contents)

    return Document(
        metadata=DocumentMetadata(
            job_id=job_id,
            filename=original_name,
            source_path=str(upload_path),
            page_count=page_count,
            conversion_time_seconds=elapsed,
            output_size_bytes=len(markdown.encode("utf-8")),
            created_at=datetime.now(timezone.utc).isoformat(),
        ),
        markdown=markdown,
        pages=[{"number": page, "content": ""} for page in range(1, page_count + 1)],
        sections=normalized["sections"],
        headings=normalized["headings"],
        paragraphs=normalized["paragraphs"],
        tables=normalized["tables"],
        images=collect_images(job_output_dir, job_id),
        lists=normalized["lists"],
        code_blocks=normalized["code_blocks"],
        footnotes=normalized["footnotes"],
    )


async def parse_upload_with_marker(
    file: UploadFile,
    job_id: str,
    repo_root: Path,
    upload_dir: Path,
    output_dir: Path,
) -> Document:
    validate_pdf(file)

    original_name = safe_filename(file.filename or "upload.pdf")
    upload_path = upload_dir / f"{job_id}_{original_name}"

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="The uploaded PDF is empty.")
    upload_path.write_bytes(contents)

    return parse_pdf_with_marker(upload_path, original_name, job_id, repo_root, output_dir, contents)

import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from .models import ExportedFile, OutputFormat, TransformedDocument


MEDIA_TYPES: dict[str, str] = {
    "markdown": "text/markdown; charset=utf-8",
    "html": "text/html; charset=utf-8",
    "json": "application/json",
    "text": "text/plain; charset=utf-8",
}


EXTENSIONS: dict[OutputFormat, str] = {
    "markdown": "md",
    "html": "html",
    "json": "json",
    "text": "txt",
}


def slugify_stem(filename: str) -> str:
    stem = Path(filename).stem or "docforge-output"
    return "".join(char if char.isalnum() or char in {"-", "_"} else "-" for char in stem).strip("-")


def output_content(transformed: TransformedDocument, output_format: OutputFormat) -> str:
    if output_format == "markdown":
        return transformed.source_markdown
    if output_format == "html":
        return transformed.source_html
    if output_format == "json":
        return json.dumps(transformed.source_json_data, indent=2)
    if output_format == "text":
        return transformed.source_text
    raise ValueError(f"Unsupported output format: {output_format}")


def write_exports(
    transformed: TransformedDocument,
    filename: str,
    job_id: str,
    export_dir: Path,
) -> dict[OutputFormat, ExportedFile]:
    export_dir.mkdir(parents=True, exist_ok=True)
    stem = slugify_stem(filename)
    exports: dict[OutputFormat, ExportedFile] = {}

    for output_format, extension in EXTENSIONS.items():
        path = export_dir / f"{stem}.{extension}"
        path.write_text(output_content(transformed, output_format), encoding="utf-8")
        exports[output_format] = ExportedFile(
            format=output_format,
            filename=path.name,
            path=path,
            size_bytes=path.stat().st_size,
            url=f"/download/{job_id}/{output_format}",
        )
    return exports


def write_report(
    transformed: TransformedDocument,
    filename: str,
    job_id: str,
    export_dir: Path,
) -> ExportedFile:
    export_dir.mkdir(parents=True, exist_ok=True)
    stem = slugify_stem(filename)
    summary = transformed.summary
    lines = [
        "# DocForge AI Processing Report",
        "",
        "## Processing Summary",
        "",
        "- Successfully processed",
        f"- {summary['pages']} pages",
        f"- {summary['heading_count']} headings",
        f"- {summary['table_count']} tables",
        f"- {summary['image_count']} images",
        f"- {summary['word_count']} words",
        "",
        "## Generated Outputs",
        "",
        "- Markdown generated",
        "- Structured JSON generated",
        "- Clean HTML generated",
        "- Plain text generated",
        "- Selected goal output generated",
        "- Ready for AI workflows",
    ]
    path = export_dir / f"{stem}-processing-report.md"
    path.write_text("\n".join(lines), encoding="utf-8")
    return ExportedFile(
        format="text",
        filename=path.name,
        path=path,
        size_bytes=path.stat().st_size,
        url=f"/download/{job_id}/report",
    )


def write_images_zip(job_id: str, images: list, zip_dir: Path) -> ExportedFile | None:
    if not images:
        return None
    zip_dir.mkdir(parents=True, exist_ok=True)
    path = zip_dir / f"docforge-images-{job_id}.zip"
    with ZipFile(path, "w", compression=ZIP_DEFLATED) as zip_file:
        for image in images:
            image_path = Path(image.path)
            if image_path.exists():
                zip_file.write(image_path, image.filename)
    return ExportedFile(
        format="text",
        filename=path.name,
        path=path,
        size_bytes=path.stat().st_size,
        url=f"/download/{job_id}/images.zip",
    )


def write_download_package(
    job_id: str,
    exports: dict[OutputFormat, ExportedFile],
    report: ExportedFile,
    goal_output: ExportedFile,
    images: list,
    zip_dir: Path,
) -> ExportedFile:
    zip_dir.mkdir(parents=True, exist_ok=True)
    path = zip_dir / f"docforge-package-{job_id}.zip"
    with ZipFile(path, "w", compression=ZIP_DEFLATED) as zip_file:
        package_names = {
            "markdown": "document.md",
            "html": "document.html",
            "json": "document.json",
            "text": "document.txt",
        }
        for output_format, exported in exports.items():
            zip_file.write(exported.path, package_names[output_format])
        zip_file.write(goal_output.path, "selected-goal-output.md")
        zip_file.write(report.path, "processing-report.md")
        for image in images:
            image_path = Path(image.path)
            if image_path.exists():
                zip_file.write(image_path, f"images/{image.filename}")
    return ExportedFile(
        format="text",
        filename=path.name,
        path=path,
        size_bytes=path.stat().st_size,
        url=f"/download/{job_id}/package",
    )

def write_goal_output(transformed: TransformedDocument, export_dir: Path) -> ExportedFile:
    export_dir.mkdir(parents=True, exist_ok=True)
    path = export_dir / "selected-goal-output.md"
    path.write_text(transformed.markdown, encoding="utf-8")
    return ExportedFile(
        format="markdown",
        filename=path.name,
        path=path,
        size_bytes=path.stat().st_size,
        url="",
    )

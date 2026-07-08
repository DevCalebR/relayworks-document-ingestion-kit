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
        return transformed.markdown
    if output_format == "html":
        return transformed.html
    if output_format == "json":
        return json.dumps(transformed.json_data, indent=2)
    if output_format == "text":
        return transformed.text
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
        "DocForge AI Processing Report",
        "",
        "Successfully parsed",
        f"{summary['pages']} pages",
        f"{summary['heading_count']} headings",
        f"{summary['table_count']} tables",
        f"{summary['image_count']} images",
        f"{summary['word_count']} words",
        "",
        "Markdown generated",
        "JSON generated",
        "HTML generated",
        "Plain text generated",
        "Ready for AI workflows",
    ]
    path = export_dir / f"{stem}-processing-report.txt"
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
    images: list,
    zip_dir: Path,
) -> ExportedFile:
    zip_dir.mkdir(parents=True, exist_ok=True)
    path = zip_dir / f"docforge-package-{job_id}.zip"
    with ZipFile(path, "w", compression=ZIP_DEFLATED) as zip_file:
        for exported in exports.values():
            zip_file.write(exported.path, exported.filename)
        zip_file.write(report.path, report.filename)
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


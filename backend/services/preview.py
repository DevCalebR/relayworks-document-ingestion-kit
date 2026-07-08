from .models import Document, ExportedFile, OutputFormat, TransformedDocument


def format_export(exported: ExportedFile) -> dict:
    return {
        "format": exported.format,
        "filename": exported.filename,
        "size_bytes": exported.size_bytes,
        "url": exported.url,
    }


def pipeline_steps() -> list[dict[str, str]]:
    return [
        {"label": "Upload", "status": "complete"},
        {"label": "Parse", "status": "complete"},
        {"label": "Transform", "status": "complete"},
        {"label": "Export", "status": "complete"},
        {"label": "Complete", "status": "complete"},
    ]


def processing_report(summary: dict) -> str:
    return "\n".join(
        [
            "Successfully Parsed",
            f"{summary['pages']} pages",
            f"{summary['heading_count']} headings",
            f"{summary['table_count']} tables",
            f"{summary['image_count']} images",
            f"{summary['word_count']} words",
            "Markdown generated",
            "JSON generated",
            "HTML generated",
            "Ready for AI workflows",
        ]
    )


def build_preview_response(
    document: Document,
    transformed: TransformedDocument,
    exports: dict[OutputFormat, ExportedFile],
    report: ExportedFile,
    images_zip: ExportedFile | None,
    package: ExportedFile,
) -> dict:
    summary = transformed.summary
    return {
        "success": True,
        "job_id": document.metadata.job_id,
        "filename": document.metadata.filename,
        "template": transformed.template,
        "template_label": transformed.template_label,
        "markdown": transformed.markdown,
        "html": transformed.html,
        "text": transformed.text,
        "structured_json": transformed.json_data,
        "download_name": exports["markdown"].filename,
        "metadata": summary,
        "pipeline": pipeline_steps(),
        "images": [
            {
                "filename": image.filename,
                "size_bytes": image.size_bytes,
                "url": image.url,
            }
            for image in document.images
        ],
        "exports": {key: format_export(value) for key, value in exports.items()},
        "report": {
            "text": processing_report(summary),
            "download": format_export(report),
        },
        "images_zip": format_export(images_zip) if images_zip else None,
        "package": format_export(package),
    }


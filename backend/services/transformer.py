from html import escape
import re
from typing import Callable

from .models import Document, TemplateKey, TransformedDocument


TEMPLATE_LABELS: dict[TemplateKey, str] = {
    "general_markdown": "General Markdown",
    "rag_dataset": "RAG Dataset",
    "study_notes": "Study Notes",
    "meeting_notes": "Meeting Notes",
    "knowledge_base": "Knowledge Base",
    "technical_documentation": "Technical Documentation",
    "blog_draft": "Blog Draft",
    "training_manual": "Training Manual",
    "clean_markdown_export": "Clean Markdown Export",
}


def word_count(value: str) -> int:
    return len(re.findall(r"\b\w+\b", value))


def strip_markdown(value: str) -> str:
    text = re.sub(r"```[\s\S]*?```", "", value)
    text = re.sub(r"!\[([^\]]*)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"[*_`>]+", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def markdown_to_html(markdown: str) -> str:
    lines = markdown.splitlines()
    html: list[str] = []
    in_code = False
    code_buffer: list[str] = []
    in_ul = False
    in_ol = False
    table_buffer: list[str] = []

    def inline(value: str) -> str:
        safe = escape(value)
        safe = re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", r'<img src="\2" alt="\1" />', safe)
        safe = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', safe)
        safe = re.sub(r"`([^`]+)`", r"<code>\1</code>", safe)
        safe = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", safe)
        safe = re.sub(r"\*([^*]+)\*", r"<em>\1</em>", safe)
        return safe

    def close_lists() -> None:
        nonlocal in_ul, in_ol
        if in_ul:
            html.append("</ul>")
            in_ul = False
        if in_ol:
            html.append("</ol>")
            in_ol = False

    def flush_table() -> None:
        nonlocal table_buffer
        if len(table_buffer) < 2:
            table_buffer = []
            return
        rows = [row.strip().strip("|").split("|") for row in table_buffer]
        if rows and all(re.match(r"^\s*:?-{3,}:?\s*$", cell) for cell in rows[1]):
            head = rows[0]
            body = rows[2:]
            html.append("<table><thead><tr>")
            html.extend(f"<th>{inline(cell.strip())}</th>" for cell in head)
            html.append("</tr></thead><tbody>")
            for row in body:
                html.append("<tr>")
                html.extend(f"<td>{inline(cell.strip())}</td>" for cell in row)
                html.append("</tr>")
            html.append("</tbody></table>")
        table_buffer = []

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("```"):
            flush_table()
            close_lists()
            if in_code:
                html.append(f"<pre><code>{escape(chr(10).join(code_buffer))}</code></pre>")
                code_buffer = []
                in_code = False
            else:
                in_code = True
            continue

        if in_code:
            code_buffer.append(line)
            continue

        if "|" in stripped and stripped.startswith("|"):
            close_lists()
            table_buffer.append(line)
            continue
        flush_table()

        heading = re.match(r"^(#{1,6})\s+(.+)$", stripped)
        if heading:
            close_lists()
            level = len(heading.group(1))
            html.append(f"<h{level}>{inline(heading.group(2))}</h{level}>")
            continue

        ordered = re.match(r"^\d+\.\s+(.+)$", stripped)
        unordered = re.match(r"^[-*+]\s+(.+)$", stripped)
        if ordered:
            if not in_ol:
                close_lists()
                html.append("<ol>")
                in_ol = True
            html.append(f"<li>{inline(ordered.group(1))}</li>")
            continue
        if unordered:
            if not in_ul:
                close_lists()
                html.append("<ul>")
                in_ul = True
            html.append(f"<li>{inline(unordered.group(1))}</li>")
            continue

        if not stripped:
            close_lists()
            continue

        close_lists()
        html.append(f"<p>{inline(stripped)}</p>")

    flush_table()
    close_lists()
    if in_code:
        html.append(f"<pre><code>{escape(chr(10).join(code_buffer))}</code></pre>")
    return "\n".join(html)


def summarize_document(document: Document, output_markdown: str) -> dict:
    return {
        "filename": document.metadata.filename,
        "pages": document.metadata.page_count,
        "word_count": word_count(output_markdown),
        "character_count": len(output_markdown),
        "heading_count": len(document.headings),
        "table_count": len(document.tables),
        "image_count": len(document.images),
        "list_count": len(document.lists),
        "conversion_time_seconds": round(document.metadata.conversion_time_seconds, 2),
        "output_size_bytes": len(output_markdown.encode("utf-8")),
    }


def general_markdown(document: Document) -> str:
    return document.markdown


def rag_dataset(document: Document) -> str:
    chunks = document.sections or [
        type("SectionLike", (), {"title": document.metadata.filename, "content": document.markdown})()
    ]
    parts = ["# RAG Dataset", ""]
    for index, section in enumerate(chunks, start=1):
        content = section.content.strip() or section.title
        parts.extend(
            [
                f"## Chunk {index}: {section.title}",
                "",
                f"Source: {document.metadata.filename}",
                f"Words: {word_count(content)}",
                "",
                content,
                "",
            ]
        )
    return "\n".join(parts).strip()


def study_notes(document: Document) -> str:
    parts = [f"# Study Notes: {document.metadata.filename}", "", "## Key Topics"]
    parts.extend(f"- {heading}" for heading in document.headings[:20])
    parts.extend(["", "## Notes", strip_markdown(document.markdown)])
    return "\n".join(parts).strip()


def meeting_notes(document: Document) -> str:
    return "\n".join(
        [
            f"# Meeting Notes: {document.metadata.filename}",
            "",
            "## Summary",
            strip_markdown(document.markdown),
            "",
            "## Decisions",
            "- ",
            "",
            "## Action Items",
            "- ",
        ]
    ).strip()


def knowledge_base(document: Document) -> str:
    parts = [f"# AI Knowledge Base: {document.metadata.filename}", ""]
    parts.extend(["## Overview", "Knowledge-ready content extracted from the source document.", ""])
    for section in document.sections:
        parts.extend([f"## {section.title}", section.content.strip(), ""])
    if not document.sections:
        parts.append(strip_markdown(document.markdown))
    return "\n".join(parts).strip()


def technical_documentation(document: Document) -> str:
    return "\n".join(
        [
            f"# Technical Documentation: {document.metadata.filename}",
            "",
            "## Overview",
            strip_markdown(document.markdown),
            "",
            "## Reference",
            "\n".join(f"- {heading}" for heading in document.headings) or "- No headings detected",
        ]
    ).strip()


def blog_draft(document: Document) -> str:
    paragraphs = document.paragraphs[:8]
    return "\n\n".join(
        [
            f"# Blog Draft: {document.metadata.filename}",
            "## Introduction",
            paragraphs[0] if paragraphs else strip_markdown(document.markdown),
            "## Main Points",
            "\n".join(f"- {heading}" for heading in document.headings[:8]) or "- Add key point",
            "## Draft Body",
            "\n\n".join(paragraphs[1:]) if len(paragraphs) > 1 else "",
        ]
    ).strip()


def training_manual(document: Document) -> str:
    return "\n".join(
        [
            f"# Training Manual: {document.metadata.filename}",
            "",
            "## Overview",
            strip_markdown(document.markdown),
            "",
            "## Learning Objectives",
            "\n".join(f"- Understand {heading}" for heading in document.headings[:8])
            or "- Understand the key ideas in this document",
            "",
            "## Training Sections",
            "\n".join(f"- {heading}" for heading in document.headings[:12]) or "- Review the source material",
            "",
            "## Review Questions",
            "- What are the most important takeaways?",
            "- Which details should be turned into examples or exercises?",
        ]
    ).strip()


def clean_markdown_export(document: Document) -> str:
    return document.markdown.strip()


TEMPLATE_TRANSFORMERS: dict[TemplateKey, Callable[[Document], str]] = {
    "general_markdown": general_markdown,
    "rag_dataset": rag_dataset,
    "study_notes": study_notes,
    "meeting_notes": meeting_notes,
    "knowledge_base": knowledge_base,
    "technical_documentation": technical_documentation,
    "blog_draft": blog_draft,
    "training_manual": training_manual,
    "clean_markdown_export": clean_markdown_export,
}


def transform_document(document: Document, template: TemplateKey = "general_markdown") -> TransformedDocument:
    transformer = TEMPLATE_TRANSFORMERS.get(template, general_markdown)
    markdown = transformer(document)
    text = strip_markdown(markdown)
    html = markdown_to_html(markdown)
    summary = summarize_document(document, markdown)
    source_text = strip_markdown(document.markdown)
    source_html = markdown_to_html(document.markdown)
    json_data = {
        "template": template,
        "template_label": TEMPLATE_LABELS.get(template, TEMPLATE_LABELS["general_markdown"]),
        "metadata": document.to_dict()["metadata"],
        "summary": summary,
        "content": {
            "markdown": markdown,
            "text": text,
            "sections": [section.__dict__ for section in document.sections],
            "headings": document.headings,
            "paragraphs": document.paragraphs,
            "tables": document.tables,
            "images": [image.__dict__ for image in document.images],
            "lists": document.lists,
            "code_blocks": document.code_blocks,
            "footnotes": document.footnotes,
        },
    }
    source_json_data = {
        "metadata": document.to_dict()["metadata"],
        "summary": summarize_document(document, document.markdown),
        "content": {
            "markdown": document.markdown,
            "text": source_text,
            "sections": [section.__dict__ for section in document.sections],
            "headings": document.headings,
            "paragraphs": document.paragraphs,
            "tables": document.tables,
            "images": [image.__dict__ for image in document.images],
            "lists": document.lists,
            "code_blocks": document.code_blocks,
            "footnotes": document.footnotes,
        },
    }
    return TransformedDocument(
        template=template,
        template_label=TEMPLATE_LABELS.get(template, TEMPLATE_LABELS["general_markdown"]),
        source_markdown=document.markdown,
        source_html=source_html,
        source_text=source_text,
        source_json_data=source_json_data,
        markdown=markdown,
        html=html,
        text=text,
        json_data=json_data,
        summary=summary,
    )

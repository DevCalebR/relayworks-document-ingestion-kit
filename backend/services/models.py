from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Literal


OutputFormat = Literal["markdown", "html", "json", "text"]
TemplateKey = Literal[
    "general_markdown",
    "rag_dataset",
    "study_notes",
    "meeting_notes",
    "knowledge_base",
    "technical_documentation",
    "blog_draft",
    "api_documentation",
]


@dataclass
class DocumentMetadata:
    job_id: str
    filename: str
    source_path: str
    page_count: int
    conversion_time_seconds: float
    output_size_bytes: int
    created_at: str


@dataclass
class DocumentImage:
    filename: str
    path: str
    size_bytes: int
    url: str


@dataclass
class DocumentSection:
    level: int
    title: str
    content: str


@dataclass
class Document:
    metadata: DocumentMetadata
    markdown: str
    pages: list[dict[str, Any]] = field(default_factory=list)
    sections: list[DocumentSection] = field(default_factory=list)
    headings: list[str] = field(default_factory=list)
    paragraphs: list[str] = field(default_factory=list)
    tables: list[str] = field(default_factory=list)
    images: list[DocumentImage] = field(default_factory=list)
    lists: list[str] = field(default_factory=list)
    code_blocks: list[str] = field(default_factory=list)
    footnotes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class TransformedDocument:
    template: TemplateKey
    template_label: str
    markdown: str
    html: str
    text: str
    json_data: dict[str, Any]
    summary: dict[str, Any]


@dataclass
class ExportedFile:
    format: OutputFormat
    filename: str
    path: Path
    size_bytes: int
    url: str


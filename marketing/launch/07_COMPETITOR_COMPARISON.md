# Competitor And Alternative Comparison

This comparison is positioning-oriented. It does not claim RelayWorks is technically superior to every alternative. RelayWorks is a source-code product that packages a local FastAPI + Next.js workflow around PDF ingestion, background jobs, output review, and downloads.

## Summary Positioning

RelayWorks is best positioned as:

- A practical source-code starter for document-heavy AI workflows.
- A local app baseline with both backend and frontend included.
- A buyer-owned implementation that can be modified.
- A wrapper/workflow product around local PDF processing, not a replacement for every parser or enterprise document platform.

## RelayWorks vs Marker

Marker is the PDF processing engine used by RelayWorks through `marker_single`.

### Marker Strengths

- Focused document conversion technology.
- Strong fit for PDF-to-Markdown and related extraction workflows.
- Useful as a core processing dependency.
- Can be used directly by technical users.

### RelayWorks Positioning

RelayWorks does not try to replace Marker. It packages Marker into an application workflow:

- Upload UI.
- FastAPI endpoints.
- Background job workflow.
- Job status metadata.
- Output tabs.
- Download package generation.
- Reports.
- Batch packaging.
- Buyer-facing documentation and screenshots.

### When To Choose Marker Directly

Choose Marker directly if you only need a CLI/library workflow and will build the web app, job handling, output packaging, and frontend yourself.

### When To Choose RelayWorks

Choose RelayWorks if you want a working local product shell around Marker with a frontend, API routes, output review, packages, and source code you can adapt.

## RelayWorks vs Unstructured

Unstructured provides document processing tooling and services for data extraction and ingestion workflows.

### Unstructured Strengths

- Broader document ingestion ecosystem.
- More mature enterprise/document AI positioning.
- Potentially broader format and deployment options depending on product and plan.
- Existing tooling for teams that want a maintained platform or library ecosystem.

### RelayWorks Positioning

RelayWorks is narrower and more source-product oriented:

- PDF-first.
- Local-first.
- No hosted dependency required in the current version.
- Includes a Next.js review interface.
- Includes simple local job persistence.
- Designed as a downloadable codebase buyers can own and adapt.

### When To Choose Unstructured

Choose Unstructured if you need a broader document-processing platform, enterprise features, managed services, or a mature ingestion ecosystem beyond this local kit.

### When To Choose RelayWorks

Choose RelayWorks if you want a smaller source-owned baseline to modify, especially for PDF-to-AI-ready content workflows.

## RelayWorks vs Docling

Docling is an open document conversion toolkit for parsing and converting documents.

### Docling Strengths

- Strong document-conversion orientation.
- Useful for developers building custom pipelines.
- May support workflows beyond the narrow RelayWorks app surface.
- Can be integrated into custom systems.

### RelayWorks Positioning

RelayWorks focuses on the product workflow around conversion:

- Upload and review UI.
- Background job status.
- Local job metadata.
- Multi-format exports.
- Package downloads.
- Processing report.
- Launch-ready screenshots and docs.

### When To Choose Docling

Choose Docling if you want to build your own application around a document conversion toolkit and prefer that ecosystem.

### When To Choose RelayWorks

Choose RelayWorks if you want an already assembled FastAPI + Next.js document ingestion app and are comfortable with Marker as the processing layer.

## RelayWorks vs Adobe Acrobat AI

Adobe Acrobat AI is a consumer/business product experience around PDFs and AI assistance.

### Adobe Acrobat AI Strengths

- Polished end-user PDF experience.
- Backed by Adobe's document ecosystem.
- Suitable for users who want a product, not source code.
- Strong fit for reading, summarizing, and interacting with PDFs inside Adobe tooling.

### RelayWorks Positioning

RelayWorks is not an Acrobat replacement. It is a developer source-code kit:

- Buyers get code.
- Outputs include Markdown, HTML, JSON, text, reports, images, and packages.
- The app runs locally.
- Developers can modify backend and frontend behavior.
- The workflow is oriented toward AI ingestion and reusable content assets.

### When To Choose Adobe Acrobat AI

Choose Adobe Acrobat AI if you want a polished end-user PDF assistant or document productivity product.

### When To Choose RelayWorks

Choose RelayWorks if you want source code for building document ingestion workflows and packaging extracted outputs for AI systems.

## Positioning Table

| Option | Best Fit | RelayWorks Relationship |
| --- | --- | --- |
| Marker | Direct PDF conversion engine | RelayWorks uses Marker and adds app workflow |
| Unstructured | Broader ingestion platform/ecosystem | RelayWorks is smaller, local-first, source-owned |
| Docling | Developer conversion toolkit | RelayWorks is a packaged app baseline |
| Adobe Acrobat AI | End-user PDF AI/productivity | RelayWorks is developer source code, not a reader |

## Honest RelayWorks Limitations

- PDF-first only in the current product.
- Depends on Marker quality and installation.
- No hosted service included.
- No authentication or billing included.
- Local file-backed jobs are not a distributed queue.
- Not a full document management system.
- Not a guarantee of perfect extraction for every PDF.


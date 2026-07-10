# Sample Selection Guide

RelayWorks Document Ingestion Kit needs a small proof set that buyers can inspect without legal or privacy concerns.

## What Kinds Of PDFs To Include

Use up to five small PDFs that represent common buyer workflows:

1. Technical documentation
2. Research or academic content
3. Product manual or procedural guide
4. Business report
5. Messy, scanned, or layout-challenging document

Do not include private customer documents, internal reports, contracts, invoices, confidential manuals, or documents with unclear redistribution rights.

## Why Each Sample Exists

- Technical documentation: proves developer-document and knowledge-base readiness.
- Research/academic: shows dense text, headings, citations, and tables where available.
- Product manual: shows lists, warnings, repeated sections, and procedural content.
- Business report: shows executive summaries, tables, report structure, and business-language extraction.
- Messy/scanned document: documents limitations and sets realistic expectations.

## Licensing Requirements

Only include PDFs when redistribution is clearly allowed.

Acceptable sources may include:

- Public-domain documents
- Government publications that are clearly public domain
- Creative Commons documents that allow redistribution and commercial use
- Project-created sample PDFs with original content
- Vendor sample files that explicitly allow redistribution

For each PDF, add a `source-info.md` file with:

- Source URL or origin
- License name or redistribution basis
- Download date
- Any attribution requirements
- Any modifications made

If licensing is unclear, do not include the file.

## Max File Size Recommendation

Keep each sample PDF small:

- Preferred: under 1 MB
- Maximum recommended: 3 MB
- Avoid large scanned files unless they are necessary to demonstrate a specific limitation

Expected outputs should also stay small enough for GitHub review.

## How To Regenerate Outputs

1. Install and validate the project using `INSTALLATION_PROOF.md`.
2. Place approved PDFs in `proof/sample-inputs/`.
3. Start the backend:

```bash
source .venv/bin/activate
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

4. Run conversion through the frontend or API:

```bash
curl -F "file=@proof/sample-inputs/example.pdf" \
  "http://localhost:8000/convert?template=knowledge_base"
```

5. Download the complete package from the app or API response.
6. Copy representative outputs into `proof/expected-outputs/<sample-name>/`:

```text
output.md
output.html
output.json
output.txt
processing-report.md
images/              optional
source-info.md
```

7. Review generated content before committing.

## How Buyers Should Inspect Examples

Buyers should compare:

- Source PDF versus generated Markdown
- Markdown versus rendered preview
- JSON structure versus expected ingestion needs
- Plain text quality for search/indexing
- Processing report metadata versus source document
- Extracted images, if present
- Notes about limitations and manual review needs

The proof set should show both strengths and limitations. Do not curate only perfect examples.

# Proof & Examples Pack

This folder is reserved for buyer-verifiable examples for RelayWorks Document Ingestion Kit.

The goal is to let technical buyers inspect real inputs, generated outputs, screenshots, and notes before purchasing or adopting the source-code product.

## Current Status

No sample PDFs are committed yet.

The repository currently contains local/generated PDFs in ignored folders, but none have clear redistribution terms suitable for public GitHub publication. Those files were intentionally not copied here.

Until redistributable samples are selected, this pack contains folder structure and instructions only.

## Folder Layout

```text
proof/
  README.md
  sample-inputs/
  expected-outputs/
  screenshots/
  notes/
```

## Intended Sample Set

Add up to five small, clearly redistributable PDFs:

1. Technical documentation sample
   - Purpose: demonstrate structured headings, code-like content, configuration steps, and reference-style sections.
   - Useful buyer question: can the app produce Markdown/HTML/JSON/text that is usable for developer docs or knowledge bases?

2. Research/academic sample
   - Purpose: demonstrate dense paragraphs, citations, tables, headings, and academic-style formatting.
   - Useful buyer question: can the app preserve enough structure for research review or RAG preparation?

3. Product manual sample
   - Purpose: demonstrate long-form procedural content, warnings, lists, diagrams, and repeated sections.
   - Useful buyer question: can the app prepare manuals for internal tools or support workflows?

4. Business report sample
   - Purpose: demonstrate executive summaries, charts or tables, sections, and report-style language.
   - Useful buyer question: can the app convert business PDFs into reusable content packages?

5. Messy/scanned document sample
   - Purpose: demonstrate limitations, OCR/scanned-document risk, layout complexity, and manual review needs.
   - Useful buyer question: where does extraction degrade and what should buyers expect?

## Expected Outputs To Generate

For each approved sample PDF, generate and commit small expected outputs under `proof/expected-outputs/<sample-name>/`:

```text
source-info.md
output.md
output.html
output.json
output.txt
processing-report.md
images/              optional, only if images are extracted
```

The `source-info.md` file should include:

- Source PDF name
- Source URL
- License or redistribution basis
- Date downloaded
- File size
- Notes about expected extraction quality

## Screenshots

Use `proof/screenshots/` for small screenshots that show:

- Upload/workspace state
- Generated Markdown tab
- Rendered preview tab
- Download package or output inspection

Keep screenshots small and avoid including private or copyrighted document content unless redistribution is explicitly allowed.

## Notes

Use `proof/notes/` for inspection notes such as:

- What worked well
- What failed or degraded
- Tables/images behavior
- OCR/scanned-document behavior
- Manual review recommendations

## Regenerating Outputs

After adding a redistributable sample PDF:

1. Start the backend.
2. Start the frontend or use the API directly.
3. Process the PDF.
4. Download the complete package.
5. Copy representative generated files into `proof/expected-outputs/<sample-name>/`.
6. Add `source-info.md` with licensing and source details.
7. Keep files small and review all content before committing.

API example:

```bash
curl -F "file=@proof/sample-inputs/example.pdf" \
  "http://localhost:8000/convert?template=knowledge_base"
```

## Publication Rule

Do not commit a PDF or generated output unless the source document is clearly redistributable and appropriate for commercial product evaluation.

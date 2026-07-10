# RelayWorks AI Document Processing Kit - FAQ

## 1. What is RelayWorks?

RelayWorks is a downloadable FastAPI + Next.js source-code kit for turning PDFs into AI-ready content packages. It uses Marker locally for PDF processing and provides a frontend workspace for upload, review, and download.

## 2. Is this a SaaS product?

No. RelayWorks is not a hosted SaaS product. It is a source-code product intended to run locally or inside infrastructure you control.

## 3. Does it include the source code?

Yes. The product is positioned around source ownership. Buyers receive backend code, frontend code, scripts, docs, and project files.

## 4. What document formats does it support?

The current product is PDF-first. It accepts `.pdf` uploads. Other input formats such as DOCX, PPTX, XLSX, or email files are not current primary targets.

## 5. Does it require API keys?

No API keys are required for the current local version.

## 6. Does it use AI models directly?

The app does not currently call hosted LLM APIs. It uses Marker through the local `marker_single` command for PDF extraction and conversion.

## 7. What is Marker?

Marker is the PDF processing tool used by the backend through the `marker_single` CLI command. Marker must be installed separately in the Python environment or shell path used to run the backend.

## 8. Is Marker included in `backend/requirements.txt`?

No. Backend web dependencies are listed in `backend/requirements.txt`, but Marker installation is separate. Buyers must install Marker and confirm `marker_single --help` works.

## 9. What outputs does RelayWorks generate?

It can generate Markdown, HTML, structured JSON, plain text, selected goal output, a processing report, extracted image downloads, image ZIPs, and complete ZIP packages.

## 10. Does it extract images?

It can preserve and expose images when Marker extracts images from the source PDF. Image extraction depends on the PDF and Marker output.

## 11. Does every PDF convert perfectly?

No. Extraction quality depends on the source PDF, layout, scan quality, embedded assets, and Marker behavior. Some PDFs may need manual review or custom handling.

## 12. Can it handle scanned PDFs?

Scanned or image-heavy PDFs may need manual review. The product does not promise perfect OCR or extraction for every scanned file.

## 13. Does the browser wait on one long request?

The recommended single-PDF workflow creates a background job. The frontend polls the job endpoint and shows honest status stages. The legacy `/convert` endpoint remains for compatibility and small-document checks.

## 14. What job statuses are supported?

Jobs can be `queued`, `processing`, `completed`, or `failed`.

## 15. What stages are shown?

Stages include queued, preparing, parsing, transforming, exporting, packaging, completed, and failed.

## 16. Does RelayWorks show progress percentages?

No. It does not fake exact progress percentages. It shows lifecycle stages that the backend actually reports.

## 17. Does it need Redis, Celery, Docker, or a database?

No. The current background workflow uses a bounded local executor and file-backed JSON job metadata under `storage/jobs/`.

## 18. What happens if the backend restarts during a job?

Queued or processing jobs from a prior process are marked failed/interrupted on startup or read so the UI does not falsely report them as still processing.

## 19. Where are files stored?

Runtime files are stored locally under `storage/`, including uploads, outputs, ZIPs, job metadata, and leads.

## 20. Can I deploy it?

The code can be adapted for deployment, but the current product is local-first and file-backed. Production deployment choices, storage, authentication, security, and scaling are the buyer's responsibility.

## 21. Does it include authentication?

No. Authentication is intentionally not included in the current MVP.

## 22. Does it include billing?

No. Billing is not included.

## 23. Does it include cloud storage integrations?

No. The current product uses the local filesystem.

## 24. Is this an admin dashboard?

No. It includes a local/private-demo lead capture and lead review route, but it is not a production admin system.

## 25. Can agencies use it for client work?

That depends on the final commercial license purchased. The draft license notes that client-work rights must be explicitly defined before paid release.

## 26. Is the license final?

No. `LICENSE.md` is currently a draft commercial license placeholder and says final legal review is required before paid release.

## 27. Can I redistribute the source code?

Not unless the final commercial license explicitly allows it. The draft license restricts resale, sublicensing, publishing, or redistribution of the source code.

## 28. What technical stack does it use?

The backend uses FastAPI. The frontend uses Next.js and React. PDF processing is performed through Marker.

## 29. What version of Python should I use?

Python 3.11 is recommended.

## 30. What version of Node should I use?

Node.js 20+ or 22+ is recommended.

## 31. Why does the frontend dev command use Webpack?

The repository defaults to `next dev --webpack` because Turbopack produced local file-read timeout issues on the development Mac used during buildout.

## 32. Is there a sample PDF included?

The repository contains sample guidance and local sample storage may exist in the working copy. Buyers should only redistribute sample PDFs when rights are clear.

## 33. Are screenshots included?

Yes. The launch package includes raw and final screenshots under `marketing/screenshots/`, plus a screenshot manifest.

## 34. Does it include tests?

The backend includes focused tests for job storage and job API behavior. Frontend validation uses TypeScript and production build checks.

## 35. What should I customize first?

Common first customizations include templates, output schemas, storage backend, authentication, deployment, and business-specific processing rules.


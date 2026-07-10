# RelayWorks AI Document Processing Kit - Features

This feature list describes what is currently present in the repository. It avoids roadmap claims and unsupported capabilities.

## Application Foundation

1. FastAPI backend for document processing routes.
2. Next.js frontend for the local document workspace.
3. React-based user interface for upload, output review, and downloads.
4. Local-first architecture with no required hosted service.

## PDF Processing

5. PDF upload validation.
6. Marker integration through the `marker_single` command.
7. Single-PDF conversion workflow.
8. Batch-PDF conversion workflow.
9. Page-count estimation from PDF contents.
10. Markdown normalization into headings, paragraphs, tables, lists, code blocks, footnotes, and sections.
11. Extracted image discovery from Marker output folders.

## Background Jobs

12. Background single-document conversion endpoint at `POST /jobs/convert`.
13. Immediate HTTP `202` response with job metadata.
14. Job status endpoint at `GET /jobs/{job_id}`.
15. Job downloads endpoint at `GET /jobs/{job_id}/downloads`.
16. File-backed job metadata under `storage/jobs/`.
17. Bounded local executor for conversion jobs.
18. Configurable worker concurrency through `CONVERSION_CONCURRENCY`.
19. Stale queued or processing jobs marked failed/interrupted after backend restart.

## Output Generation

20. Markdown export.
21. HTML export.
22. Structured JSON export.
23. Plain text export.
24. Selected goal output Markdown file.
25. Processing report Markdown file.
26. Extracted image ZIP when images are available.
27. Complete single-document ZIP package.
28. Batch ZIP package with per-document outputs and summary.

## Frontend Workflow

29. Goal-based template selection in the workspace.
30. Single PDF upload state.
31. Batch PDF upload state.
32. Background job polling for single PDF conversion.
33. Stage/status display without fake progress percentages.
34. Success state with document summary metrics.
35. Failure message display.
36. Output tabs for Markdown, rendered preview, HTML, JSON, text, images, and report.

## Configuration And Safety

37. Configurable Marker subprocess timeout through `MARKER_TIMEOUT_SECONDS`.
38. Configurable local upload size limit through `MAX_UPLOAD_SIZE_MB`.
39. Safe filename handling for uploads and downloads.
40. Traceback sanitization in UI-facing job error messages.

## Buyer Proof And Documentation

The launch package includes README-backed positioning, marketplace copy, pricing guidance, and screenshot references rather than claiming additional product functionality.

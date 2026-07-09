# Third-Party Notices

This file is a high-level third-party dependency notice for RelayWorks Document Ingestion Kit. It is not exhaustive and is not a final legal review.

Final dependency and license review is required before commercial release.

## Known Major Third-Party Dependencies

### Marker

The backend uses Marker through the `marker_single` command for PDF processing and extraction. Marker and its transitive dependencies are governed by their own licenses.

### FastAPI

The backend uses FastAPI for HTTP API routing and request handling. FastAPI and its transitive Python dependencies are governed by their own licenses.

### Next.js

The frontend uses Next.js for the web application framework. Next.js and its transitive Node dependencies are governed by their own licenses.

### React

The frontend uses React for UI rendering. React and its related packages are governed by their own licenses.

### Python Packages

The backend depends on Python packages listed in `backend/requirements.txt` and any packages required by Marker in the active Python environment. These packages are governed by their own licenses.

### Node Packages

The frontend depends on Node packages listed in `frontend/package.json` and locked in `frontend/package-lock.json`. These packages are governed by their own licenses.

## Review Required

Before commercial release, review:

- Direct dependency licenses
- Transitive dependency licenses
- Marker licensing and model/package dependencies
- Frontend package licenses
- Backend package licenses
- Any generated assets, sample documents, or bundled files

Do not treat this file as a complete attribution, notice, or compliance document.

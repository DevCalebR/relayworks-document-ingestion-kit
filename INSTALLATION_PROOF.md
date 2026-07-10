# Installation Proof

This document records a clean-checkout installation test for RelayWorks Document Ingestion Kit.

## Test Summary

- Repository tested: `https://github.com/DevCalebR/relayworks-document-ingestion-kit`
- Commit tested from clean clone: `e45d99905017d3c519cc783b03423b95bc791a48`
- Test result: backend syntax check passed, frontend install passed, frontend typecheck passed, frontend build passed
- Important setup risk: Marker was already available on the test machine through a global pyenv shim. `backend/requirements.txt` does not install Marker.

## Machine / Environment Used

```text
Date UTC: 2026-07-09T10:09:01Z
OS: Darwin Calebs-MacBook-Air.local 25.6.0 Darwin Kernel Version 25.6.0: Sun Jun 28 20:27:27 PDT 2026; root:xnu-12377.160.87.0.2~12/RELEASE_ARM64_T8132 arm64
Python: Python 3.11.6
Node: v26.0.0
npm: 11.12.1
marker_single path before clone test: /Users/caleb/.pyenv/shims/marker_single
Temporary test directory: /tmp/relayworks-install-proof-20260709060901
```

## Clean Checkout Commands Run

```bash
PROOF_ROOT="/tmp/relayworks-install-proof-20260709060901"
mkdir -p "$PROOF_ROOT"
cd "$PROOF_ROOT"
git clone https://github.com/DevCalebR/relayworks-document-ingestion-kit.git
cd relayworks-document-ingestion-kit
git rev-parse HEAD
```

Observed commit:

```text
e45d99905017d3c519cc783b03423b95bc791a48
```

## Backend Setup Commands Run

```bash
python -m venv .venv
source .venv/bin/activate
python --version
pip install -r backend/requirements.txt
```

Observed result:

```text
Python 3.11.6
backend requirements installed successfully
```

Installed backend packages included FastAPI, Uvicorn, python-multipart, Pydantic, Starlette, and Uvicorn standard extras.

## Marker Requirement Check

Command run:

```bash
command -v marker_single
marker_single --help
```

Observed result:

```text
/Users/caleb/.pyenv/shims/marker_single
marker_single_help=PASS
```

Interpretation:

- Marker was already installed on the machine outside the newly created project virtual environment.
- The clean checkout did not prove Marker installation from project requirements.
- A new buyer/evaluator must install Marker separately and confirm `marker_single --help` works in the shell used to start the backend.

## Backend Validation Commands Run

```bash
python -m py_compile backend/main.py backend/services/*.py
```

Observed result:

```text
backend_syntax=PASS
```

## Frontend Setup Commands Run

```bash
cd frontend
npm install
```

Observed result:

```text
added 22 packages, and audited 23 packages
2 moderate severity vulnerabilities reported by npm audit
```

The npm audit output reported two moderate advisories and suggested `npm audit fix --force`, which may introduce breaking dependency changes. No dependency changes were made during this proof.

## Frontend Validation Commands Run

```bash
npm run typecheck
npm run build
```

Observed result:

```text
frontend_typecheck=PASS
frontend_build=PASS
```

Build output summary:

```text
Next.js 16.2.10 (Turbopack)
Compiled successfully
TypeScript finished successfully
Static route generated: /
```

## Expected Results For A Clean Evaluator Install

A clean evaluator should expect:

- `git clone` succeeds.
- Python virtual environment can be created.
- `pip install -r backend/requirements.txt` installs backend web dependencies.
- `marker_single --help` works after Marker is installed separately.
- `python -m py_compile backend/main.py backend/services/*.py` exits successfully.
- `npm install` completes in `frontend/`.
- `npm run typecheck` exits successfully.
- `npm run build` exits successfully.

## What Passed

- Public GitHub clone from a separate temporary directory.
- Backend dependency installation from `backend/requirements.txt`.
- Marker command availability check on this machine.
- Backend Python syntax check.
- Frontend dependency installation.
- Frontend typecheck.
- Frontend production build.

## What Failed

No validation command failed in this clean-checkout test.

## Fixes Needed

No code fixes were needed.

Documentation should continue to make the Marker dependency explicit because Marker is not installed by this repository's backend requirements file.

## Unresolved Setup Risks

- Marker installation is external to this repository and may vary by machine.
- `marker_single` must be available in the same environment or shell path used to start FastAPI.
- PDF conversion quality depends on Marker and the source PDF.
- `npm audit` reports two moderate advisories in the current frontend dependency tree; these were not changed because this task does not modify dependencies.
- Node v26.0.0 worked in this test, but README continues to recommend Node 20+ or 22+ for evaluator stability.
- This proof validates install/build checks, not a full PDF conversion from a clean machine with a bundled sample PDF.

## Current Workflow Note

The primary single-PDF frontend workflow now uses `POST /jobs/convert`, polls `GET /jobs/{job_id}`, and reads completed outputs from the job response. Job metadata is stored locally in `storage/jobs/`.

Configuration knobs for local evaluation:

```text
MARKER_TIMEOUT_SECONDS=3600
CONVERSION_CONCURRENCY=1
MAX_UPLOAD_SIZE_MB=100
```

`MARKER_TIMEOUT_SECONDS` is a Marker subprocess safety limit, not an HTTP timeout. If the backend stops while a job is queued or processing, startup/read recovery marks the job failed with an interrupted message.

# Release Checklist

Use this checklist before publishing RelayWorks Product #1 or preparing a customer demo.

## RelayWorks Product Standard

- Product name uses RelayWorks-neutral branding only.
- No legacy branding appears in active source, docs, metadata, package names, headers, or generated filenames.
- No customer documents, generated outputs, ZIP packages, leads, caches, virtual environments, or build artifacts are committed.
- The app remains focused on the smallest sellable workflow: document upload, processing, preview, package download, and lead capture.
- No auth, billing, database, Redis, cloud storage, Docker, or complex admin features are added before demand is proven.
- Local setup instructions are clear enough for a fresh checkout.
- Demo flow can be completed locally with backend and frontend running.

## Pre-Publication Checks

- Run `git status --short --branch` and confirm only intentional changes are present.
- Run a full branding search for legacy names in active source and docs.
- Confirm `.env.example` files contain no secrets.
- Confirm `.gitignore` excludes local runtime data and generated artifacts.
- Confirm `samples/` contains no private PDFs.
- Run backend Python syntax checks.
- Run frontend typecheck.
- Run frontend production build.
- Review README, backend README, project structure, changelog, and release checklist.

## GitHub Release Prep

- Commit on a task branch with a descriptive message.
- Push only after confirming no ignored/private files are staged.
- Create the GitHub repository under the intended RelayWorks organization or account.
- Add repository description and topics after publication.
- Keep deployment credentials and customer data outside the repo.

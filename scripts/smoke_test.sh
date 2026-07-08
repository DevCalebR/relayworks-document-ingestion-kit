#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR" || exit 1

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

pass() {
  printf "PASS: %s\n" "$1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
  printf "FAIL: %s\n" "$1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

skip() {
  printf "SKIP: %s\n" "$1"
  SKIP_COUNT=$((SKIP_COUNT + 1))
}

printf "DocForge AI smoke test\n"
printf "Repo: %s\n\n" "$ROOT_DIR"

if python - <<'PY' >/dev/null 2>&1
import backend.main
PY
then
  pass "backend imports"
else
  fail "backend imports"
fi

for folder in storage/uploads storage/output storage/zips storage/leads samples scripts; do
  if [ -d "$folder" ]; then
    pass "folder exists: $folder"
  else
    fail "folder missing: $folder"
  fi
done

if command -v marker_single >/dev/null 2>&1; then
  pass "marker command available"
else
  fail "marker command missing"
fi

if [ -f samples/sample.pdf ]; then
  if curl -fsS http://127.0.0.1:8000/docs >/dev/null 2>&1; then
    code="$(curl -sS -o /tmp/docforge-smoke-convert.json -w '%{http_code}' \
      -F "file=@samples/sample.pdf" \
      "http://127.0.0.1:8000/convert?template=knowledge_base" || true)"
    if [ "$code" = "200" ]; then
      pass "single conversion endpoint with samples/sample.pdf"
    else
      fail "single conversion endpoint returned HTTP $code"
    fi
  else
    skip "samples/sample.pdf exists, but backend is not running on 127.0.0.1:8000"
  fi
else
  skip "samples/sample.pdf not found"
fi

printf "\nSummary: %s passed, %s failed, %s skipped\n" "$PASS_COUNT" "$FAIL_COUNT" "$SKIP_COUNT"

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi


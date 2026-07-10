import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import backend.main as main
from backend.services.jobs import JobStore


class JobApiTests(unittest.TestCase):
    def test_unknown_job_returns_404(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            store = JobStore(Path(tmp), process_id=101)
            with patch.object(main, "job_store", store):
                response = TestClient(main.app).get("/jobs/missing123")

        self.assertEqual(response.status_code, 404)

    def test_completed_job_response(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            store = JobStore(Path(tmp), process_id=101)
            store.create("abc123", "sample.pdf", "knowledge_base", Path(tmp) / "sample.pdf", Path(tmp) / "output")
            store.mark_completed(
                "abc123",
                {"success": True, "job_id": "abc123"},
                [{"type": "package", "filename": "relayworks-package-abc123.zip", "size_bytes": 123, "url": "/download/abc123/package"}],
            )
            with patch.object(main, "job_store", store):
                response = TestClient(main.app).get("/jobs/abc123")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "completed")
        self.assertEqual(payload["available_downloads"][0]["type"], "package")

    def test_failed_job_response(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            store = JobStore(Path(tmp), process_id=101)
            store.create("abc123", "sample.pdf", "knowledge_base", Path(tmp) / "sample.pdf", Path(tmp) / "output")
            store.mark_failed("abc123", "Marker could not process this document.")
            with patch.object(main, "job_store", store):
                response = TestClient(main.app).get("/jobs/abc123")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "failed")
        self.assertEqual(payload["error"], "Marker could not process this document.")

    def test_downloads_response(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            store = JobStore(Path(tmp), process_id=101)
            store.create("abc123", "sample.pdf", "knowledge_base", Path(tmp) / "sample.pdf", Path(tmp) / "output")
            store.mark_completed(
                "abc123",
                {"success": True, "job_id": "abc123"},
                [{"type": "markdown", "filename": "sample.md", "size_bytes": 123, "url": "/download/abc123/markdown"}],
            )
            with patch.object(main, "job_store", store):
                response = TestClient(main.app).get("/jobs/abc123/downloads")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["available_downloads"][0]["type"], "markdown")

    def test_oversized_background_upload_returns_413(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            store = JobStore(Path(tmp), process_id=101)
            with (
                patch.object(main, "job_store", store),
                patch.dict("os.environ", {"MAX_UPLOAD_SIZE_MB": "1"}),
            ):
                response = TestClient(main.app).post(
                    "/jobs/convert",
                    files={"file": ("large.pdf", b"%PDF-" + (b"x" * 1024 * 1024), "application/pdf")},
                )

        self.assertEqual(response.status_code, 413)


if __name__ == "__main__":
    unittest.main()

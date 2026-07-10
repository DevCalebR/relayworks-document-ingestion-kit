import tempfile
import unittest
from pathlib import Path

from backend.services.jobs import JobStore, available_downloads_from_result, safe_error_message


class JobStoreTests(unittest.TestCase):
    def test_job_creation_and_read_write(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            store = JobStore(Path(tmp), process_id=101)
            job = store.create(
                "abc123",
                "sample.pdf",
                "knowledge_base",
                Path(tmp) / "sample.pdf",
                Path(tmp) / "output" / "abc123",
            )

            self.assertEqual(job["status"], "queued")
            self.assertEqual(job["stage"], "queued")
            self.assertEqual(store.read("abc123")["filename"], "sample.pdf")

    def test_completed_job_response_includes_downloads(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            store = JobStore(Path(tmp), process_id=101)
            store.create("abc123", "sample.pdf", "knowledge_base", Path(tmp) / "sample.pdf", Path(tmp) / "output")
            result = {
                "exports": {
                    "markdown": {
                        "filename": "sample.md",
                        "size_bytes": 10,
                        "url": "/download/abc123/markdown",
                    }
                },
                "report": {
                    "download": {
                        "format": "text",
                        "filename": "sample-processing-report.md",
                        "size_bytes": 20,
                        "url": "/download/abc123/report",
                    }
                },
                "package": {
                    "format": "text",
                    "filename": "relayworks-package-abc123.zip",
                    "size_bytes": 30,
                    "url": "/download/abc123/package",
                },
            }

            completed = store.mark_completed("abc123", result, available_downloads_from_result(result))

            self.assertEqual(completed["status"], "completed")
            self.assertEqual(completed["stage"], "completed")
            self.assertEqual(completed["result"], result)
            self.assertEqual([item["type"] for item in completed["available_downloads"]], ["markdown", "report", "package"])

    def test_failed_job_response(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            store = JobStore(Path(tmp), process_id=101)
            store.create("abc123", "sample.pdf", "knowledge_base", Path(tmp) / "sample.pdf", Path(tmp) / "output")

            failed = store.mark_failed("abc123", "Processing exceeded the configured Marker safety limit.")

            self.assertEqual(failed["status"], "failed")
            self.assertEqual(failed["stage"], "failed")
            self.assertEqual(failed["error"], "Processing exceeded the configured Marker safety limit.")

    def test_unknown_job_response(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            store = JobStore(Path(tmp), process_id=101)

            self.assertIsNone(store.read("missing123"))

    def test_stale_active_job_is_marked_interrupted_on_read(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            first_process = JobStore(Path(tmp), process_id=101)
            first_process.create("abc123", "sample.pdf", "knowledge_base", Path(tmp) / "sample.pdf", Path(tmp) / "output")

            second_process = JobStore(Path(tmp), process_id=202)
            job = second_process.read("abc123")

            self.assertEqual(job["status"], "failed")
            self.assertEqual(job["stage"], "failed")
            self.assertIn("interrupted", job["message"])

    def test_startup_recovery_marks_active_jobs_interrupted(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            store = JobStore(Path(tmp), process_id=101)
            store.create("abc123", "sample.pdf", "knowledge_base", Path(tmp) / "sample.pdf", Path(tmp) / "output")

            store.recover_interrupted()
            job = store.read("abc123")

            self.assertEqual(job["status"], "failed")
            self.assertEqual(job["stage"], "failed")

    def test_tracebacks_are_omitted_from_ui_error_message(self) -> None:
        message = safe_error_message(
            'Marker could not process this document.\n\nTraceback (most recent call last):\n  File "marker.py", line 1\nValueError: boom'
        )

        self.assertIn("Marker could not process this document.", message)
        self.assertIn("traceback that was omitted", message)
        self.assertNotIn('File "marker.py"', message)


if __name__ == "__main__":
    unittest.main()

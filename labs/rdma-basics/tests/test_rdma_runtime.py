#!/usr/bin/env python3
"""Lightweight regression tests for rdma-basics validation logic.

These tests intentionally do not boot the VM lab.  They mutate disposable
copies of the committed reference evidence and exercise the same validator
used by collect-evidence.sh.
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

import validate_evidence  # noqa: E402

spec = importlib.util.spec_from_file_location("vm_lab", SCRIPTS / "vm_lab.py")
vm_lab = importlib.util.module_from_spec(spec)
spec.loader.exec_module(vm_lab)  # noqa: E402

REFERENCE = ROOT / "evidence" / "reference-run"
IMAGE = "ubuntu-24.04-minimal-cloudimg-amd64.img"
GOOD_HASH = "d80fe50055e780901549d0dfab203551d79e31cb0fa9ac2b4d45efa1e8a51052"


class EvidenceCase(unittest.TestCase):
    def copy_evidence(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        dest = Path(tmp.name) / "evidence"
        shutil.copytree(REFERENCE, dest)
        return dest

    def validate(self, evidence):
        return validate_evidence.validate_evidence(evidence, write_analysis=False)[0]

    def test_reference_evidence_validates(self):
        evidence = self.copy_evidence()
        self.assertEqual([], self.validate(evidence))

    def test_missing_evidence_file_fails(self):
        evidence = self.copy_evidence()
        (evidence / "rdma-write.pcap").unlink()
        errors = self.validate(evidence)
        self.assertTrue(any("missing required evidence file: rdma-write.pcap" in e for e in errors), errors)

    def test_missing_host_log_fails(self):
        evidence = self.copy_evidence()
        (evidence / "hostb-exp-c-target.log").unlink()
        errors = self.validate(evidence)
        self.assertTrue(any("missing required host log: hostb-exp-c-target.log" in e for e in errors), errors)

    def test_invalid_experiment_verification_status_fails(self):
        evidence = self.copy_evidence()
        path = evidence / "verification.json"
        data = json.loads(path.read_text())
        data["experiments"]["c"]["status"] = "fail"
        path.write_text(json.dumps(data))
        errors = self.validate(evidence)
        self.assertTrue(any("experiment c: verification status" in e for e in errors), errors)

    def test_stale_event_artifact_fails(self):
        evidence = self.copy_evidence()
        path = evidence / "verification.json"
        data = json.loads(path.read_text())
        data["started_at"] = "2026-11-25T09:00:00Z"
        data["finished_at"] = "2026-11-25T09:01:00Z"
        path.write_text(json.dumps(data))
        errors = self.validate(evidence)
        self.assertTrue(any("possible stale" in e for e in errors), errors)

    def test_application_packet_metadata_mismatch_fails(self):
        evidence = self.copy_evidence()
        path = evidence / "hosta-events.jsonl"
        rows = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
        for row in rows:
            if row.get("event") == "post_send" and row.get("opcode") == "RDMA_WRITE":
                row["remote_rkey"] += 1
        path.write_text("".join(json.dumps(row) + "\n" for row in rows))
        errors = self.validate(evidence)
        self.assertTrue(any("RETH RKEY" in e for e in errors), errors)

    def test_incomplete_evidence_collection_fails_as_reference_run(self):
        evidence = self.copy_evidence()
        path = evidence / "verification.json"
        data = json.loads(path.read_text())
        del data["experiments"]["d"]
        data["requested_experiments"] = ["a", "b", "c"]
        path.write_text(json.dumps(data))
        errors = validate_evidence.validate_evidence(evidence, write_analysis=False, require_complete=True)[0]
        self.assertTrue(any("partial" in e and "complete A/B/C/D" in e for e in errors), errors)

    def test_empty_capture_fails(self):
        evidence = self.copy_evidence()
        (evidence / "send-recv.pcap").write_bytes(b"")
        errors = self.validate(evidence)
        self.assertTrue(any("empty or truncated capture" in e for e in errors), errors)

    def test_corrupt_capture_fails(self):
        evidence = self.copy_evidence()
        (evidence / "rdma-read.pcap").write_bytes(b"not a real capture but long enough")
        errors = self.validate(evidence)
        self.assertTrue(any("corrupt or undecodable capture" in e for e in errors), errors)


class ChecksumCase(unittest.TestCase):
    def entry(self, digest=GOOD_HASH, separator=" *", name=IMAGE):
        return f"{digest}{separator}{name}\n"

    def test_missing_checksum_entry_fails(self):
        with self.assertRaisesRegex(RuntimeError, "no checksum entry"):
            vm_lab.checksum_for_image(self.entry(name="other.img"), IMAGE)

    def test_invalid_checksum_format_fails(self):
        with self.assertRaisesRegex(RuntimeError, "invalid checksum entry"):
            vm_lab.checksum_for_image(f"not-a-hash *{IMAGE}\n", IMAGE)

    def test_incorrect_checksum_fails_and_image_not_usable(self):
        with tempfile.TemporaryDirectory() as tmp:
            image = Path(tmp) / IMAGE
            payload = b"deliberately wrong"
            image.write_bytes(payload)
            good_entry = self.entry(hashlib.sha256(b"correct image").hexdigest())
            with self.assertRaisesRegex(RuntimeError, "checksum mismatch"):
                vm_lab.verify_image_checksum(image, good_entry)

    def test_correct_checksum_passes(self):
        with tempfile.TemporaryDirectory() as tmp:
            image = Path(tmp) / IMAGE
            payload = b"image bytes"
            image.write_bytes(payload)
            digest = hashlib.sha256(payload).hexdigest()
            self.assertEqual(digest, vm_lab.verify_image_checksum(image, self.entry(digest)))

    def test_ubuntu_checksum_entry_format_passes_parser(self):
        self.assertEqual(GOOD_HASH, vm_lab.checksum_for_image(self.entry(), IMAGE))


if __name__ == "__main__":
    unittest.main()

"""Regression tests for the deterministic browser evidence exporter."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

import export_browser_evidence as exporter  # noqa: E402

REFERENCE = ROOT / "evidence" / "reference-run"
EXPECTED_DIGEST = hashlib.sha256((REFERENCE / "SHA256SUMS").read_bytes()).hexdigest()


class BrowserEvidenceExportCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bundle = exporter.export_bundle(REFERENCE, ROOT, None, copy_assets=False)

    def copy_evidence(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        dest = Path(tmp.name) / "evidence"
        shutil.copytree(REFERENCE, dest)
        return dest

    def test_schema_version_and_complete_experiment_set(self):
        bundle = self.bundle
        self.assertEqual(1, bundle["schemaVersion"])
        self.assertEqual(["resources", "send-recv", "write", "read"], [e["id"] for e in bundle["experiments"]])
        self.assertEqual(["a", "b", "c", "d"], [e["key"] for e in bundle["experiments"]])
        self.assertEqual({0, 2}, {len(e["packets"]) for e in bundle["experiments"]})
        self.assertEqual(0, len(bundle["experiments"][0]["packets"]))
        for experiment in bundle["experiments"][1:]:
            self.assertEqual(2, len(experiment["packets"]))

    def test_source_metadata_and_provenance(self):
        provenance = self.bundle["provenance"]
        self.assertEqual("pass", self.bundle["source"]["validationStatus"])
        self.assertEqual(EXPECTED_DIGEST, provenance["evidenceDigest"])
        self.assertEqual("a208af6ecf4e838d6d2c475ede366494de81a706", provenance["gitCommit"])
        self.assertEqual("causal-and-per-process", self.bundle["clockModel"]["ordering"])
        self.assertFalse(self.bundle["clockModel"]["crossHostSynchronized"])
        self.assertEqual(5, len(self.bundle["sources"]))
        self.assertIn("python/rdma_common.py", {s["path"] for s in self.bundle["sources"]})

    def test_exact_integer_and_hex_representation(self):
        write = next(e for e in self.bundle["experiments"] if e["id"] == "write")
        packet = write["packets"][0]
        self.assertEqual("660293824", packet["reth"]["virtualAddress"]["decimal"])
        self.assertEqual("0x275b48c0", packet["reth"]["virtualAddress"]["hex"])
        self.assertEqual("1154", packet["reth"]["rkey"]["decimal"])
        self.assertEqual("0x482", packet["reth"]["rkey"]["hex"])
        self.assertEqual("53", packet["reth"]["dmaLength"]["decimal"])
        for event in write["events"]:
            self.assertIsInstance(event["tUnixNs"], str)
            int(event["tUnixNs"])

    def test_asymmetric_endpoint_qpns_are_preserved_directionally(self):
        for experiment in self.bundle["experiments"]:
            initiator_qpn = experiment["endpoints"]["initiator"]["qpn"]["decimal"]
            responder_qpn = experiment["endpoints"]["responder"]["qpn"]["decimal"]
            self.assertNotEqual(initiator_qpn, responder_qpn)
            if not experiment["packets"]:
                continue
            request, reverse = experiment["packets"]
            self.assertEqual(responder_qpn, request["destinationQpn"]["decimal"])
            self.assertEqual(initiator_qpn, reverse["destinationQpn"]["decimal"])
            self.assertEqual(request["psn"]["decimal"], reverse["psn"]["decimal"])

    def test_write_application_packet_memory_and_completion_correlation(self):
        write = next(e for e in self.bundle["experiments"] if e["id"] == "write")
        wr = next(w for w in write["workRequests"] if w["kind"] == "rdma-write")
        packet = write["packets"][0]
        ack = write["packets"][1]
        self.assertEqual(wr["remoteAddress"], packet["reth"]["virtualAddress"])
        self.assertEqual(wr["remoteRkey"], packet["reth"]["rkey"])
        self.assertEqual(str(wr["byteLength"]), packet["reth"]["dmaLength"]["decimal"])
        self.assertIn(wr["id"], packet["correlations"]["workRequestIds"])
        self.assertIn(wr["id"], ack["correlations"]["workRequestIds"])
        self.assertFalse([c for c in write["completions"] if c["host"] == "hostb"])
        initiator_cqe = next(c for c in write["completions"] if c["host"] == "hosta")
        self.assertEqual(wr["id"], initiator_cqe["workRequestId"])
        self.assertEqual("SUCCESS", initiator_cqe["status"])
        target_memory = next(m for m in write["memoryRegions"] if m["host"] == "hostb")
        labels = {snapshot["label"] for snapshot in target_memory["snapshots"]}
        self.assertIn("before", labels)
        self.assertIn("after", labels)

    def test_read_request_response_correlation(self):
        read = next(e for e in self.bundle["experiments"] if e["id"] == "read")
        request, response = read["packets"]
        self.assertEqual(12, int(request["opcode"]["decimal"]))
        self.assertEqual(16, int(response["opcode"]["decimal"]))
        self.assertEqual(request["psn"], response["psn"])
        self.assertEqual("21", request["destinationQpn"]["decimal"])
        self.assertEqual("20", response["destinationQpn"]["decimal"])
        self.assertIn("RDMA READ: this secret lives in hostb memory.", response["payloadText"])

    def test_send_receive_wr_id_to_cqe_correlation(self):
        send_recv = next(e for e in self.bundle["experiments"] if e["id"] == "send-recv")
        send_wr = next(w for w in send_recv["workRequests"] if w["kind"] == "send")
        recv_wr = next(w for w in send_recv["workRequests"] if w["kind"] == "receive")
        by_wr = {c["workRequestId"]: c for c in send_recv["completions"]}
        self.assertEqual("SUCCESS", by_wr[send_wr["id"]]["status"])
        self.assertEqual("SUCCESS", by_wr[recv_wr["id"]]["status"])
        self.assertNotEqual(send_wr["wrId"]["decimal"], send_recv["packets"][0]["psn"]["decimal"])

    def test_export_is_deterministic_for_identical_input(self):
        again = exporter.export_bundle(REFERENCE, ROOT, None, copy_assets=False)
        self.assertEqual(json.dumps(self.bundle, sort_keys=True), json.dumps(again, sort_keys=True))

    def test_missing_evidence_fails(self):
        evidence = self.copy_evidence()
        (evidence / "rdma-write.pcap").unlink()
        with self.assertRaisesRegex(exporter.EvidenceExportError, "validation failed"):
            exporter.export_bundle(evidence, ROOT, None, copy_assets=False)

    def test_checksum_mismatch_fails(self):
        evidence = self.copy_evidence()
        capture = evidence / "rdma-write.pcap"
        capture.write_bytes(capture.read_bytes() + b"mutation")
        with self.assertRaisesRegex(exporter.EvidenceExportError, "SHA256SUMS mismatch|validation failed"):
            exporter.export_bundle(evidence, ROOT, None, copy_assets=False)

    def test_malformed_event_log_fails(self):
        evidence = self.copy_evidence()
        with (evidence / "hosta-events.jsonl").open("a") as handle:
            handle.write("not-json\n")
        with self.assertRaisesRegex(exporter.EvidenceExportError, "validation failed"):
            exporter.export_bundle(evidence, ROOT, None, copy_assets=False)

    def test_generated_output_write_and_capture_copy(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "public" / "reference-evidence.json"
            exporter.export_bundle(REFERENCE, ROOT, output, copy_assets=True)
            self.assertTrue(output.exists())
            for name in ("send-recv.pcap", "rdma-write.pcap", "rdma-read.pcap"):
                self.assertEqual((REFERENCE / name).read_bytes(), (output.parent / name).read_bytes())
            written = json.loads(output.read_text())
            self.assertEqual(self.bundle["provenance"], written["provenance"])


if __name__ == "__main__":
    unittest.main()

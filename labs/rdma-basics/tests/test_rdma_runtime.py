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
import struct
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

HOSTA_DATA_IP = "10.10.10.1"
HOSTB_DATA_IP = "10.10.10.2"
REQUEST_OPCODES = {4, 10, 12}  # SEND Only, RDMA WRITE Only, RDMA READ Request


def experiment_key(role):
    parts = str(role).split("-")
    return parts[1] if len(parts) >= 3 and parts[0] == "exp" else None


def make_asymmetric_qp_events(evidence, qpn_delta=8, psn_delta=128):
    """Create a clearly labelled synthetic asymmetric endpoint fixture.

    The genuine reference evidence is copied first and is never modified.  In
    the synthetic copy hostb's local QPNs and initial SQ PSNs are shifted for
    experiments b/c/d.  Reverse-direction packets still use hosta's QPN and
    the originating request PSN, matching RC transport semantics.
    """
    for host in ("hosta", "hostb"):
        path = evidence / f"{host}-events.jsonl"
        rows = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
        for row in rows:
            key = experiment_key(row.get("role"))
            if key not in ("b", "c", "d"):
                continue
            if host == "hostb":
                for field in ("qp_num", "own_qpn"):
                    if field in row:
                        row[field] = int(row[field]) + qpn_delta
                if row.get("event") == "qp_ready":
                    row["sq_psn"] = int(row["sq_psn"]) + psn_delta
                if "own_psn" in row:
                    row["own_psn"] = int(row["own_psn"]) + psn_delta
            else:
                for field in ("dest_qpn", "peer_qpn"):
                    if field in row:
                        row[field] = int(row[field]) + qpn_delta
                if row.get("event") == "qp_ready":
                    row["rq_psn"] = int(row["rq_psn"]) + psn_delta
        path.write_text("".join(json.dumps(row) + "\n" for row in rows))


def mutate_roce_pcap(path, mutator):
    """Mutate BTH QPN/PSN fields in a disposable synthetic pcap copy.

    The captures in this lab use Ethernet/IPv4/UDP with a fixed 20-byte IPv4
    header.  In the 12-byte BTH, byte 0 after the UDP header is the opcode,
    bytes 5-7 are the 24-bit destination QPN, and bytes 9-11 are the 24-bit
    PSN.  UDP checksums are zero in these captures, so changing the synthetic
    fixture payload does not require a transport checksum update.
    """
    data = bytearray(path.read_bytes())
    pos = 24
    frame_index = 0
    while pos + 16 <= len(data):
        _sec, _usec, captured_len, _wire_len = struct.unpack_from("<IIII", data, pos)
        frame_pos = pos + 16
        frame = data[frame_pos:frame_pos+captured_len]
        frame_index += 1
        if len(frame) >= 54 and frame[12:14] == b"\x08\x00" and frame[23] == 17:
            src = ".".join(str(x) for x in frame[26:30])
            dst = ".".join(str(x) for x in frame[30:34])
            opcode = frame[42]
            qpn = int.from_bytes(frame[47:50], "big")
            psn = int.from_bytes(frame[51:54], "big")
            update = mutator(frame_index=frame_index, opcode=opcode, src=src, dst=dst, qpn=qpn, psn=psn) or {}
            if "qpn" in update:
                data[frame_pos+47:frame_pos+50] = int(update["qpn"]).to_bytes(3, "big")
            if "psn" in update:
                data[frame_pos+51:frame_pos+54] = int(update["psn"]).to_bytes(3, "big")
        pos = frame_pos + captured_len
    path.write_bytes(data)


def make_asymmetric_qp_pcaps(evidence, qpn_delta=8):
    def valid_directions(**kwargs):
        if kwargs["src"] == HOSTA_DATA_IP and kwargs["dst"] == HOSTB_DATA_IP and kwargs["opcode"] in REQUEST_OPCODES:
            return {"qpn": kwargs["qpn"] + qpn_delta}
        return {}
    for name in ("send-recv.pcap", "rdma-write.pcap", "rdma-read.pcap"):
        mutate_roce_pcap(evidence / name, valid_directions)


def make_asymmetric_fixture(evidence, qpn_delta=8, psn_delta=128):
    make_asymmetric_qp_events(evidence, qpn_delta=qpn_delta, psn_delta=psn_delta)
    make_asymmetric_qp_pcaps(evidence, qpn_delta=qpn_delta)


class EvidenceTestMixin:

    def copy_evidence(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        dest = Path(tmp.name) / "evidence"
        shutil.copytree(REFERENCE, dest)
        return dest

    def validate(self, evidence):
        return validate_evidence.validate_evidence(evidence, write_analysis=False)[0]



class EvidenceCase(EvidenceTestMixin, unittest.TestCase):
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



class AsymmetricQpnEvidenceCase(EvidenceTestMixin, unittest.TestCase):
    """Synthetic asymmetric endpoint fixtures derived from genuine evidence.

    These tests deliberately mutate only disposable copies.  The committed
    reference-run pcaps and JSONL logs remain genuine integration output.
    """

    def test_valid_bidirectional_packets_with_distinct_qps_pass(self):
        evidence = self.copy_evidence()
        make_asymmetric_fixture(evidence)
        self.assertEqual([], self.validate(evidence))

    def test_incorrect_request_destination_qpn_fails(self):
        evidence = self.copy_evidence()
        make_asymmetric_fixture(evidence)

        def corrupt_write_request(**kwargs):
            if kwargs["opcode"] == 10 and kwargs["src"] == HOSTA_DATA_IP:
                return {"qpn": kwargs["qpn"] + 1}
            return {}

        mutate_roce_pcap(evidence / "rdma-write.pcap", corrupt_write_request)
        errors = self.validate(evidence)
        self.assertTrue(any("RDMA WRITE request: destination QPN" in e for e in errors), errors)

    def test_ack_destination_qpn_direction_is_enforced(self):
        evidence = self.copy_evidence()
        make_asymmetric_fixture(evidence, qpn_delta=8)

        def corrupt_write_ack(**kwargs):
            if kwargs["opcode"] == 17 and kwargs["src"] == HOSTB_DATA_IP:
                # Incorrectly use the responder QPN in the B->A ACK.  The ACK
                # is addressed to hosta, so it must use hosta's local QPN.
                return {"qpn": kwargs["qpn"] + 8}
            return {}

        mutate_roce_pcap(evidence / "rdma-write.pcap", corrupt_write_ack)
        errors = self.validate(evidence)
        self.assertTrue(any("RDMA WRITE ACK: acknowledgement destination QPN" in e for e in errors), errors)

    def test_read_response_destination_qpn_direction_is_enforced(self):
        evidence = self.copy_evidence()
        make_asymmetric_fixture(evidence, qpn_delta=8)

        def corrupt_read_response(**kwargs):
            if kwargs["opcode"] == 16 and kwargs["src"] == HOSTB_DATA_IP:
                # Incorrectly use the responder QPN in the B->A response.  The
                # response is addressed to the reader's local QP on hosta.
                return {"qpn": kwargs["qpn"] + 8}
            return {}

        mutate_roce_pcap(evidence / "rdma-read.pcap", corrupt_read_response)
        errors = self.validate(evidence)
        self.assertTrue(any("RDMA READ response: destination QPN" in e for e in errors), errors)

    def test_read_response_uses_originating_request_psn_not_responder_sq_psn(self):
        evidence = self.copy_evidence()
        make_asymmetric_fixture(evidence, psn_delta=128)

        def corrupt_read_response_psn(**kwargs):
            if kwargs["opcode"] == 16 and kwargs["src"] == HOSTB_DATA_IP:
                # The responder's independent SQ PSN was shifted by 128 in the
                # synthetic fixture.  Using it here is incorrect: reliable-
                # service READ responses start at the originating request PSN.
                return {"psn": kwargs["psn"] + 128}
            return {}

        mutate_roce_pcap(evidence / "rdma-read.pcap", corrupt_read_response_psn)
        errors = self.validate(evidence)
        self.assertTrue(any("RDMA READ response: packet PSN" in e for e in errors), errors)

    def test_ack_psn_must_match_acknowledged_request_psn(self):
        evidence = self.copy_evidence()
        make_asymmetric_fixture(evidence)

        def corrupt_send_ack_psn(**kwargs):
            if kwargs["opcode"] == 17 and kwargs["src"] == HOSTB_DATA_IP:
                return {"psn": kwargs["psn"] + 1}
            return {}

        mutate_roce_pcap(evidence / "send-recv.pcap", corrupt_send_ack_psn)
        errors = self.validate(evidence)
        self.assertTrue(any("SEND/RECEIVE ACK: acknowledgement PSN" in e for e in errors), errors)


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

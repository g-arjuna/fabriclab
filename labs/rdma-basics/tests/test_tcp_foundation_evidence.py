import csv
import hashlib
import json
from pathlib import Path
import subprocess
import unittest

import jsonschema

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
EVIDENCE = ROOT / "evidence" / "tcp-foundation-v1"
EXPORT = REPO / "apps" / "web" / "public" / "practical" / "rdma" / "tcp-foundations-evidence.json"


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_jsonl(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def reconstruct_forward_payload(case):
    case_dir = EVIDENCE / case
    with (case_dir / "tshark-fields.csv").open(newline="") as fh:
        rows = list(csv.DictReader(fh))
    sender = read_jsonl(case_dir / "sender.jsonl")
    receiver = read_jsonl(case_dir / "receiver.jsonl")
    expected_hex = next(event["hex"] for event in sender if event.get("event") == "source_buffer")
    source_ip = next(event["local"][0] for event in sender if event.get("event") == "connect_return")
    forward = []
    for row in rows:
        length = int(row.get("tcp.len") or 0)
        if length and row.get("ip.src") == source_ip:
            forward.append((int(row["frame.number"]), int(row["tcp.seq"]), bytes.fromhex((row.get("tcp.payload") or "").replace(":", ""))))
    base = min(seq for _, seq, _ in forward)
    positions = {}
    for frame, seq, payload in sorted(forward):
        if len(payload) != int(next(row["tcp.len"] for row in rows if int(row["frame.number"]) == frame)):
            raise AssertionError(f"frame {frame} payload length mismatch")
        for index, byte in enumerate(payload):
            pos = seq - base + index
            if pos in positions and positions[pos] != byte:
                raise AssertionError(f"conflicting retransmission byte at {pos}")
            positions.setdefault(pos, byte)
    expected = bytes.fromhex(expected_hex)
    missing = [index for index in range(len(expected)) if index not in positions]
    if missing:
        raise AssertionError(f"missing byte positions {missing[:8]}")
    reconstructed = bytes(positions[index] for index in range(len(expected)))
    verified = next(event["hex"] for event in receiver if event.get("event") == "verify")
    return expected, reconstructed, bytes.fromhex(verified), forward, base


class TcpFoundationEvidenceTests(unittest.TestCase):
    def test_reference_validation_and_checksums(self):
        validation = json.loads((EVIDENCE / "validation.json").read_text())
        self.assertTrue(validation["ok"])
        self.assertEqual({case["case"] for case in validation["cases"]}, {"small-late", "small-early", "large", "loopback"})
        lines = (EVIDENCE / "SHA256SUMS").read_text().splitlines()
        self.assertGreater(len(lines), 20)
        for line in lines:
            digest, name = line.split(None, 1)
            self.assertEqual(digest, sha256(EVIDENCE / name), name)

    def test_browser_export_is_deterministic_and_semantically_valid(self):
        before = EXPORT.read_bytes()
        subprocess.run(["python3", str(ROOT / "scripts" / "export_tcp_browser_evidence.py")], check=True, stdout=subprocess.DEVNULL)
        self.assertEqual(before, EXPORT.read_bytes())
        bundle = json.loads(EXPORT.read_text())
        schema = json.loads((ROOT / "schemas" / "tcp-foundations-evidence-v1.json").read_text())
        jsonschema.validate(bundle, schema)
        small = bundle["cases"]["small-late"]
        large = bundle["cases"]["large"]
        self.assertEqual([event["count"] for event in small["receiveEvents"]], [2, 2, 1])
        self.assertIn("Recv-Q", small["ssSnapshots"]["after-send-before-read"])
        self.assertIn(" 5 ", small["ssSnapshots"]["after-send-before-read"])
        self.assertEqual([segment["tcpPayloadLength"] for segment in large["payloadSegments"]], [1448, 1448, 1200])
        self.assertEqual([[segment["relativeSequenceStart"], segment["relativeSequenceEndExclusive"]] for segment in large["payloadSegments"]], [[1, 1449], [1449, 2897], [2897, 4097]])
        self.assertEqual(small["payloadSegments"][0]["payloadHex"], "48454c4c4f")
        self.assertTrue(all(case["validation"]["ok"] for case in bundle["cases"].values()))

    def test_full_capture_payloads_tuples_public_pcaps_and_operator_gates(self):
        bundle = json.loads(EXPORT.read_text())
        for name in ("small-late", "small-early", "large", "loopback"):
            case_dir = EVIDENCE / name
            exported = bundle["cases"][name]
            expected, reconstructed, verified, forward, base = reconstruct_forward_payload(name)
            self.assertEqual(reconstructed, expected, name)
            self.assertEqual(verified, expected, name)
            self.assertEqual(exported["browserValidation"]["validated"], True, name)
            self.assertEqual(exported["browserValidation"]["bytes"], len(expected), name)
            connect = next(e for e in read_jsonl(case_dir / "sender.jsonl") if e.get("event") == "connect_return")
            tuple_values = exported["endpoints"]
            self.assertEqual(tuple_values["senderLocal"], connect["local"], name)
            self.assertEqual(tuple_values["senderPeer"], connect["peer"], name)
            self.assertEqual((case_dir / f"{name}.pcap").read_bytes(), (EXPORT.parent / f"{name}.pcap").read_bytes(), name)
            operators = json.loads((case_dir / "operator-log.json").read_text())
            self.assertEqual(exported["operatorEvents"], operators, name)
            times = {event.get("gate", event["event"]): event["monotonic_ns"] for event in operators}
            if name == "small-late":
                self.assertLess(times["observed_after_send_before_read"], times["receiver_before_first_read"])
                self.assertIn("Recv-Q", exported["ssSnapshots"]["after-send-before-read"])
            if name == "small-early":
                self.assertLess(times["observed_receiver_waiting_before_send"], times["sender_before_send"])
            ranges = exported["browserValidation"]["applicationRanges"]
            self.assertEqual(sum(item["endExclusive"] - item["start"] for item in ranges), len(expected), name)
            self.assertEqual([item["start"] for item in ranges], sorted(item["start"] for item in ranges), name)


if __name__ == "__main__":
    unittest.main()

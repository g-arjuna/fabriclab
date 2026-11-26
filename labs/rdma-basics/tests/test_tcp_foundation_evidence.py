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


if __name__ == "__main__":
    unittest.main()

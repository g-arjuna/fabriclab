#!/usr/bin/env python3
"""Export the validated TCP foundation artifacts into a deterministic browser bundle."""
import csv
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
EVIDENCE = ROOT / "evidence" / "tcp-foundation-v1"
OUT = REPO / "apps" / "web" / "public" / "practical" / "rdma" / "tcp-foundations-evidence.json"
PUBLIC = OUT.parent
CASES = ["small-late", "small-early", "large", "loopback"]


def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def read_jsonl(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def compact_event(event):
    item = dict(event)
    hexvalue = item.get("hex")
    if isinstance(hexvalue, str) and len(hexvalue) > 96:
        raw = bytes.fromhex(hexvalue)
        item["hex"] = raw[:24].hex() + "…" + raw[-24:].hex()
        item["hexTruncated"] = True
        item["hexSha256"] = hashlib.sha256(raw).hexdigest()
    return item


def rows_for(case_dir):
    with (case_dir / "tshark-fields.csv").open(newline="") as fh:
        rows = list(csv.DictReader(fh))
    packets = []
    for row in rows:
        length = int(row.get("tcp.len") or 0)
        payload = row.get("tcp.payload") or ""
        compact_payload = payload
        truncated = False
        if len(payload) > 96:
            raw = bytes.fromhex(payload)
            compact_payload = raw[:24].hex() + "…" + raw[-24:].hex()
            truncated = True
        packets.append({
            "frameNumber": int(row["frame.number"]),
            "frameLength": int(row["frame.len"]),
            "capturedLength": int(row["frame.cap_len"]),
            "sourceIp": row.get("ip.src") or "",
            "destinationIp": row.get("ip.dst") or "",
            "sourcePort": int(row.get("tcp.srcport") or 0),
            "destinationPort": int(row.get("tcp.dstport") or 0),
            "flags": row.get("tcp.flags") or "",
            "relativeSequence": int(row.get("tcp.seq") or 0),
            "relativeAcknowledgement": int(row.get("tcp.ack") or 0),
            "tcpPayloadLength": length,
            "payloadHex": compact_payload,
            "payloadHexTruncated": truncated,
            "payloadSha256": hashlib.sha256(bytes.fromhex(payload)).hexdigest() if payload else None,
            "advertisedMss": int(row["tcp.options.mss_val"]) if row.get("tcp.options.mss_val") else None,
        })
    return packets


def validate_reconstruction(packets, sender_events, forward_source):
    expected_hex = next((e.get("hex") for e in sender_events if e.get("event") == "source_buffer"), "")
    forward = [p for p in packets if p["tcpPayloadLength"] > 0 and p["sourceIp"] == forward_source]
    # The teaching captures contain no retransmissions. Validation still keys segments by sequence start.
    unique = {}
    for packet in forward:
        unique[packet["relativeSequence"]] = packet
    reconstructed = bytearray()
    for packet in sorted(unique.values(), key=lambda item: item["relativeSequence"]):
        if packet["payloadHexTruncated"]:
            return {"validated": False, "reason": "export compaction prevents reconstruction", "segments": len(unique)}
        reconstructed.extend(bytes.fromhex(packet["payloadHex"]))
    return {
        "validated": reconstructed.hex() == expected_hex,
        "bytes": len(reconstructed),
        "sha256": hashlib.sha256(reconstructed).hexdigest(),
        "segments": len(unique),
    }


def export_case(name):
    case_dir = EVIDENCE / name
    sender = [compact_event(e) for e in read_jsonl(case_dir / "sender.jsonl")]
    receiver = [compact_event(e) for e in read_jsonl(case_dir / "receiver.jsonl")]
    process = json.loads((case_dir / "process-results.json").read_text())
    validation = json.loads((case_dir / "validation.json").read_text())
    packets = rows_for(case_dir)
    connect = next(e for e in sender if e.get("event") == "connect_return")
    accept = next(e for e in receiver if e.get("event") == "accept_return")
    source_ip = "127.0.0.1" if name == "loopback" else "10.10.10.1"
    forward = sorted((p for p in packets if p["tcpPayloadLength"] > 0 and p["sourceIp"] == source_ip), key=lambda item: item["frameNumber"])
    handshake = packets[:3]
    recv_returns = [e for e in receiver if e.get("event") == "recv_return"]
    ss = {}
    for path in sorted(case_dir.glob("ss-*.txt")):
        ss[path.stem.removeprefix("ss-")] = path.read_text()
    return {
        "id": name,
        "port": process and {"small-late": 5001, "small-early": 5002, "large": 5003, "loopback": 5004}[name],
        "capture": {
            "file": f"{name}.pcap",
            "downloadPath": f"/practical/rdma/{name}.pcap",
            "sha256": sha256(case_dir / f"{name}.pcap"),
            "host": process["capture_host"],
            "interface": process["capture_interface"],
            "command": process["capture_command"],
        },
        "commands": {"sender": process["sender_command"], "receiver": process["receiver_command"]},
        "endpoints": {
            "senderLocal": connect["local"],
            "senderPeer": connect["peer"],
            "receiverLocal": accept["local"],
            "receiverPeer": accept["peer"],
            "senderFd": connect["fd"],
            "receiverFd": accept["fd"],
            "listenerFd": accept["listener_fd"],
        },
        "events": {"sender": sender, "receiver": receiver},
        "handshake": handshake,
        "payloadSegments": [{
            "frameNumber": p["frameNumber"],
            "relativeSequenceStart": p["relativeSequence"],
            "relativeSequenceEndExclusive": p["relativeSequence"] + p["tcpPayloadLength"],
            "tcpPayloadLength": p["tcpPayloadLength"],
            "payloadSha256": p["payloadSha256"],
            "payloadHex": p["payloadHex"] if not p["payloadHexTruncated"] else None,
            "payloadPreviewHex": p["payloadHex"] if p["payloadHexTruncated"] else None,
        } for p in forward],
        "acknowledgements": [{
            "frameNumber": p["frameNumber"],
            "sourceIp": p["sourceIp"],
            "relativeAcknowledgement": p["relativeAcknowledgement"],
        } for p in packets if p["tcpPayloadLength"] == 0 and p["relativeAcknowledgement"]],
        "receiveEvents": [{
            "offset": e["offset"],
            "requested": e["requested"],
            "count": e["count"],
            "monotonicNs": e["monotonic_ns"],
        } for e in recv_returns],
        "ssSnapshots": ss,
        "validation": validation,
        "artifactSha256": {
            "senderJsonl": sha256(case_dir / "sender.jsonl"),
            "receiverJsonl": sha256(case_dir / "receiver.jsonl"),
            "tcpdumpSummary": sha256(case_dir / "tcpdump-summary.txt"),
            "tsharkFields": sha256(case_dir / "tshark-fields.csv"),
        },
    }


def main():
    missing = [name for name in CASES if not (EVIDENCE / name / "validation.json").exists()]
    if missing:
        raise SystemExit(f"missing validated TCP evidence cases: {', '.join(missing)}")
    cases = {name: export_case(name) for name in CASES}
    environment = json.loads((EVIDENCE / "environment.json").read_text())
    provenance = json.loads((EVIDENCE / "provenance.json").read_text())
    bundle = {
        "schemaVersion": "tcp-foundations-browser-v1",
        "kind": "recorded TCP teaching evidence",
        "sequenceNumberPolicy": "TShark relative TCP sequence numbers; SYN consumes one sequence number. Payload positions shown in the browser use relative byte positions, not frame lengths.",
        "capturePointPolicy": "Captured on the receiving VM data0 for the two-host cases and on the software loopback interface for loopback. These are endpoint observations, not invented physical-wire viewpoints.",
        "environment": environment,
        "provenance": provenance,
        "cases": cases,
        "summary": {
            "smallClientPort": cases["small-late"]["endpoints"]["senderLocal"][1],
            "smallHandshakeFrames": [p["frameNumber"] for p in cases["small-late"]["handshake"]],
            "smallReadCounts": [e["count"] for e in cases["small-late"]["receiveEvents"]],
            "largeSegmentLengths": [p["tcpPayloadLength"] for p in cases["large"]["payloadSegments"]],
            "largeSegmentRanges": [[p["relativeSequenceStart"], p["relativeSequenceEndExclusive"]] for p in cases["large"]["payloadSegments"]],
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(bundle, indent=2, sort_keys=True) + "\n")
    for name in CASES:
        source = EVIDENCE / name / f"{name}.pcap"
        target = PUBLIC / f"{name}.pcap"
        target.write_bytes(source.read_bytes())
    print(OUT)


if __name__ == "__main__":
    main()

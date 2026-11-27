#!/usr/bin/env python3
"""Export the validated TCP foundation artifacts into a deterministic browser bundle."""
import csv
import hashlib
import json
from pathlib import Path
import subprocess
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


def clean_hex(value):
    return (value or "").replace(":", "").lower()


def rows_for(case_dir):
    with (case_dir / "tshark-fields.csv").open(newline="") as fh:
        rows = list(csv.DictReader(fh))
    packets = []
    for row in rows:
        length = int(row.get("tcp.len") or 0)
        payload = clean_hex(row.get("tcp.payload"))
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
            "payloadHex": payload,
            "payloadHexTruncated": False,
            "payloadSha256": hashlib.sha256(bytes.fromhex(payload)).hexdigest() if payload else None,
            "advertisedMss": int(row["tcp.options.mss_val"]) if row.get("tcp.options.mss_val") else None,
        })
    return packets


def detailed_rows_for(case_dir, port):
    """Decode immutable captures with TShark; do not invent missing fields."""
    fields = [
        "frame.number", "frame.time_epoch", "frame.len", "frame.cap_len",
        "eth.src", "eth.dst", "eth.type",
        "ip.version", "ip.hdr_len", "ip.dsfield", "ip.id", "ip.flags", "ip.ttl", "ip.proto", "ip.len", "ip.src", "ip.dst",
        "tcp.srcport", "tcp.dstport", "tcp.stream", "tcp.hdr_len", "tcp.len", "tcp.flags",
        "tcp.flags.syn", "tcp.flags.ack", "tcp.flags.push", "tcp.flags.fin",
        "tcp.seq", "tcp.ack", "tcp.window_size_value", "tcp.checksum", "tcp.checksum.status", "tcp.options.mss_val", "tcp.payload",
    ]
    command = [
        "tshark", "-r", str(case_dir / f"{case_dir.name}.pcap"), "-Y", f"tcp.port == {port}", "-T", "fields",
        "-E", "header=y", "-E", "separator=,", "-E", "quote=d",
    ]
    for field in fields:
        command.extend(["-e", field])
    result = subprocess.run(command, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"TShark detailed decode failed for {case_dir.name}: {result.stderr}")
    rows = list(csv.DictReader(result.stdout.splitlines()))
    decoded = []
    for row in rows:
        payload = clean_hex(row.get("tcp.payload"))
        decoded.append({
            "frameNumber": int(row["frame.number"]),
            "timeEpoch": row.get("frame.time_epoch") or "",
            "frameLength": int(row["frame.len"]),
            "capturedLength": int(row["frame.cap_len"]),
            "ethernet": {"source": row.get("eth.src") or "", "destination": row.get("eth.dst") or "", "type": row.get("eth.type") or ""},
            "ip": {
                "version": row.get("ip.version") or "", "headerLength": int(row.get("ip.hdr_len") or 0), "dsfield": row.get("ip.dsfield") or "",
                "identification": row.get("ip.id") or "", "flags": row.get("ip.flags") or "", "ttl": int(row.get("ip.ttl") or 0),
                "protocol": int(row.get("ip.proto") or 0), "totalLength": int(row.get("ip.len") or 0),
                "source": row.get("ip.src") or "", "destination": row.get("ip.dst") or "",
            },
            "tcp": {
                "sourcePort": int(row.get("tcp.srcport") or 0), "destinationPort": int(row.get("tcp.dstport") or 0), "stream": int(row.get("tcp.stream") or 0),
                "headerLength": int(row.get("tcp.hdr_len") or 0), "payloadLength": int(row.get("tcp.len") or 0), "flags": row.get("tcp.flags") or "",
                "syn": row.get("tcp.flags.syn") == "True", "ack": row.get("tcp.flags.ack") == "True", "psh": row.get("tcp.flags.push") == "True", "fin": row.get("tcp.flags.fin") == "True",
                "relativeSequence": int(row.get("tcp.seq") or 0), "relativeAcknowledgement": int(row.get("tcp.ack") or 0),
                "windowSize": int(row.get("tcp.window_size_value") or 0), "checksum": row.get("tcp.checksum") or "", "checksumStatus": row.get("tcp.checksum.status") or "",
                "advertisedMss": int(row["tcp.options.mss_val"]) if row.get("tcp.options.mss_val") else None,
            },
            "payloadHex": payload,
            "payloadSha256": hashlib.sha256(bytes.fromhex(payload)).hexdigest() if payload else None,
        })
    return decoded


def validate_reconstruction(packets, sender_events, receiver_events, forward_source):
    """Reconstruct forward stream bytes from full, uncompacted capture payload ranges."""
    errors = []
    expected_hex = next((e.get("hex") for e in sender_events if e.get("event") == "source_buffer"), "")
    verified_hex = next((e.get("hex") for e in receiver_events if e.get("event") == "verify"), "")
    forward = [p for p in packets if p["tcpPayloadLength"] > 0 and p["sourceIp"] == forward_source]
    if not forward:
        errors.append("no forward payload rows")
        return {"validated": False, "errors": errors}
    base_sequence = min(p["relativeSequence"] for p in forward)
    positions = {}
    for packet in sorted(forward, key=lambda item: (item["relativeSequence"], item["frameNumber"])):
        payload = bytes.fromhex(packet["payloadHex"])
        if len(payload) != packet["tcpPayloadLength"]:
            errors.append(f"frame {packet['frameNumber']}: payload hex length does not match tcp.len")
            continue
        start = packet["relativeSequence"] - base_sequence
        for index, byte in enumerate(payload):
            position = start + index
            if position in positions and positions[position] != byte:
                errors.append(f"conflicting retransmission byte at application offset {position}")
            positions.setdefault(position, byte)
    if not positions:
        errors.append("forward payloads did not reconstruct any byte positions")
        reconstructed = b""
    else:
        expected_length = len(bytes.fromhex(expected_hex)) if expected_hex else max(positions) + 1
        missing = [index for index in range(expected_length) if index not in positions]
        if missing:
            errors.append(f"missing application byte positions: {missing[:8]}{'…' if len(missing) > 8 else ''}")
        extra = [index for index in sorted(positions) if index >= expected_length]
        if extra:
            errors.append(f"unexpected payload bytes beyond application length: first {extra[0]}")
        reconstructed = bytes(positions.get(index, 0) for index in range(expected_length))
    if expected_hex and reconstructed.hex() != expected_hex:
        errors.append("reconstructed capture payload differs from sender source buffer")
    if verified_hex and expected_hex and verified_hex != expected_hex:
        errors.append("verified receiver buffer differs from sender source buffer")
    ranges = [{"frameNumber": p["frameNumber"], "start": p["relativeSequence"] - base_sequence, "endExclusive": p["relativeSequence"] - base_sequence + p["tcpPayloadLength"]} for p in forward]
    return {
        "validated": not errors,
        "errors": errors,
        "bytes": len(reconstructed),
        "sha256": hashlib.sha256(reconstructed).hexdigest(),
        "segments": len(forward),
        "baseSequence": base_sequence,
        "applicationRanges": ranges,
    }


def export_case(name):
    case_dir = EVIDENCE / name
    sender_raw = read_jsonl(case_dir / "sender.jsonl")
    receiver_raw = read_jsonl(case_dir / "receiver.jsonl")
    sender = [compact_event(e) for e in sender_raw]
    receiver = [compact_event(e) for e in receiver_raw]
    process = json.loads((case_dir / "process-results.json").read_text())
    validation = json.loads((case_dir / "validation.json").read_text())
    packets = rows_for(case_dir)
    detailed_packets = detailed_rows_for(case_dir, process and {"small-late": 5001, "small-early": 5002, "large": 5003, "loopback": 5004}[name])
    operator_events = json.loads((case_dir / "operator-log.json").read_text())
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
        "operatorEvents": operator_events,
        "packets": detailed_packets,
        "handshake": handshake,
        "payloadSegments": [{
            "frameNumber": p["frameNumber"],
            "relativeSequenceStart": p["relativeSequence"],
            "relativeSequenceEndExclusive": p["relativeSequence"] + p["tcpPayloadLength"],
            "tcpPayloadLength": p["tcpPayloadLength"],
            "payloadSha256": p["payloadSha256"],
            "payloadHex": p["payloadHex"],
            "payloadPreviewHex": (p["payloadHex"][:48] + "…" + p["payloadHex"][-48:]) if len(p["payloadHex"]) > 96 else None,
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
        "browserValidation": validate_reconstruction(packets, sender_raw, receiver_raw, source_ip),
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

#!/usr/bin/env python3
"""Validate and explain the committed rdma-basics evidence.

The checks in this file deliberately correlate three independent sources:
verification status, structured application events, and decoded RoCEv2 packets.
They are small and inspectable so reviewers can audit exactly what is proven.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import subprocess
import sys
from pathlib import Path

OPCODES = {
    "send_only": 4,
    "write_only": 10,
    "read_request": 12,
    "read_response_only": 16,
    "ack": 17,
}
EXPERIMENTS = ("a", "b", "c", "d")
CAPTURES = {"b": "send-recv.pcap", "c": "rdma-write.pcap", "d": "rdma-read.pcap"}
ROLES = {
    "a": ("a", "b"),
    "b": ("sender", "receiver"),
    "c": ("writer", "target"),
    "d": ("reader", "source"),
}


class ValidationError(RuntimeError):
    pass


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def load_json(path: Path, errors: list[str]):
    try:
        return json.loads(path.read_text())
    except Exception as exc:  # deliberately broad: report corrupt evidence uniformly
        fail(errors, f"{path.name}: invalid JSON: {exc}")
        return {}


def load_events(path: Path, errors: list[str]) -> list[dict]:
    events = []
    if not path.exists():
        fail(errors, f"missing required evidence file: {path.name}")
        return events
    for lineno, line in enumerate(path.read_text().splitlines(), 1):
        if not line.strip():
            continue
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError as exc:
            fail(errors, f"{path.name}:{lineno}: invalid JSONL: {exc}")
    if not events:
        fail(errors, f"{path.name}: no application events")
    return events


def first(events: list[dict], **criteria):
    for event in events:
        if all(event.get(key) == value for key, value in criteria.items()):
            return event
    return None


def all_events(events: list[dict], **criteria):
    return [event for event in events if all(event.get(key) == value for key, value in criteria.items())]


def parse_time(value: str) -> dt.datetime:
    return dt.datetime.fromisoformat(value.replace("Z", "+00:00"))


def tshark_packets(pcap: Path, errors: list[str]) -> list[dict]:
    if not pcap.exists():
        fail(errors, f"missing required evidence file: {pcap.name}")
        return []
    if pcap.stat().st_size <= 24:
        fail(errors, f"{pcap.name}: empty or truncated capture")
        return []
    proc = subprocess.run(
        ["tshark", "-r", str(pcap), "-Y", "udp.port==4791", "-T", "json"],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if proc.returncode != 0:
        fail(errors, f"{pcap.name}: corrupt or undecodable capture: {proc.stderr.strip()}")
        return []
    try:
        packets = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        fail(errors, f"{pcap.name}: tshark returned invalid JSON: {exc}")
        return []
    if not packets:
        fail(errors, f"{pcap.name}: no UDP/4791 RoCEv2 packets decoded")
    return packets


def packet_fields(packet: dict) -> dict:
    layers = packet["_source"]["layers"]
    ib = layers.get("infiniband", {})
    bth = ib.get("infiniband.bth_tree", {})
    reth = ib.get("infiniband.reth_tree", {})
    return {
        "frame": int(layers["frame"]["frame.number"]),
        "time_epoch": float(layers["frame"]["frame.time_epoch"]),
        "src": layers.get("ip", {}).get("ip.src"),
        "dst": layers.get("ip", {}).get("ip.dst"),
        "udp_dstport": int(layers.get("udp", {}).get("udp.dstport", "0")),
        "opcode": int(bth.get("infiniband.bth.opcode", "-1")),
        "qpn": int(str(bth.get("infiniband.bth.destqp", "0x0")), 16),
        "psn": int(bth.get("infiniband.bth.psn", "-1")),
        "va": int(str(reth.get("infiniband.reth.va", "0x0")), 16),
        "rkey": int(str(reth.get("infiniband.reth.r_key", "0x0")), 16),
        "dmalen": int(reth.get("infiniband.reth.dmalen", "0")),
    }


def require(condition: bool, errors: list[str], message: str) -> None:
    if not condition:
        fail(errors, message)


def validate_common(evidence: Path, errors: list[str], expected_experiments=EXPERIMENTS) -> tuple[dict, dict, dict, list[str]]:
    required = ["environment.json", "verification.json", "hosta-events.jsonl", "hostb-events.jsonl"]
    for name in required:
        if not (evidence / name).exists():
            fail(errors, f"missing required evidence file: {name}")
    verification = load_json(evidence / "verification.json", errors) if (evidence / "verification.json").exists() else {}
    environment = load_json(evidence / "environment.json", errors) if (evidence / "environment.json").exists() else {}
    events = {
        "hosta": load_events(evidence / "hosta-events.jsonl", errors),
        "hostb": load_events(evidence / "hostb-events.jsonl", errors),
    }
    experiments = verification.get("experiments", {}) if isinstance(verification, dict) else {}
    missing = [key for key in expected_experiments if key not in experiments]
    if missing:
        fail(errors, "verification.json is not a complete A/B/C/D run; missing: " + ", ".join(missing))
    if verification.get("overall") != "pass":
        fail(errors, f"verification overall status is {verification.get('overall')!r}, expected 'pass'")
    for key in expected_experiments:
        result = experiments.get(key, {})
        if result.get("status") != "pass":
            fail(errors, f"experiment {key}: verification status is {result.get('status')!r}")
        for host in ("hosta", "hostb"):
            if result.get(f"{host}_exit") != 0:
                fail(errors, f"experiment {key}: {host} exit code is {result.get(f'{host}_exit')!r}")
        for host, role in zip(("hosta", "hostb"), ROLES[key]):
            log_name = f"{host}-exp-{key}-{role}.log"
            if not (evidence / log_name).exists():
                fail(errors, f"missing required host log: {log_name}")
            elif (evidence / log_name).stat().st_size == 0:
                fail(errors, f"empty host log: {log_name}")
    captured = []
    for key, capture in CAPTURES.items():
        if key in expected_experiments and (evidence / capture).exists():
            captured.append(key)
    return verification, environment, events, captured


def validate_freshness(evidence: Path, verification: dict, events: dict, packet_data: dict[str, list[dict]], errors: list[str]) -> None:
    try:
        started = parse_time(verification["started_at"]).timestamp()
        finished = parse_time(verification["finished_at"]).timestamp()
    except Exception:
        fail(errors, "verification.json lacks parseable started_at/finished_at timestamps")
        return
    # A small tolerance accounts for clock rounding and capture startup ordering.
    started -= 2.0
    finished += 2.0
    for host, items in events.items():
        stamps = [item.get("t_unix_ns", 0) / 1_000_000_000 for item in items if item.get("t_unix_ns")]
        if not stamps:
            fail(errors, f"{host}: no event timestamps; stale-artifact freshness cannot be proven")
            continue
        if min(stamps) < started or max(stamps) > finished:
            fail(errors, f"{host}: event timestamps outside verification run window; possible stale evidence")
    for key, packets in packet_data.items():
        stamps = [pkt["time_epoch"] for pkt in packets]
        if stamps and (min(stamps) < started or max(stamps) > finished):
            fail(errors, f"{CAPTURES[key]}: packet timestamps outside verification run window; possible stale capture")


def validate_send_recv(events: dict, packets: list[dict], errors: list[str]) -> dict:
    writer = first(events["hosta"], role="exp-b-sender", event="post_send")
    ready = first(events["hosta"], role="exp-b-sender", event="qp_ready")
    recv_cqe = first(events["hostb"], role="exp-b-receiver", event="cqe", tag="recv")
    send_cqe = first(events["hosta"], role="exp-b-sender", event="cqe", tag="send")
    verify = first(events["hostb"], role="exp-b-receiver", event="verify")
    require(writer is not None and ready is not None, errors, "SEND/RECEIVE: missing application post/qp metadata")
    if not (writer and ready):
        return {}
    expected_qpn = int(ready["dest_qpn"])
    expected_psn = int(ready["sq_psn"])
    candidates = [p for p in packets if p["opcode"] == OPCODES["send_only"] and p["src"] == "10.10.10.1" and p["dst"] == "10.10.10.2"]
    require(len(candidates) == 1, errors, f"SEND/RECEIVE: expected one SEND Only request, decoded {len(candidates)}")
    if candidates:
        pkt = candidates[0]
        require(pkt["udp_dstport"] == 4791, errors, "SEND/RECEIVE: destination UDP port is not 4791")
        require(pkt["qpn"] == expected_qpn, errors, f"SEND/RECEIVE: packet QPN {pkt['qpn']} != application QPN {expected_qpn}")
        require(pkt["psn"] == expected_psn, errors, f"SEND/RECEIVE: packet PSN {pkt['psn']} != application initial PSN {expected_psn}")
    require(send_cqe is not None and send_cqe.get("status") == "SUCCESS", errors, "SEND/RECEIVE: sender completion missing or unsuccessful")
    require(recv_cqe is not None and recv_cqe.get("status") == "SUCCESS", errors, "SEND/RECEIVE: receiver completion missing or unsuccessful")
    require(verify is not None and verify.get("ok") is True, errors, "SEND/RECEIVE: receiver payload verification did not pass")
    return {"qpn": expected_qpn, "psn": expected_psn, "length": writer.get("byte_len")}


def validate_write(events: dict, packets: list[dict], errors: list[str]) -> dict:
    post = first(events["hosta"], role="exp-c-writer", event="post_send", opcode="RDMA_WRITE")
    ready = first(events["hosta"], role="exp-c-writer", event="qp_ready")
    cqe = first(events["hosta"], role="exp-c-writer", event="cqe", tag="write")
    complete = first(events["hosta"], role="exp-c-writer", event="write_complete")
    target_resources = first(events["hostb"], role="exp-c-target", event="resources") or first(events["hostb"], role="target", event="resources")
    target_verify = first(events["hostb"], role="exp-c-target", event="buffer_after")
    target_poll = first(events["hostb"], role="exp-c-target", event="target_cq_poll")
    target_recvs = all_events(events["hostb"], role="exp-c-target", event="post_recv")
    require(post is not None and ready is not None and target_resources is not None, errors, "RDMA WRITE: missing application metadata")
    if not (post and ready and target_resources):
        return {}
    expected = {
        "qpn": int(ready["dest_qpn"]),
        "psn": int(ready["sq_psn"]),
        "va": int(post["remote_addr"]),
        "rkey": int(post["remote_rkey"]),
        "dmalen": int(post["byte_len"]),
    }
    require(expected["va"] == int(target_resources["mr_addr"]), errors, "RDMA WRITE: writer remote address does not match target MR address")
    require(expected["rkey"] == int(target_resources["mr_rkey"]), errors, "RDMA WRITE: writer RKEY does not match target MR RKEY")
    candidates = [p for p in packets if p["opcode"] == OPCODES["write_only"] and p["src"] == "10.10.10.1" and p["dst"] == "10.10.10.2"]
    require(len(candidates) == 1, errors, f"RDMA WRITE: expected one RDMA WRITE Only packet, decoded {len(candidates)}")
    if candidates:
        pkt = candidates[0]
        require(pkt["udp_dstport"] == 4791, errors, "RDMA WRITE: destination UDP port is not 4791")
        for field, label in (("qpn", "QPN"), ("psn", "PSN"), ("va", "RETH VA"), ("rkey", "RETH RKEY"), ("dmalen", "RETH DMA length")):
            require(pkt[field] == expected[field], errors, f"RDMA WRITE: packet {label} {pkt[field]} != application value {expected[field]}")
    acks = [p for p in packets if p["opcode"] == OPCODES["ack"] and p["qpn"] == expected["qpn"] and p["psn"] == expected["psn"]]
    require(bool(acks), errors, "RDMA WRITE: matching ACK packet not decoded")
    require(cqe is not None and cqe.get("status") == "SUCCESS", errors, "RDMA WRITE: initiator completion missing or unsuccessful")
    require(complete is not None and complete.get("status") == "SUCCESS", errors, "RDMA WRITE: application did not report successful completion")
    require(not target_recvs, errors, "RDMA WRITE: target posted a receive WR; ordinary-WRITE proof is invalid")
    require(target_poll is not None and target_poll.get("npolled") == 0, errors, "RDMA WRITE: target observed a receive CQE or poll evidence is missing")
    require(target_verify is not None and target_verify.get("ok") is True and target_verify.get("payload_ok") is True and target_verify.get("target_cqe_count") == 0, errors, "RDMA WRITE: target buffer verification/no-CQE check did not pass")
    return expected


def validate_read(events: dict, packets: list[dict], errors: list[str]) -> dict:
    post = first(events["hosta"], role="exp-d-reader", event="post_send", opcode="RDMA_READ")
    ready = first(events["hosta"], role="exp-d-reader", event="qp_ready")
    cqe = first(events["hosta"], role="exp-d-reader", event="cqe", tag="read")
    complete = first(events["hosta"], role="exp-d-reader", event="read_complete")
    require(post is not None and ready is not None, errors, "RDMA READ: missing application metadata")
    if not (post and ready):
        return {}
    expected = {
        "qpn": int(ready["dest_qpn"]),
        "psn": int(ready["sq_psn"]),
        "va": int(post["remote_addr"]),
        "rkey": int(post["remote_rkey"]),
        "dmalen": int(post["byte_len"]),
    }
    requests = [p for p in packets if p["opcode"] == OPCODES["read_request"] and p["src"] == "10.10.10.1" and p["dst"] == "10.10.10.2"]
    responses = [p for p in packets if p["opcode"] == OPCODES["read_response_only"] and p["src"] == "10.10.10.2" and p["dst"] == "10.10.10.1"]
    require(len(requests) == 1, errors, f"RDMA READ: expected one READ Request, decoded {len(requests)}")
    require(len(responses) == 1, errors, f"RDMA READ: expected one READ response Only, decoded {len(responses)}")
    for label, group in (("request", requests), ("response", responses)):
        if group:
            pkt = group[0]
            require(pkt["udp_dstport"] == 4791, errors, f"RDMA READ {label}: destination UDP port is not 4791")
            require(pkt["qpn"] == expected["qpn"], errors, f"RDMA READ {label}: packet QPN {pkt['qpn']} != application QPN {expected['qpn']}")
            require(pkt["psn"] == expected["psn"], errors, f"RDMA READ {label}: packet PSN {pkt['psn']} != application PSN {expected['psn']}")
    if requests:
        pkt = requests[0]
        for field, label in (("va", "RETH VA"), ("rkey", "RETH RKEY"), ("dmalen", "RETH DMA length")):
            require(pkt[field] == expected[field], errors, f"RDMA READ request: packet {label} {pkt[field]} != application value {expected[field]}")
    require(cqe is not None and cqe.get("status") == "SUCCESS", errors, "RDMA READ: reader completion missing or unsuccessful")
    require(complete is not None and complete.get("ok") is True and complete.get("verify") == "payload_match", errors, "RDMA READ: application data validation did not pass")
    return expected


def opcode_name(opcode: int) -> str:
    names = {4: "SEND Only", 10: "RDMA WRITE Only", 12: "RDMA READ Request", 16: "RDMA READ response Only", 17: "Acknowledge"}
    return names.get(opcode, f"opcode {opcode}")


def packet_line(pkt: dict) -> str:
    base = f"  frame {pkt['frame']}: {pkt['src']} -> {pkt['dst']} udp-dport={pkt['udp_dstport']} opcode={opcode_name(pkt['opcode'])} qpn=0x{pkt['qpn']:x} psn={pkt['psn']}"
    if pkt["dmalen"]:
        base += f" va=0x{pkt['va']:x} rkey=0x{pkt['rkey']:x} dmalen={pkt['dmalen']}"
    return base


def render_analysis(packet_data: dict[str, list[dict]], metadata: dict[str, dict]) -> str:
    lines = [
        "FabricLab rdma-basics packet analysis",
        "=====================================",
        "",
        "This file is generated by scripts/validate_evidence.py from the application",
        "event logs and packet captures in this evidence directory. QPNs, PSNs,",
        "virtual addresses, and RKEYs are runtime values from this execution only.",
        "",
    ]
    sections = {"b": ("SEND/RECEIVE", "send-recv.pcap"), "c": ("RDMA WRITE", "rdma-write.pcap"), "d": ("RDMA READ", "rdma-read.pcap")}
    for key, (title, capture) in sections.items():
        meta = metadata.get(key, {})
        lines += [f"{title} ({capture})", "-" * (len(title) + len(capture) + 3)]
        if meta:
            desc = f"Application metadata: qpn=0x{meta.get('qpn', 0):x} psn={meta.get('psn')}"
            if meta.get("va") is not None:
                desc += f" remote_addr=0x{meta.get('va', 0):x} remote_rkey=0x{meta.get('rkey', 0):x} byte_len={meta.get('dmalen')}"
            lines += [desc + ".", ""]
        lines += [packet_line(pkt) for pkt in packet_data.get(key, [])]
        if key == "c":
            lines += ["", "The target posted no receive WR, observed no target CQE, and verified the payload after explicit control-channel synchronisation."]
        lines.append("")
    lines += [
        "ICMP/ARP/ICMPv6 frames, when present, are capture-readiness or neighbour-discovery traffic and are not RDMA operations.",
        "The TCP control channel uses ctrl0 (192.168.100.0/24) and is absent from these data0 captures.",
        "",
    ]
    return "\n".join(lines)


def validate_checksum_manifest(evidence: Path, errors: list[str]) -> None:
    manifest = evidence / "SHA256SUMS"
    if not manifest.exists():
        fail(errors, "missing required evidence file: SHA256SUMS")
        return
    entries = {}
    for line in manifest.read_text().splitlines():
        match = re.fullmatch(r"([0-9a-f]{64})  (.+)", line)
        if not match:
            fail(errors, f"SHA256SUMS: malformed entry: {line!r}")
            continue
        entries[match.group(2)] = match.group(1)
    expected_names = sorted(p.name for p in evidence.iterdir() if p.is_file() and p.name != "SHA256SUMS")
    if sorted(entries) != expected_names:
        fail(errors, "SHA256SUMS entries do not exactly cover the collected evidence files")
    import hashlib
    for name, digest in entries.items():
        actual = hashlib.sha256((evidence / name).read_bytes()).hexdigest()
        if actual != digest:
            fail(errors, f"SHA256SUMS mismatch for {name}")


def validate_evidence(evidence: Path, *, write_analysis: bool = True, verify_checksums: bool = False, require_complete: bool = True) -> tuple[list[str], str, list[str]]:
    errors: list[str] = []
    preliminary = {}
    verification_path = evidence / "verification.json"
    if verification_path.exists():
        preliminary = load_json(verification_path, [])
    requested = preliminary.get("requested_experiments") or list((preliminary.get("experiments") or {}).keys())
    expected_experiments = [key for key in EXPERIMENTS if key in requested]
    if not expected_experiments:
        expected_experiments = list(EXPERIMENTS)
    if require_complete and expected_experiments != list(EXPERIMENTS):
        fail(errors, "evidence is partial; refusing to present it as a complete A/B/C/D reference run")
    verification, environment, events, captured = validate_common(evidence, errors, expected_experiments)
    packet_data: dict[str, list[dict]] = {}
    for key, capture in CAPTURES.items():
        if key in expected_experiments:
            packet_data[key] = [packet_fields(pkt) for pkt in tshark_packets(evidence / capture, errors)]
    validate_freshness(evidence, verification, events, packet_data, errors)
    metadata = {}
    if "b" in packet_data:
        metadata["b"] = validate_send_recv(events, packet_data["b"], errors)
    if "c" in packet_data:
        metadata["c"] = validate_write(events, packet_data["c"], errors)
    if "d" in packet_data:
        metadata["d"] = validate_read(events, packet_data["d"], errors)
    analysis = render_analysis(packet_data, metadata)
    analysis_path = evidence / "packet-analysis.txt"
    if write_analysis:
        if not errors:
            analysis_path.write_text(analysis)
        elif not analysis_path.exists():
            fail(errors, "packet-analysis.txt missing and validation failed, so it cannot be regenerated")
    elif not analysis_path.exists():
        fail(errors, "missing required evidence file: packet-analysis.txt")
    if verify_checksums:
        validate_checksum_manifest(evidence, errors)
    return errors, analysis, captured


def main(argv=None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("evidence", nargs="?", default="reference-run", help="evidence directory or name under ../evidence")
    parser.add_argument("--no-write-analysis", action="store_true")
    parser.add_argument("--verify-checksums", action="store_true")
    args = parser.parse_args(argv)
    path = Path(args.evidence)
    if not path.is_absolute() and not path.exists():
        path = Path(__file__).resolve().parents[1] / "evidence" / args.evidence
    errors, _analysis, captured = validate_evidence(path, write_analysis=not args.no_write_analysis, verify_checksums=args.verify_checksums)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print(f"evidence validation: OK ({path})")
    print("captured experiments: " + ", ".join(captured))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

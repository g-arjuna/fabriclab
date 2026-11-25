#!/usr/bin/env python3
"""Export validated rdma-basics evidence as a deterministic browser bundle.

The exporter is intentionally offline-only: it reads the committed reference
run, validates it (including SHA256SUMS), decodes the real pcaps with tshark,
and emits one static JSON document plus downloadable copies of the captures.
The Next.js application consumes those static assets and never needs Python,
Docker, KVM, or tshark at build time.
"""
from __future__ import annotations

import argparse
import hashlib
import os
import json
import shutil
import struct
import subprocess
import sys
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

import validate_evidence  # noqa: E402

SCHEMA_VERSION = 1
JS_SAFE_INTEGER = 2**53 - 1
CAPTURES = {"b": "send-recv.pcap", "c": "rdma-write.pcap", "d": "rdma-read.pcap"}
EXPERIMENT_ORDER = ("a", "b", "c", "d")
EXPERIMENT_IDS = {
    "a": "resources",
    "b": "send-recv",
    "c": "write",
    "d": "read",
}
TITLES = {
    "a": "From Python Objects to RDMA Resources",
    "b": "Two-Sided RDMA: SEND and RECEIVE",
    "c": "One-Sided RDMA: Writing Directly Into Remote Memory",
    "d": "One-Sided RDMA: Reading Remote Memory",
}
OBJECTIVES = {
    "a": "Understand the verbs resources that must exist before RDMA communication begins.",
    "b": "Follow a two-sided SEND from a posted send work request to a received payload and completions on both endpoints.",
    "c": "Follow a one-sided RDMA WRITE from Python into remote memory and the genuine RoCEv2 packets on the wire.",
    "d": "Follow a one-sided RDMA READ request/response exchange and understand why it differs from WRITE.",
}
ROLE_INFO = {
    "a": {"initiator": ("hosta", "exp-a-a", "Host A", "resource endpoint"), "responder": ("hostb", "exp-a-b", "Host B", "resource endpoint")},
    "b": {"initiator": ("hosta", "exp-b-sender", "Host A", "sender"), "responder": ("hostb", "exp-b-receiver", "Host B", "receiver")},
    "c": {"initiator": ("hosta", "exp-c-writer", "Host A", "writer"), "responder": ("hostb", "exp-c-target", "Host B", "target")},
    "d": {"initiator": ("hosta", "exp-d-reader", "Host A", "reader"), "responder": ("hostb", "exp-d-source", "Host B", "source")},
}
SOURCE_BY_EXPERIMENT = {
    "a": "exp_a_resources.py",
    "b": "exp_b_send_recv.py",
    "c": "exp_c_write.py",
    "d": "exp_d_read.py",
}
OPCODE_ROLES = {
    4: "request",
    10: "request",
    12: "request",
    16: "response",
    17: "acknowledgement",
}

# Lightweight semantic anchors for important generated source references.  This
# deliberately avoids a Python parser while still catching stale hard-coded line
# ranges when the underlying Pyverbs implementation changes.
CODE_REFERENCE_ANCHORS = {
    "Open device and log capabilities": ("open_ib", "open_device"),
    "Query port and select RoCEv2 GID": ("query_port", "gid"),
    "local_gid helper": ("def local_gid", "GID"),
    "Allocate resources": ("pd_mod.PD", "new_memory_region", "make_qp"),
    "Memory-region and QP helpers": ("def new_memory_region", "def make_qp"),
    "Control-channel metadata exchange": ("ctrl", "qpn"),
    "Bring QP to RTS": ("bring_qp_to_rts", "qp_ready"),
    "RESET → INIT → RTR → RTS helper": ("to_init", "to_rtr", "to_rts"),
    "QP state helper": ("to_init", "to_rtr", "to_rts"),
    "Create resources and connect control channel": ("build_resources", "ctrl"),
    "build_resources helper": ("def build_resources", "new_memory_region", "make_qp"),
    "exchange_and_connect helper": ("exchange", "bring_qp_to_rts"),
    "Post receive WR and signal readiness": ("RecvWR", "post_recv"),
    "Write payload and post SEND": ("SendWR", "IBV_WR_SEND", "post_send"),
    "Poll receive completion and verify payload": ("poll_one_cqe", "recv_complete"),
    "poll_one_cqe helper": ("def poll_one_cqe", "cq.poll"),
    "Poll sender completion": ("poll_one_cqe", "send_complete"),
    "Initialise target buffer and register memory": ("buffer_before", "new_memory_region"),
    "exchange_meta helper": ("def exchange_meta", "rkey"),
    "Exchange metadata and reach RTS": ("exchange_meta", "bring_qp_to_rts"),
    "Build and post RDMA WRITE": ("IBV_WR_RDMA_WRITE", "set_wr_rdma", "post_send"),
    "Poll writer completion and signal target": ("poll_one_cqe", "write_done"),
    "Synchronise, poll target CQ, verify memory": ("target_cq_poll", "buffer_after"),
    "Populate source memory and create resources": ("buffer_before", "new_memory_region"),
    "Share metadata and bring QP to RTS": ("metadata_exchange", "bring_qp_to_rts"),
    "Build and post RDMA READ": ("IBV_WR_RDMA_READ", "set_wr_rdma", "post_send"),
    "Poll read completion and verify bytes": ("poll_one_cqe", "read_complete"),
    "Source waits and confirms no CQE": ("source_cq_poll", "read_done"),
}


class EvidenceExportError(RuntimeError):
    pass


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text())


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def exact_int(value: int | str) -> dict[str, str]:
    number = int(value)
    return {"decimal": str(number), "hex": hex(number)}


def optional_exact_int(value: Any) -> dict[str, str] | None:
    if value is None:
        return None
    return exact_int(value)


def js_safe_value(value: Any) -> Any:
    """Preserve exactness for integers JavaScript cannot represent exactly."""
    if isinstance(value, bool) or value is None or isinstance(value, str):
        return value
    if isinstance(value, int):
        return value if abs(value) <= JS_SAFE_INTEGER else str(value)
    if isinstance(value, float):
        return value
    if isinstance(value, list):
        return [js_safe_value(item) for item in value]
    if isinstance(value, dict):
        return {str(key): js_safe_value(item) for key, item in sorted(value.items())}
    return str(value)


def compact_hex(value: str | None) -> str | None:
    if value is None:
        return None
    return value.replace(":", "").lower()


def hex_text(hex_value: str | None, byte_len: int | None = None) -> str | None:
    if not hex_value:
        return None
    data = bytes.fromhex(hex_value)
    if byte_len is not None:
        data = data[:byte_len]
    stripped = data.rstrip(b"\x00")
    try:
        return stripped.decode("utf-8")
    except UnicodeDecodeError:
        return None


def read_sources(lab_root: Path) -> list[dict[str, Any]]:
    sources = []
    for name in ("rdma_common.py", "exp_a_resources.py", "exp_b_send_recv.py", "exp_c_write.py", "exp_d_read.py"):
        path = lab_root / "python" / name
        if not path.exists():
            raise EvidenceExportError(f"missing required Python source: {path}")
        text = path.read_text()
        sources.append({
            "path": f"python/{name}",
            "sha256": sha256_bytes(text.encode()),
            "lineCount": len(text.splitlines()),
            "lines": [{"number": number, "text": line} for number, line in enumerate(text.splitlines(), 1)],
        })
    return sources


def normalise_events(events: list[dict[str, Any]], key: str) -> list[dict[str, Any]]:
    records = []
    for event in events:
        role = str(event.get("role"))
        if not role.startswith(f"exp-{key}-"):
            continue
        seq = int(event.get("seq", 0))
        event_id = f"{key}:{event.get('host')}:{role}:{seq}"
        fields = {k: js_safe_value(v) for k, v in sorted(event.items()) if k not in {"seq", "t_unix_ns", "host", "role", "event"}}
        records.append({
            "id": event_id,
            "host": event.get("host"),
            "role": role,
            "type": event.get("event"),
            "sequence": seq,
            "tUnixNs": str(event.get("t_unix_ns", "0")),
            "fields": fields,
        })
    return records


def find_event(events: list[dict[str, Any]], role: str | None = None, event_type: str | None = None, host: str | None = None) -> dict[str, Any] | None:
    for event in events:
        if role is not None and event.get("role") != role:
            continue
        if event_type is not None and event.get("type") != event_type:
            continue
        if host is not None and event.get("host") != host:
            continue
        return event
    return None


def find_events(events: list[dict[str, Any]], event_type: str) -> list[dict[str, Any]]:
    return [event for event in events if event.get("type") == event_type]


def field(event: dict[str, Any] | None, name: str, default: Any = None) -> Any:
    if event is None:
        return default
    return event.get("fields", {}).get(name, default)


def endpoint_record(events: list[dict[str, Any]], host: str, role: str, label: str, role_name: str) -> dict[str, Any]:
    resources = find_event(events, role=role, event_type="resources", host=host)
    ready = find_event(events, role=role, event_type="qp_ready", host=host)
    metadata = find_event(events, role=role, event_type="metadata_exchange", host=host)
    if resources is None or ready is None:
        raise EvidenceExportError(f"missing resource or QP-ready metadata for {host}/{role}")
    return {
        "host": host,
        "hostLabel": label,
        "role": role,
        "roleName": role_name,
        "qpn": exact_int(field(ready, "qp_num")),
        "destinationQpn": exact_int(field(ready, "dest_qpn")),
        "sqPsn": exact_int(field(ready, "sq_psn")),
        "rqPsn": exact_int(field(ready, "rq_psn")),
        "qpState": field(ready, "state"),
        "gid": field(metadata, "own_gid"),
        "peerGid": field(metadata, "peer_gid"),
        "memoryRegion": {
            "address": exact_int(field(resources, "mr_addr")),
            "length": field(resources, "mr_len", 4096),
            "lkey": exact_int(field(resources, "mr_lkey")),
            "rkey": exact_int(field(resources, "mr_rkey")),
        },
        "resourceEventId": resources["id"],
        "qpReadyEventId": ready["id"],
        "metadataEventId": metadata["id"] if metadata else None,
    }


def work_requests(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    requests = []
    for event in events:
        if event["type"] not in {"post_send", "post_recv"}:
            continue
        f = event["fields"]
        opcode = f.get("opcode", "RECEIVE")
        kind = {
            "SEND": "send",
            "RDMA_WRITE": "rdma-write",
            "RDMA_READ": "rdma-read",
            "RECEIVE": "receive",
        }.get(str(opcode), str(opcode).lower().replace("_", "-"))
        wr = {
            "id": f"wr:{event['id']}",
            "eventId": event["id"],
            "host": event["host"],
            "role": event["role"],
            "kind": kind,
            "opcode": opcode,
            "wrId": exact_int(f.get("wr_id", 0)),
            "byteLength": f.get("byte_len", f.get("buf_len")),
        }
        if f.get("addr") is not None:
            wr["localAddress"] = exact_int(f["addr"])
        if f.get("local_sge_addr") is not None:
            wr["localAddress"] = exact_int(f["local_sge_addr"])
        if f.get("lkey") is not None:
            wr["localLkey"] = exact_int(f["lkey"])
        if f.get("local_lkey") is not None:
            wr["localLkey"] = exact_int(f["local_lkey"])
        if f.get("remote_addr") is not None:
            wr["remoteAddress"] = exact_int(f["remote_addr"])
        if f.get("remote_rkey") is not None:
            wr["remoteRkey"] = exact_int(f["remote_rkey"])
        if f.get("payload") is not None:
            wr["payloadText"] = f["payload"]
        requests.append(wr)
    return requests


def completions(events: list[dict[str, Any]], requests: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_wr_host = {(r["host"], r["wrId"]["decimal"]): r for r in requests}
    result = []
    for event in find_events(events, "cqe"):
        f = event["fields"]
        wr_id = str(f.get("wr_id"))
        wr = by_wr_host.get((event["host"], wr_id))
        result.append({
            "id": f"cqe:{event['id']}",
            "eventId": event["id"],
            "host": event["host"],
            "role": event["role"],
            "tag": f.get("tag"),
            "wrId": exact_int(wr_id),
            "workRequestId": wr["id"] if wr else None,
            "opcode": f.get("opcode"),
            "status": f.get("status"),
            "byteLength": f.get("byte_len"),
            "qpNum": exact_int(f.get("qp_num", 0)),
            "isTargetCompletion": event["host"] == "hostb" and f.get("tag") in {"write", "read"},
        })
    return result


def pcap_frames(path: Path) -> dict[int, bytes]:
    data = path.read_bytes()
    if len(data) < 24:
        raise EvidenceExportError(f"{path.name}: truncated pcap global header")
    magic = data[:4]
    if magic == b"\xd4\xc3\xb2\xa1":
        endian = "<"
        scale = 1_000_000
    elif magic == b"\xa1\xb2\xc3\xd4":
        endian = ">"
        scale = 1_000_000
    elif magic == b"\x4d\x3c\xb2\xa1":
        endian = "<"
        scale = 1_000_000_000
    elif magic == b"\xa1\xb2\x3c\x4d":
        endian = ">"
        scale = 1_000_000_000
    else:
        raise EvidenceExportError(f"{path.name}: unsupported pcap magic {magic.hex()}")
    frames: dict[int, bytes] = {}
    pos = 24
    number = 1
    while pos + 16 <= len(data):
        _sec, _frac, captured_len, _wire_len = struct.unpack_from(endian + "IIII", data, pos)
        frame_pos = pos + 16
        if frame_pos + captured_len > len(data):
            raise EvidenceExportError(f"{path.name}: truncated frame {number}")
        frames[number] = data[frame_pos:frame_pos + captured_len]
        pos = frame_pos + captured_len
        number += 1
    if pos != len(data):
        raise EvidenceExportError(f"{path.name}: trailing partial pcap data")
    return frames


def tshark_json(pcap: Path) -> list[dict[str, Any]]:
    proc = subprocess.run(
        ["tshark", "-r", str(pcap), "-Y", "udp.port==4791", "-T", "json"],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if proc.returncode != 0:
        raise EvidenceExportError(f"{pcap.name}: tshark decode failed: {proc.stderr.strip()}")
    return json.loads(proc.stdout)


def tree_field(name: str, value: Any, annotation: str | None = None) -> dict[str, Any]:
    item = {"name": name, "value": str(value)}
    if annotation:
        item["annotation"] = annotation
    return item


def build_protocol_tree(layers: dict[str, Any], packet: dict[str, Any]) -> list[dict[str, Any]]:
    frame = layers["frame"]
    eth = layers.get("eth", {})
    ip = layers.get("ip", {})
    udp = layers.get("udp", {})
    ib = layers.get("infiniband", {})
    bth = ib.get("infiniband.bth_tree", {})
    reth = ib.get("infiniband.reth_tree", {})
    data = layers.get("data", {})
    tree = [
        {
            "protocol": "Frame",
            "fields": [
                tree_field("Frame number", frame.get("frame.number")),
                tree_field("Captured length", f"{frame.get('frame.cap_len')} bytes"),
                tree_field("Wire length", f"{frame.get('frame.len')} bytes"),
                tree_field("Epoch time", frame.get("frame.time_epoch"), "Capture timestamp on the recording host interface."),
            ],
        },
        {
            "protocol": "Ethernet II",
            "fields": [
                tree_field("Destination", eth.get("eth.dst")),
                tree_field("Source", eth.get("eth.src")),
                tree_field("Type", eth.get("eth.type"), "IPv4 EtherType in this capture."),
            ],
        },
        {
            "protocol": "Internet Protocol Version 4",
            "fields": [
                tree_field("Source", ip.get("ip.src")),
                tree_field("Destination", ip.get("ip.dst")),
                tree_field("Protocol", ip.get("ip.proto"), "17 is UDP."),
                tree_field("TTL", ip.get("ip.ttl")),
                tree_field("Total length", ip.get("ip.len")),
            ],
        },
        {
            "protocol": "User Datagram Protocol",
            "fields": [
                tree_field("Source port", udp.get("udp.srcport")),
                tree_field("Destination port", udp.get("udp.dstport"), "UDP destination port 4791 identifies RoCEv2."),
                tree_field("Length", udp.get("udp.length")),
                tree_field("Checksum", udp.get("udp.checksum")),
            ],
        },
    ]
    bth_fields = [
        tree_field("Opcode", f"{packet['opcode']['decimal']} ({packet['opcodeName']})", "RC transport opcode decoded from the captured BTH."),
        tree_field("Destination QP", packet["destinationQpn"]["hex"], "This names the receiving endpoint's local queue pair, not necessarily the sender's QPN."),
        tree_field("Packet sequence number", packet["psn"]["decimal"], "Per-QP reliable-transport sequence number."),
        tree_field("Partition key", bth.get("infiniband.bth.p_key")),
        tree_field("Pad count", bth.get("infiniband.bth.padcnt")),
        tree_field("Ack requested", bth.get("infiniband.bth.a")),
    ]
    tree.append({"protocol": "InfiniBand Base Transport Header (BTH)", "fields": bth_fields})
    if reth:
        tree.append({
            "protocol": "RDMA Extended Transport Header (RETH)",
            "fields": [
                tree_field("Virtual address", packet["reth"]["virtualAddress"]["hex"], "Remote memory address supplied through application metadata."),
                tree_field("R_Key", packet["reth"]["rkey"]["hex"], "Remote memory key authorising access to the target memory region."),
                tree_field("DMA length", packet["reth"]["dmaLength"]["decimal"], "Transfer length in bytes."),
            ],
        })
    if data:
        tree.append({
            "protocol": "RDMA payload bytes",
            "fields": [
                tree_field("Captured data length", f"{data.get('data.len')} bytes"),
                tree_field("Data", compact_hex(data.get("data.data")), "Includes any transport padding bytes present on the wire."),
            ],
        })
    return tree


def decode_packets(evidence: Path, key: str, requests: list[dict[str, Any]], completions_list: list[dict[str, Any]]) -> list[dict[str, Any]]:
    capture = CAPTURES.get(key)
    if capture is None:
        return []
    pcap = evidence / capture
    frames = pcap_frames(pcap)
    decoded = []
    write_or_read_wr = next((r for r in requests if r["kind"] in {"rdma-write", "rdma-read"}), None)
    send_wr = next((r for r in requests if r["kind"] == "send"), None)
    byte_len = None
    if write_or_read_wr:
        byte_len = int(write_or_read_wr["byteLength"])
    elif send_wr:
        byte_len = int(send_wr["byteLength"])

    for raw_packet in tshark_json(pcap):
        common = validate_evidence.packet_fields(raw_packet)
        layers = raw_packet["_source"]["layers"]
        ib = layers.get("infiniband", {})
        bth = ib.get("infiniband.bth_tree", {})
        reth = ib.get("infiniband.reth_tree", {})
        data_hex = compact_hex((layers.get("data") or {}).get("data.data"))
        payload_hex = data_hex[: byte_len * 2] if data_hex and byte_len else data_hex
        frame_number = common["frame"]
        raw_frame = frames.get(frame_number)
        if raw_frame is None:
            raise EvidenceExportError(f"{capture}: decoded RoCE frame {frame_number} missing from pcap byte stream")
        opcode = common["opcode"]
        packet_id = f"{key}:packet:{frame_number}"
        packet: dict[str, Any] = {
            "id": packet_id,
            "captureFile": capture,
            "downloadPath": f"/practical/rdma/{capture}",
            "frameNumber": frame_number,
            "timeEpoch": str(layers["frame"].get("frame.time_epoch")),
            "direction": f"{common['src']}→{common['dst']}",
            "sourceIp": common["src"],
            "destinationIp": common["dst"],
            "sourceHost": "hosta" if common["src"] == "10.10.10.1" else "hostb" if common["src"] == "10.10.10.2" else None,
            "destinationHost": "hosta" if common["dst"] == "10.10.10.1" else "hostb" if common["dst"] == "10.10.10.2" else None,
            "role": OPCODE_ROLES.get(opcode, "transport"),
            "frameLength": int(layers["frame"].get("frame.len", common.get("frame", 0))),
            "capturedLength": int(layers["frame"].get("frame.cap_len", 0)),
            "opcode": exact_int(opcode),
            "opcodeName": validate_evidence.opcode_name(opcode),
            "destinationQpn": exact_int(common["qpn"]),
            "psn": exact_int(common["psn"]),
            "udp": {
                "sourcePort": int((layers.get("udp") or {}).get("udp.srcport", 0)),
                "destinationPort": common["udp_dstport"],
                "length": int((layers.get("udp") or {}).get("udp.length", 0)),
                "checksum": (layers.get("udp") or {}).get("udp.checksum"),
            },
            "bth": {
                "padCount": int(bth.get("infiniband.bth.padcnt", 0)),
                "pKey": exact_int(bth.get("infiniband.bth.p_key", 0)),
                "ackRequested": bth.get("infiniband.bth.a") == "1",
            },
            "dataHex": data_hex,
            "dataLength": int((layers.get("data") or {}).get("data.len", 0)) if layers.get("data") else 0,
            "payloadHex": payload_hex,
            "payloadText": hex_text(payload_hex),
            "rawHex": raw_frame.hex(),
            "correlations": {"workRequestIds": [], "completionIds": [], "eventIds": [], "memoryRegionIds": []},
        }
        if reth:
            packet["reth"] = {
                "virtualAddress": exact_int(common["va"]),
                "rkey": exact_int(common["rkey"]),
                "dmaLength": exact_int(common["dmalen"]),
            }
        packet["protocolTree"] = build_protocol_tree(layers, packet)
        decoded.append(packet)

    # Correlate by validated operation semantics rather than by timestamp order.
    request_packet = next((p for p in decoded if p["role"] == "request"), None)
    reverse_packets = [p for p in decoded if p["role"] in {"acknowledgement", "response"}]
    primary_wr = write_or_read_wr or send_wr
    if request_packet and primary_wr:
        request_packet["correlations"]["workRequestIds"].append(primary_wr["id"])
    if key in {"c", "d"} and primary_wr:
        for p in decoded:
            if primary_wr["id"] not in p["correlations"]["workRequestIds"]:
                p["correlations"]["workRequestIds"].append(primary_wr["id"])
    if key == "b" and send_wr and reverse_packets:
        reverse_packets[0]["correlations"]["workRequestIds"].append(send_wr["id"])
    for completion in completions_list:
        target_packet = None
        if key == "b" and completion["host"] == "hostb":
            target_packet = request_packet
        elif reverse_packets:
            target_packet = reverse_packets[-1]
        if target_packet:
            target_packet["correlations"]["completionIds"].append(completion["id"])
    return decoded


def memory_regions(events: list[dict[str, Any]], endpoints: dict[str, Any], key: str) -> list[dict[str, Any]]:
    regions = []
    for side in ("initiator", "responder"):
        endpoint = endpoints[side]
        resource_event = next(e for e in events if e["id"] == endpoint["resourceEventId"])
        region = {
            "id": f"{key}:memory:{endpoint['host']}",
            "host": endpoint["host"],
            "role": endpoint["role"],
            "address": endpoint["memoryRegion"]["address"],
            "length": endpoint["memoryRegion"]["length"],
            "lkey": endpoint["memoryRegion"]["lkey"],
            "rkey": endpoint["memoryRegion"]["rkey"],
            "resourceEventId": resource_event["id"],
            "snapshots": [],
        }
        before = find_event(events, role=endpoint["role"], event_type="buffer_before", host=endpoint["host"])
        after = find_event(events, role=endpoint["role"], event_type="buffer_after", host=endpoint["host"])
        if before:
            region["snapshots"].append({
                "id": f"{region['id']}:before",
                "label": "before",
                "eventId": before["id"],
                "hex": before["fields"].get("first64"),
                "text": hex_text(before["fields"].get("first64")),
            })
        if after:
            region["snapshots"].append({
                "id": f"{region['id']}:after",
                "label": "after",
                "eventId": after["id"],
                "hex": after["fields"].get("first64"),
                "text": hex_text(after["fields"].get("first64")),
                "verification": {
                    "payloadOk": after["fields"].get("payload_ok"),
                    "targetCqeCount": after["fields"].get("target_cqe_count"),
                    "check": after["fields"].get("verify"),
                },
            })
        recv_complete = find_event(events, role=endpoint["role"], event_type="recv_complete", host=endpoint["host"])
        if recv_complete:
            region["snapshots"].append({
                "id": f"{region['id']}:received",
                "label": "after receive",
                "eventId": recv_complete["id"],
                "hex": recv_complete["fields"].get("payload_hex"),
                "text": hex_text(recv_complete["fields"].get("payload_hex")),
                "verification": {"byteLength": recv_complete["fields"].get("byte_len")},
            })
        read_complete = find_event(events, role=endpoint["role"], event_type="read_complete", host=endpoint["host"])
        if read_complete:
            region["snapshots"].append({
                "id": f"{region['id']}:read-result",
                "label": "after read",
                "eventId": read_complete["id"],
                "hex": read_complete["fields"].get("data"),
                "text": hex_text(read_complete["fields"].get("data")),
                "verification": {"check": read_complete["fields"].get("verify"), "ok": read_complete["fields"].get("ok")},
            })
        regions.append(region)
    return regions


def control_events(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result = []
    for event in events:
        if event["type"] not in {"metadata_exchange", "peer_ready", "write_done_signal", "read_done_signal"}:
            continue
        meaning = {
            "metadata_exchange": "QP and memory metadata observed by the application on the TCP control channel",
            "peer_ready": "application readiness notification observed on the TCP control channel",
            "write_done_signal": "post-completion synchronisation observed by the target; it does not carry the WRITE payload",
            "read_done_signal": "post-completion synchronisation observed by the source; it does not carry the READ payload",
        }[event["type"]]
        result.append({"id": f"ctrl:{event['id']}", "eventId": event["id"], "host": event["host"], "type": event["type"], "meaning": meaning})
    return result


def ids(events: list[dict[str, Any]], role: str, event_type: str) -> list[str]:
    event = find_event(events, role=role, event_type=event_type)
    return [event["id"]] if event else []


def packet_ids(packets: list[dict[str, Any]], opcode: int | None = None) -> list[str]:
    if opcode is None:
        return [p["id"] for p in packets]
    return [p["id"] for p in packets if int(p["opcode"]["decimal"]) == opcode]


def wr_ids(requests: list[dict[str, Any]], kind: str) -> list[str]:
    return [r["id"] for r in requests if r["kind"] == kind]


def cqe_ids(completion_list: list[dict[str, Any]], host: str | None = None) -> list[str]:
    return [c["id"] for c in completion_list if host is None or c["host"] == host]


def step(step_id: str, title: str, kind: str, simple: str, detail: str, *, events=None, packets=None, work_requests_=None, completions_=None, memory=None, code=None, memory_state="none", focus_host=None, plane="data", points=None) -> dict[str, Any]:
    return {
        "id": step_id,
        "title": title,
        "kind": kind,
        "simpleExplanation": simple,
        "explanation": detail,
        "eventIds": events or [],
        "packetIds": packets or [],
        "workRequestIds": work_requests_ or [],
        "completionIds": completions_ or [],
        "memoryRegionIds": memory or [],
        "codeRefs": code or [],
        "memoryState": memory_state,
        "focusHost": focus_host,
        "plane": plane,
        "teachingPoints": points or [],
    }


def code_ref(key: str, start: int, end: int, label: str, common: bool = False) -> dict[str, Any]:
    return {
        "sourcePath": "python/rdma_common.py" if common else f"python/{SOURCE_BY_EXPERIMENT[key]}",
        "startLine": start,
        "endLine": end,
        "label": label,
    }


def build_walkthrough(key: str, events: list[dict[str, Any]], requests: list[dict[str, Any]], completion_list: list[dict[str, Any]], packets: list[dict[str, Any]], memory: list[dict[str, Any]]) -> list[dict[str, Any]]:
    roles = ROLE_INFO[key]
    init_role = roles["initiator"][1]
    resp_role = roles["responder"][1]
    init_host = roles["initiator"][0]
    resp_host = roles["responder"][0]
    init_mem = [f"{key}:memory:{init_host}"]
    resp_mem = [f"{key}:memory:{resp_host}"]
    both_mem = init_mem + resp_mem
    request_pkt = packet_ids(packets, { "b": 4, "c": 10, "d": 12 }.get(key, -1))
    reverse_pkt = packet_ids(packets, 16 if key == "d" else 17)
    send_wr = wr_ids(requests, "send")
    write_wr = wr_ids(requests, "rdma-write")
    read_wr = wr_ids(requests, "rdma-read")
    recv_wr = wr_ids(requests, "receive")
    primary_wr = write_wr or read_wr or send_wr

    if key == "a":
        return [
            step("a-01-open-device", "Open the Soft-RoCE device", "code", "Python asks verbs for a handle to the rxe0 device.", "The application opens a verbs context. Pyverbs is a Python binding to the same RDMA verbs interface used by native RDMA applications.", events=ids(events, init_role, "open_device") + ids(events, resp_role, "open_device"), code=[code_ref(key, 55, 65, "Open device and log capabilities")], focus_host="both", plane="control", points=["A verbs context is the application's handle to an RDMA device.", "Soft-RoCE implements the transport in software for learning; the verbs model is real."]),
            step("a-02-gid", "Find the RoCEv2 GID", "code", "Each host discovers the RoCEv2 GID for its data interface.", "RoCEv2 uses IP-address-derived GIDs. These GIDs are later programmed into the queue pair so the transport knows how to reach the peer.", events=ids(events, init_role, "port_info") + ids(events, resp_role, "port_info"), code=[code_ref(key, 67, 75, "Query port and select RoCEv2 GID"), code_ref(key, 100, 119, "local_gid helper", common=True)], focus_host="both", plane="control"),
            step("a-03-resources", "Create PD, MR, CQ and QP", "resource", "Before data can move, each endpoint creates a protection domain, registers memory, creates a completion queue, and creates a reliable-connected queue pair.", "The memory registration produces local and remote keys. The QP starts in RESET. The CQ is where the application later observes completions; it is not a network packet.", events=ids(events, init_role, "resources") + ids(events, resp_role, "resources"), memory=both_mem, code=[code_ref(key, 77, 89, "Allocate resources"), code_ref(key, 131, 152, "Memory-region and QP helpers", common=True)], memory_state="before", focus_host="both", plane="control", points=["LKEY authorises local access by the RNIC; RKEY is shared for authorised remote access.", "A QP has a send queue and a receive queue."]),
            step("a-04-metadata", "Exchange endpoint metadata", "control", "The hosts exchange QPN, initial PSN and GID over a small TCP control channel.", "This control-channel exchange does not carry application payload. It merely gives each endpoint the values needed to program its QP. The RDMA data captures contain only the separate data interface.", events=ids(events, init_role, "metadata_exchange") + ids(events, resp_role, "metadata_exchange"), code=[code_ref(key, 91, 105, "Control-channel metadata exchange")], focus_host="both", plane="control"),
            step("a-05-qp-state", "Drive the QP RESET → INIT → RTR → RTS", "resource", "Each QP is programmed first with local properties, then peer receive properties, then send properties.", "INIT enables the port and access flags. RTR installs the peer QPN, peer initial send PSN and route. RTS installs the local initial send PSN and retry behaviour. Only RTS permits data work requests.", events=ids(events, init_role, "qp_state") + ids(events, resp_role, "qp_state") + ids(events, init_role, "qp_ready") + ids(events, resp_role, "qp_ready"), code=[code_ref(key, 107, 121, "Bring QP to RTS"), code_ref(key, 155, 191, "RESET → INIT → RTR → RTS helper", common=True)], focus_host="both", plane="control"),
            step("a-06-no-data", "No data operation is posted", "verification", "Experiment A ends with connected QPs but deliberately posts no data work request.", "Because no SEND, WRITE or READ work request is posted, there is no corresponding RDMA data-transfer pcap for Experiment A. FabricLab does not invent one.", events=[], packets=[], focus_host="both", plane="data", points=["The absence of a capture is evidence of correct scope, not missing functionality."]),
        ]

    if key == "b":
        return [
            step("b-01-resources", "Create matching endpoint resources", "resource", "Both endpoints register memory and create a reliable-connected QP.", "The receiver's buffer is where inbound SEND payload bytes can land. The sender has its own source buffer. These are different memory regions on different hosts.", events=ids(events, init_role, "resources") + ids(events, resp_role, "resources"), memory=both_mem, code=[code_ref(key, 88, 99, "Create resources and connect control channel"), code_ref(key, 50, 57, "build_resources helper")], memory_state="before", focus_host="both", plane="control"),
            step("b-02-metadata", "Exchange QPN, PSN and GID", "control", "TCP carries connection metadata, never the RDMA payload.", "Each side programs its QP using the peer's local QPN and initial send PSN. The endpoint QPNs in this recording are genuinely asymmetric.", events=ids(events, init_role, "metadata_exchange") + ids(events, resp_role, "metadata_exchange") + ids(events, init_role, "qp_ready") + ids(events, resp_role, "qp_ready"), code=[code_ref(key, 60, 73, "exchange_and_connect helper")], focus_host="both", plane="control"),
            step("b-03-post-recv", "Receiver posts a receive work request", "work-request", "The receiver tells its QP where a future inbound SEND may land.", "A receive WR is required for two-sided SEND/RECEIVE. It contains buffer location and length; it does not contain payload. Posting it does not put a packet on the wire.", events=ids(events, resp_role, "post_recv"), work_requests_=recv_wr, memory=resp_mem, code=[code_ref(key, 102, 113, "Post receive WR and signal readiness")], focus_host=resp_host, plane="control", points=["The WR ID is application/verbs metadata. It is not a BTH packet field.", "LKEY is local memory access metadata. It is not carried as the remote RKEY in RDMA packets."]),
            step("b-04-post-send", "Sender posts a signalled SEND", "work-request", "After the peer says its receive queue is armed, Host A copies the payload into registered memory and posts a SEND WR.", "The send WR describes the local buffer using an LKEY and requests a signalled completion. Only now does the transport have work that can become a network packet.", events=ids(events, init_role, "peer_ready") + ids(events, init_role, "post_send"), work_requests_=send_wr, memory=init_mem, code=[code_ref(key, 126, 143, "Write payload and post SEND")], focus_host=init_host, plane="control"),
            step("b-05-send-packet", "SEND Only packet crosses the data network", "packet", "Soft-RoCE emits a genuine RoCEv2 SEND Only packet to UDP port 4791.", "The captured BTH destination QPN is the receiver's local QPN. The PSN comes from the sender QP's send sequence. Select the packet to inspect the exact decoded fields from this run.", packets=request_pkt, work_requests_=send_wr, memory=resp_mem, code=[], focus_host="wire", plane="data"),
            step("b-06-receive", "Receiver memory and receive completion", "completion", "Host B receives the bytes in the buffer described by its receive WR and observes a receive completion.", "The receive CQE is a local completion-queue record, not a network packet. The application validates that the bytes in memory exactly match the expected payload.", events=ids(events, resp_role, "cqe") + ids(events, resp_role, "recv_complete") + ids(events, resp_role, "verify"), packets=request_pkt, work_requests_=recv_wr, completions_=cqe_ids(completion_list, resp_host), memory=resp_mem, code=[code_ref(key, 111, 124, "Poll receive completion and verify payload"), code_ref(key, 194, 224, "poll_one_cqe helper", common=True)], memory_state="after", focus_host=resp_host, plane="control"),
            step("b-07-ack-send-cqe", "ACK returns; sender completion is local", "packet", "The responder transport returns an ACK addressed to the sender's local QPN, and Host A observes its signalled send completion.", "This replay does not claim nanosecond ordering of the two hosts' application completion processing. The protocol dependency is narrower: the SEND request must reach the responder before the responder can acknowledge it, and the sender completion is observed on Host A's own CQ.", packets=reverse_pkt, work_requests_=send_wr, completions_=cqe_ids(completion_list, init_host), events=ids(events, init_role, "cqe") + ids(events, init_role, "send_complete"), code=[code_ref(key, 144, 148, "Poll sender completion")], focus_host=init_host, plane="data"),
        ]

    if key == "c":
        return [
            step("c-01-target-memory", "Target prepares remote-writable memory", "memory", "Host B fills a buffer with a known pattern and registers it with remote-write permission.", "Registration pins the memory in the verbs domain and produces keys. The initial bytes are evidence for the before state; no network packet has been sent.", events=ids(events, resp_role, "buffer_before") + ids(events, resp_role, "resources"), memory=resp_mem, code=[code_ref(key, 88, 98, "Initialise target buffer and register memory")], memory_state="before", focus_host=resp_host, plane="control"),
            step("c-02-share-rkey", "Target shares address and RKEY", "control", "The target shares its memory address, length and RKEY over the TCP control channel.", "This metadata authorises and locates remote access. The control message does not contain the WRITE payload and does not mutate memory.", events=ids(events, resp_role, "metadata_exchange") + ids(events, init_role, "metadata_exchange"), memory=resp_mem, code=[code_ref(key, 57, 69, "exchange_meta helper"), code_ref(key, 106, 116, "Exchange metadata and reach RTS")], focus_host="both", plane="control", points=["RKEY is shared remote-access metadata. LKEY remains local to each endpoint.", "The two endpoint QPNs are independent and asymmetric in this recording."]),
            step("c-03-qp-ready", "Both queue pairs reach RTS", "resource", "The writer QP knows the target QPN and initial packet sequence state.", "The forward WRITE packet will name the target's local QPN. The reverse ACK will name the writer's local QPN. Confusing those directions is a common RDMA diagnostic mistake.", events=ids(events, init_role, "qp_ready") + ids(events, resp_role, "qp_ready"), code=[code_ref(key, 111, 116, "Bring QP to RTS"), code_ref(key, 155, 191, "QP state helper", common=True)], focus_host="both", plane="control"),
            step("c-04-post-write", "Writer posts one RDMA WRITE work request", "work-request", "Host A posts a signalled WR whose local SGE points to its source buffer and whose remote fields name Host B memory.", "The work request combines local source metadata (address and LKEY) with remote destination metadata (address and RKEY). The WR ID is not a packet header field.", events=ids(events, init_role, "peer_ready") + ids(events, init_role, "post_send"), work_requests_=write_wr, memory=init_mem + resp_mem, code=[code_ref(key, 119, 139, "Build and post RDMA WRITE")], focus_host=init_host, plane="control"),
            step("c-05-write-packet", "RDMA WRITE Only packet crosses UDP/4791", "packet", "The genuine capture contains one RDMA WRITE Only packet carrying the target VA, RKEY, DMA length and payload bytes.", "Select the packet inspector to compare the RETH address and RKEY with the metadata Host B shared. They match because both came from the same validated run; they are not hard-coded teaching constants.", packets=request_pkt, work_requests_=write_wr, memory=resp_mem, focus_host="wire", plane="data"),
            step("c-06-memory-after", "Remote memory changes without a receive WR", "memory", "The Soft-RoCE transport writes the payload directly into Host B's registered memory.", "Host B posted no receive work request. Ordinary RDMA WRITE does not consume a target receive WR and does not generate a normal receive CQE on the target. The mutation is performed by the RDMA transport, not by the TCP control channel. This step is a protocol-causal illustration rather than a separately timestamped application event; the displayed after-bytes were recorded later, while application verification is revealed only at the final verification milestone.", memory=resp_mem, packets=request_pkt, memory_state="after", focus_host=resp_host, plane="data", points=["This is the defining one-sided property of RDMA WRITE.", "WRITE with immediate data has different receive-side semantics and is not what this experiment uses."]),
            step("c-07-ack-completion", "ACK returns and writer completion is local", "completion", "The target transport acknowledges the request, and Host A receives its own signalled completion.", "The completion means the initiator's requested WRITE operation completed successfully. It is not evidence that the remote application has consumed the data, and it is not a target receive CQE.", packets=reverse_pkt, work_requests_=write_wr, completions_=cqe_ids(completion_list, init_host), events=ids(events, init_role, "cqe") + ids(events, init_role, "write_complete"), code=[code_ref(key, 140, 150, "Poll writer completion and signal target")], focus_host=init_host, plane="data"),
            step("c-08-synchronise-verify", "Separate synchronisation lets the target verify memory", "verification", "Only after an explicit application-level control message does Host B inspect memory.", "The target polls its CQ and observes zero completions, then verifies the payload. The control message is a notification mechanism only; it neither carried the payload nor caused the memory mutation.", events=ids(events, resp_role, "write_done_signal") + ids(events, resp_role, "target_cq_poll") + ids(events, resp_role, "buffer_after"), memory=resp_mem, completions_=[], code=[code_ref(key, 152, 176, "Synchronise, poll target CQ, verify memory")], memory_state="after", focus_host=resp_host, plane="control"),
        ]

    if key == "d":
        return [
            step("d-01-source-memory", "Source populates registered memory", "memory", "Host B writes a known secret into its buffer, registers the memory, and records the before snapshot.", "The source application makes memory readable remotely by sharing the address and RKEY. No responder application work request will be posted for the later transport response.", events=ids(events, resp_role, "buffer_before") + ids(events, resp_role, "resources"), memory=resp_mem, code=[code_ref(key, 66, 82, "Populate source memory and create resources")], memory_state="before", focus_host=resp_host, plane="control"),
            step("d-02-share-access", "Source shares read-access metadata", "control", "Address, length and RKEY travel over TCP as connection metadata.", "This control exchange authorises the later read. It does not transfer the secret payload.", events=ids(events, resp_role, "metadata_exchange") + ids(events, init_role, "metadata_exchange") + ids(events, init_role, "qp_ready") + ids(events, resp_role, "qp_ready"), memory=resp_mem, code=[code_ref(key, 90, 106, "Share metadata and bring QP to RTS")], focus_host="both", plane="control"),
            step("d-03-post-read", "Reader posts an RDMA READ work request", "work-request", "Host A posts a WR describing its own destination buffer and the remote source range.", "The local SGE uses the reader's LKEY; the remote address and RKEY describe the source memory. READ is still initiated from the send queue even though data ultimately flows back toward the reader.", events=ids(events, init_role, "peer_ready") + ids(events, init_role, "post_send"), work_requests_=read_wr, memory=init_mem + resp_mem, code=[code_ref(key, 109, 125, "Build and post RDMA READ")], focus_host=init_host, plane="control"),
            step("d-04-read-request", "READ Request packet asks the source transport for data", "packet", "A genuine READ Request packet carries the remote VA, RKEY and DMA length toward Host B.", "The packet names the responder's local QPN. At this point no payload bytes have returned to Host A.", packets=request_pkt, work_requests_=read_wr, memory=resp_mem, focus_host="wire", plane="data"),
            step("d-05-read-response", "Responder transport returns READ Response Only", "packet", "Host B's RDMA transport reads the authorised memory and returns the data in a response packet.", "The responder application did not post a send WR for this response. The response is generated by the RDMA transport because READ is a request/response operation. Its destination QPN is the reader's local QPN and its PSN begins at the originating request PSN.", packets=reverse_pkt, work_requests_=read_wr, memory=resp_mem, focus_host="wire", plane="data"),
            step("d-06-reader-verify", "Reader completion and payload verification", "completion", "Host A observes a successful RDMA read completion and verifies the bytes that landed in its local buffer.", "The completion is local to the reader. It is correlated to the application WR by WR ID and to the response by protocol causality, not by pretending that the two VM clocks are precisely synchronised.", packets=reverse_pkt, work_requests_=read_wr, completions_=cqe_ids(completion_list, init_host), events=ids(events, init_role, "cqe") + ids(events, init_role, "read_complete"), memory=init_mem, code=[code_ref(key, 126, 134, "Poll read completion and verify bytes")], memory_state="after", focus_host=init_host, plane="control"),
            step("d-07-source-no-cqe", "Source application observes no completion", "verification", "The source receives a later control-channel notification and confirms that its application CQ remained empty.", "The responder side of an RDMA READ does not post a WR, so there is no responder application CQE. This is transport behaviour, not a missing event in the evidence.", events=ids(events, resp_role, "read_done_signal") + ids(events, resp_role, "source_cq_poll"), memory=resp_mem, code=[code_ref(key, 136, 144, "Source waits and confirms no CQE")], focus_host=resp_host, plane="control"),
        ]
    raise EvidenceExportError(f"unknown experiment key {key}")


def validate_json_schema_document(bundle: dict[str, Any], lab_root: Path) -> list[str]:
    """Validate against the versioned JSON Schema.

    Schema validation is mandatory for the offline evidence pipeline.  Install
    labs/rdma-basics/requirements-export.txt before running the exporter; a
    missing dependency is an explicit validation failure rather than a skip.
    """
    schema_path = lab_root / "schemas" / "browser-evidence-v1.json"
    if not schema_path.exists():
        return [f"missing schema document: {schema_path}"]
    try:
        import jsonschema  # type: ignore
    except ImportError:
        return ["missing required schema-validation dependency: install jsonschema from labs/rdma-basics/requirements-export.txt"]
    try:
        schema_document = json.loads(schema_path.read_text())
    except json.JSONDecodeError as exc:
        return [f"schema document is malformed JSON: {exc}"]
    try:
        jsonschema.validate(bundle, schema_document)
    except jsonschema.ValidationError as exc:
        location = ".".join(str(part) for part in exc.absolute_path) or "<root>"
        return [f"schema validation failed at {location}: {exc.message}"]
    except jsonschema.SchemaError as exc:
        return [f"schema document is invalid: {exc.message}"]
    return []


def validate_bundle(bundle: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if bundle.get("schemaVersion") != SCHEMA_VERSION:
        errors.append("schemaVersion mismatch")
    experiments = bundle.get("experiments", [])
    if [e.get("key") for e in experiments] != list(EXPERIMENT_ORDER):
        errors.append("bundle does not contain exactly one complete ordered A/B/C/D experiment set")
    by_key = {e.get("key"): e for e in experiments}
    for key in EXPERIMENT_ORDER:
        exp = by_key.get(key)
        if not exp:
            continue
        endpoint_ids = {exp["endpoints"]["initiator"]["qpn"]["decimal"], exp["endpoints"]["responder"]["qpn"]["decimal"]}
        if len(endpoint_ids) != 2:
            errors.append(f"experiment {key}: endpoint QPNs missing")
        for side in ("initiator", "responder"):
            endpoint = exp["endpoints"][side]
            if endpoint["destinationQpn"]["decimal"] != exp["endpoints"]["responder" if side == "initiator" else "initiator"]["qpn"]["decimal"]:
                errors.append(f"experiment {key}: {side} destination QPN does not name peer local QPN")
    for key, expected_opcode in (("b", 4), ("c", 10), ("d", 12)):
        exp = by_key.get(key, {})
        packets = exp.get("packets", [])
        if len(packets) != 2:
            errors.append(f"experiment {key}: expected exactly two decoded RDMA packets, got {len(packets)}")
            continue
        request = packets[0]
        if int(request["opcode"]["decimal"]) != expected_opcode:
            errors.append(f"experiment {key}: first packet opcode mismatch")
        if request["destinationQpn"]["decimal"] != exp["endpoints"]["responder"]["qpn"]["decimal"]:
            errors.append(f"experiment {key}: request packet does not use responder local QPN")
        reverse = packets[1]
        if reverse["destinationQpn"]["decimal"] != exp["endpoints"]["initiator"]["qpn"]["decimal"]:
            errors.append(f"experiment {key}: reverse packet does not use initiator local QPN")
        if reverse["psn"]["decimal"] != request["psn"]["decimal"]:
            errors.append(f"experiment {key}: reverse packet PSN does not match originating request PSN")
    write = by_key.get("c", {})
    write_wr = next((r for r in write.get("workRequests", []) if r.get("kind") == "rdma-write"), None)
    write_request = write.get("packets", [None])[0]
    if write_wr and write_request:
        reth = write_request.get("reth", {})
        if reth.get("virtualAddress", {}).get("decimal") != write_wr["remoteAddress"]["decimal"]:
            errors.append("WRITE RETH VA does not match application remote address")
        if reth.get("rkey", {}).get("decimal") != write_wr["remoteRkey"]["decimal"]:
            errors.append("WRITE RETH RKEY does not match application remote RKEY")
        if reth.get("dmaLength", {}).get("decimal") != str(write_wr["byteLength"]):
            errors.append("WRITE RETH DMA length does not match application byte length")
    write_target_cqe = [c for c in write.get("completions", []) if c.get("host") == "hostb"]
    if write_target_cqe:
        errors.append("ordinary WRITE bundle incorrectly contains a target CQE")
    if not any(c.get("host") == "hosta" and c.get("status") == "SUCCESS" for c in write.get("completions", [])):
        errors.append("WRITE initiator successful completion missing")
    read = by_key.get("d", {})
    read_packets = read.get("packets", [])
    if len(read_packets) == 2:
        if int(read_packets[1]["opcode"]["decimal"]) != 16:
            errors.append("READ reverse packet is not READ Response Only")
        if read_packets[1]["psn"]["decimal"] != read_packets[0]["psn"]["decimal"]:
            errors.append("READ response PSN does not correlate to request PSN")
    for exp in experiments:
        event_ids = {e["id"] for e in exp.get("events", [])}
        packet_id_set = {p["id"] for p in exp.get("packets", [])}
        wr_id_set = {w["id"] for w in exp.get("workRequests", [])}
        cqe_id_set = {c["id"] for c in exp.get("completions", [])}
        memory_id_set = {m["id"] for m in exp.get("memoryRegions", [])}
        for item in exp.get("walkthrough", []):
            for event_id in item.get("eventIds", []):
                if event_id not in event_ids:
                    errors.append(f"{item['id']}: unknown event id {event_id}")
            for packet_id in item.get("packetIds", []):
                if packet_id not in packet_id_set:
                    errors.append(f"{item['id']}: unknown packet id {packet_id}")
            for wr_id in item.get("workRequestIds", []):
                if wr_id not in wr_id_set:
                    errors.append(f"{item['id']}: unknown work request id {wr_id}")
            for cqe_id in item.get("completionIds", []):
                if cqe_id not in cqe_id_set:
                    errors.append(f"{item['id']}: unknown completion id {cqe_id}")
            for memory_id in item.get("memoryRegionIds", []):
                if memory_id not in memory_id_set:
                    errors.append(f"{item['id']}: unknown memory id {memory_id}")

    sources_by_path = {source.get("path"): source for source in bundle.get("sources", [])}
    for exp in experiments:
        for item in exp.get("walkthrough", []):
            for reference in item.get("codeRefs", []):
                label = reference.get("label", "<unlabelled>")
                prefix = f"{item['id']} code reference {label!r}"
                source_path = reference.get("sourcePath")
                source = sources_by_path.get(source_path)
                if not source:
                    errors.append(f"{prefix}: source file missing from bundle: {source_path}")
                    continue
                start_line = reference.get("startLine")
                end_line = reference.get("endLine")
                if not isinstance(start_line, int) or not isinstance(end_line, int):
                    errors.append(f"{prefix}: line numbers must be integers")
                    continue
                if start_line < 1:
                    errors.append(f"{prefix}: startLine must be >= 1")
                if end_line < start_line:
                    errors.append(f"{prefix}: endLine must be >= startLine")
                if end_line > source.get("lineCount", 0):
                    errors.append(f"{prefix}: endLine exceeds source line count")
                    continue
                lines = source.get("lines", [])
                text = "\n".join(str(line.get("text", "")) for line in lines if start_line <= int(line.get("number", 0)) <= end_line)
                for anchor in CODE_REFERENCE_ANCHORS.get(str(reference.get("label")), ()):
                    if anchor not in text:
                        errors.append(f"{prefix}: semantic anchor {anchor!r} not present in referenced lines")
    return errors


def build_experiment(key: str, evidence: Path, all_events: dict[str, list[dict[str, Any]]], verification: dict[str, Any]) -> dict[str, Any]:
    events = normalise_events(all_events["hosta"] + all_events["hostb"], key)
    events.sort(key=lambda item: (item["host"], item["role"], item["sequence"]))
    endpoints = {}
    for side, (host, role, label, role_name) in ROLE_INFO[key].items():
        endpoints[side] = endpoint_record(events, host, role, label, role_name)
    requests = work_requests(events)
    completion_list = completions(events, requests)
    packets = decode_packets(evidence, key, requests, completion_list)
    memory = memory_regions(events, endpoints, key)
    # Add memory correlation for packet payload placement/read source.
    for packet in packets:
        if key in {"c", "d"} and packet.get("reth"):
            target_memory = f"{key}:memory:hostb"
            if target_memory not in packet["correlations"]["memoryRegionIds"]:
                packet["correlations"]["memoryRegionIds"].append(target_memory)
        if key == "b" and packet["role"] == "request":
            packet["correlations"]["memoryRegionIds"].append(f"{key}:memory:hostb")
    controls = control_events(events)
    verification_record = verification.get("experiments", {}).get(key, {})
    walkthrough = build_walkthrough(key, events, requests, completion_list, packets, memory)
    exp = {
        "id": EXPERIMENT_IDS[key],
        "key": key,
        "title": TITLES[key],
        "objective": OBJECTIVES[key],
        "default": key == "c",
        "script": verification_record.get("script", SOURCE_BY_EXPERIMENT[key]),
        "hosts": {
            "initiator": {"host": endpoints["initiator"]["host"], "roleName": endpoints["initiator"]["roleName"]},
            "responder": {"host": endpoints["responder"]["host"], "roleName": endpoints["responder"]["roleName"]},
        },
        "endpoints": endpoints,
        "events": events,
        "resources": [
            {
                "host": endpoints[side]["host"],
                "role": endpoints[side]["role"],
                "qpn": endpoints[side]["qpn"],
                "memoryRegion": endpoints[side]["memoryRegion"],
                "eventId": endpoints[side]["resourceEventId"],
            }
            for side in ("initiator", "responder")
        ],
        "workRequests": requests,
        "completions": completion_list,
        "packets": packets,
        "memoryRegions": memory,
        "controlEvents": controls,
        "verification": {
            "status": verification_record.get("status"),
            "hostaExit": verification_record.get("hosta_exit"),
            "hostbExit": verification_record.get("hostb_exit"),
            "required": verification_record.get("required"),
        },
        "captureDownload": {
            "path": f"/practical/rdma/{CAPTURES[key]}",
            "fileName": CAPTURES[key],
        } if key in CAPTURES else None,
        "noDataCapture": key == "a",
        "walkthrough": walkthrough,
    }
    return exp


def source_snapshot_relationship(lab_root: Path, execution_commit: str | None, sources: list[dict[str, Any]]) -> dict[str, Any]:
    """Compare embedded sources with stable execution-source provenance.

    The provenance manifest was generated by comparing these files with the
    recorded execution checkout while that Git object was available.  Export-time
    validation deliberately uses the version-controlled manifest, so output does
    not depend on checkout depth or on the local Git object database.
    """
    unverified = {"relationship": "unverified", "method": "execution-source provenance manifest missing, malformed, or inconsistent with the recorded execution checkout"}
    manifest_path = lab_root / "source-provenance.json"
    if not execution_commit:
        return {"relationship": "unverified", "method": "execution checkout missing from environment.json"}
    if not manifest_path.exists():
        return unverified
    try:
        manifest = json.loads(manifest_path.read_text())
    except (json.JSONDecodeError, OSError):
        return unverified
    if manifest.get("schemaVersion") != 1 or manifest.get("executionSourceCheckout") != execution_commit:
        return unverified
    manifest_files = manifest.get("files")
    if not isinstance(manifest_files, dict):
        return unverified

    actual = {source["path"]: source for source in sources}
    expected_paths = set(actual)
    if set(manifest_files) != expected_paths:
        return unverified
    for path, expected in manifest_files.items():
        if not isinstance(expected, dict):
            return unverified
        source = actual[path]
        if expected.get("sha256") != source.get("sha256") or expected.get("lineCount") != source.get("lineCount"):
            return {
                "relationship": "differs-from-verified-execution-source",
                "method": "embedded source SHA-256/line-count comparison against version-controlled execution-source provenance manifest",
            }
    return {
        "relationship": "matches-verified-execution-source",
        "method": "embedded source SHA-256/line-count comparison against version-controlled execution-source provenance manifest",
    }


def write_output_assets_atomically(evidence: Path, output_file: Path, bundle_text: str, *, copy_assets: bool) -> None:
    """Stage complete generated files before atomically replacing public assets.

    A failed write or copy therefore leaves the previously published set intact
    rather than truncating the JSON or one of the captures in place. Individual
    file replacement uses os.replace; there is no portable multi-file atomic
    directory swap for this simple static asset layout.
    """
    destination_dir = output_file.parent
    destination_dir.mkdir(parents=True, exist_ok=True)
    suffix = f".tmp-{os.getpid()}"
    staged: list[tuple[Path, Path]] = []
    try:
        json_staged = output_file.with_name(output_file.name + suffix)
        json_staged.write_text(bundle_text)
        staged.append((json_staged, output_file))
        if copy_assets:
            for capture in CAPTURES.values():
                target = destination_dir / capture
                staged_capture = target.with_name(target.name + suffix)
                shutil.copyfile(evidence / capture, staged_capture)
                if sha256_file(staged_capture) != sha256_file(evidence / capture):
                    raise EvidenceExportError(f"staged capture checksum mismatch: {capture}")
                staged.append((staged_capture, target))
        for staged_path, target in staged:
            os.replace(staged_path, target)
    finally:
        for staged_path, _target in staged:
            if staged_path.exists():
                staged_path.unlink()


def export_bundle(evidence: Path, lab_root: Path, output_file: Path | None = None, *, copy_assets: bool = True) -> dict[str, Any]:
    errors, _analysis, _captured = validate_evidence.validate_evidence(
        evidence,
        write_analysis=False,
        verify_checksums=True,
        require_complete=True,
    )
    if errors:
        raise EvidenceExportError("source evidence validation failed: " + "; ".join(errors))

    verification = load_json(evidence / "verification.json")
    environment = load_json(evidence / "environment.json")
    events = {
        "hosta": load_jsonl(evidence / "hosta-events.jsonl"),
        "hostb": load_jsonl(evidence / "hostb-events.jsonl"),
    }
    sources = read_sources(lab_root)
    experiments = [build_experiment(key, evidence, events, verification) for key in EXPERIMENT_ORDER]
    sums_bytes = (evidence / "SHA256SUMS").read_bytes()
    environment_bytes = (evidence / "environment.json").read_bytes()
    bundle: dict[str, Any] = {
        "schemaVersion": SCHEMA_VERSION,
        "source": {
            "lab": "rdma-basics",
            "transport": "Soft-RoCE",
            "validationStatus": verification.get("overall"),
            "captureInterface": "isolated data0 interface",
            "controlInterface": "separate TCP control channel on ctrl0; not present in data captures",
        },
        "provenance": {
            "evidenceDigest": sha256_bytes(sums_bytes),
            "environmentDigest": sha256_bytes(environment_bytes),
            "gitCommit": environment.get("git_commit"),
            "executionSourceCheckout": environment.get("git_commit"),
            "sourceSnapshot": source_snapshot_relationship(lab_root, environment.get("git_commit"), sources),
            "generatedAt": environment.get("created_at"),
            "referenceRunStartedAt": verification.get("started_at"),
            "referenceRunFinishedAt": verification.get("finished_at"),
            "exporter": "labs/rdma-basics/scripts/export_browser_evidence.py",
        },
        "clockModel": {
            "crossHostSynchronized": False,
            "ordering": "causal-and-per-process",
            "explanation": "The two guests do not have precision-synchronised clocks. The walkthrough is a causal replay built from per-process event order, validated packet direction, work-request relationships, completion relationships and explicit control-channel messages—not a nanosecond-accurate distributed trace.",
        },
        "environment": {
            "architecture": environment.get("architecture"),
            "guests": environment.get("guests"),
            "baseImageSha256": (environment.get("base_image") or {}).get("sha256"),
            "evidenceScope": environment.get("evidence_scope"),
        },
        "hosts": {
            "hosta": {"label": "Host A", "dataIp": "10.10.10.1", "controlIp": "192.168.100.1"},
            "hostb": {"label": "Host B", "dataIp": "10.10.10.2", "controlIp": "192.168.100.2"},
        },
        "sources": sources,
        "experiments": experiments,
    }
    schema_errors = validate_json_schema_document(bundle, lab_root) + validate_bundle(bundle)
    if schema_errors:
        raise EvidenceExportError("generated browser evidence failed schema/correlation validation: " + "; ".join(schema_errors))
    if output_file is not None:
        write_output_assets_atomically(
            evidence,
            output_file,
            json.dumps(bundle, indent=2, sort_keys=True) + "\n",
            copy_assets=copy_assets,
        )
    return bundle


def main(argv=None) -> int:
    lab_root = SCRIPT_DIR.parent
    repo_root = lab_root.parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evidence", type=Path, default=lab_root / "evidence" / "reference-run")
    parser.add_argument("--output", type=Path, default=repo_root / "apps" / "web" / "public" / "practical" / "rdma" / "reference-evidence.json")
    parser.add_argument("--no-copy-assets", action="store_true", help="write JSON only; do not copy capture downloads")
    args = parser.parse_args(argv)
    try:
        bundle = export_bundle(args.evidence, lab_root, args.output, copy_assets=not args.no_copy_assets)
    except EvidenceExportError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    packet_counts = {exp["id"]: len(exp["packets"]) for exp in bundle["experiments"]}
    print(f"browser evidence export: OK ({args.output})")
    print("schema version:", bundle["schemaVersion"])
    print("experiments:", ", ".join(exp["id"] for exp in bundle["experiments"]))
    print("decoded packet counts:", json.dumps(packet_counts, sort_keys=True))
    print("evidence digest:", bundle["provenance"]["evidenceDigest"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

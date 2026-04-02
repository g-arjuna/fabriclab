"use client";

import { useState } from "react";

// StorageFrameAnatomyViz -- Interactive byte-level frame walk for NVMe-oF over RoCEv2
// Shows both SQE capsule SEND frame and RDMA Write first-packet frame

type FrameType = "send" | "write";

interface Field {
  name: string;
  size: number; // bytes
  value: string;
  color: string;
  note: string;
}

const SEND_FIELDS: Field[] = [
  { name: "Dst MAC", size: 6, value: "c4:70:0b:xx:xx:xx", color: "#475569", note: "Storage switch port MAC -- resolved via ARP for the target portal IP" },
  { name: "Src MAC", size: 6, value: "a0:88:c2:xx:xx:xx", color: "#475569", note: "ConnectX-7 storage NIC MAC (enp170s0f0 or enp41s0f0)" },
  { name: "EtherType", size: 2, value: "0x0800", color: "#475569", note: "IPv4" },
  { name: "IP Version/IHL", size: 1, value: "0x45", color: "#64748b", note: "IPv4, no options (IHL=5 x 4 = 20 bytes)" },
  { name: "DSCP/ECN", size: 1, value: "0x68 or 0xB8", color: "#f59e0b", note: "DSCP 26 (0x1A -> 0x68) or DSCP 46 (0x2E -> 0xB8). Site-configurable. ECN bits: 00=not ECN-capable, 10=ECT(0), 11=CE (congestion experienced)" },
  { name: "Total Length", size: 2, value: "0x0082", color: "#64748b", note: "130 bytes: 20 IP + 8 UDP + 12 BTH + 64 SQE capsule + 4 ICRC + 22 Ethernet overhead" },
  { name: "TTL", size: 1, value: "0x40", color: "#64748b", note: "64 -- storage fabric is a single routed hop" },
  { name: "Protocol", size: 1, value: "0x11", color: "#64748b", note: "UDP (17)" },
  { name: "IP Checksum", size: 2, value: "computed", color: "#64748b", note: "CX7 offloads IP checksum computation" },
  { name: "Src IP", size: 4, value: "10.20.1.10", color: "#64748b", note: "DGX node storage interface IP (enp170s0f0)" },
  { name: "Dst IP", size: 4, value: "10.20.2.5", color: "#64748b", note: "Storage appliance NVMe-oF target portal IP" },
  { name: "UDP Src Port", size: 2, value: "0xC4A1", color: "#94a3b8", note: "Ephemeral source port -- provides entropy for ECMP hashing at the storage switch. Derived from QP number hash." },
  { name: "UDP Dst Port", size: 2, value: "0x12B7", color: "#94a3b8", note: "4791 decimal = 0x12B7 -- well-known RoCEv2 port (IANA assigned)" },
  { name: "UDP Length", size: 2, value: "0x006E", color: "#94a3b8", note: "110 bytes: 8 UDP + 12 BTH + 64 SQE capsule + 4 ICRC + 22 padding" },
  { name: "UDP Checksum", size: 2, value: "0x0000", color: "#94a3b8", note: "RoCEv2 sets UDP checksum to 0 -- ICRC provides integrity at the RDMA layer instead" },
  { name: "BTH OpCode", size: 1, value: "0x04", color: "#6366f1", note: "SEND_ONLY -- delivers the SQE capsule in a single frame. The solicited event (SE) bit is set so the target CQ is notified immediately." },
  { name: "BTH SE/MigReq/Pad/TV", size: 1, value: "0x82", color: "#6366f1", note: "SE=1 (solicited event), MigReq=0, PadCount=0, TVer=0" },
  { name: "BTH Partition Key", size: 2, value: "0xFFFF", color: "#6366f1", note: "Default partition key -- all NVMe-oF QPs on the same partition. VLAN-equivalent for RDMA fabrics." },
  { name: "BTH Reserved", size: 1, value: "0x00", color: "#6366f1", note: "Reserved, must be zero" },
  { name: "BTH Queue Pair Number", size: 3, value: "0x00001A", color: "#818cf8", note: "Destination QP number -- the NVMe-oF receive QP on the target. Allocated when the NVMe-oF connection is established." },
  { name: "BTH AckReq/Reserved/PSN", size: 4, value: "0x80001234", color: "#818cf8", note: "AckReq=1 (request ACK for this SEND), PSN=0x001234 -- per-QP packet sequence number. Monotonically incrementing. Target detects PSN gaps as lost packets." },
  { name: "NVMe Opcode", size: 1, value: "0x01", color: "#a78bfa", note: "NVMe command opcode: 0x01 = Write. 0x02 = Read." },
  { name: "NVMe FUSE/PSDT", size: 1, value: "0x00", color: "#a78bfa", note: "FUSE=0 (standalone command), PSDT=0 (SGL for data transfer)" },
  { name: "NVMe Command ID", size: 2, value: "0x0045", color: "#a78bfa", note: "Unique identifier for this command within the submission queue. Used to match CQE back to the SQE." },
  { name: "NVMe NSID", size: 4, value: "0x00000001", color: "#a78bfa", note: "Namespace identifier. NSID=1 is the first namespace on the target subsystem." },
  { name: "NVMe CDW2/CDW3", size: 8, value: "0x00...00", color: "#a78bfa", note: "Command Dword 2 and 3 -- reserved for this opcode" },
  { name: "NVMe Metadata Pointer", size: 8, value: "0x00...00", color: "#a78bfa", note: "Metadata buffer pointer -- not used for basic NVMe-oF writes" },
  { name: "NVMe SGL1 Type/Length", size: 8, value: "0x44 / 0x400000", color: "#c4b5fd", note: "SGL descriptor type 0x44 = SGL_KEYED_DATA_BLOCK. Length = 4194304 bytes (4 MiB checkpoint block)" },
  { name: "NVMe SGL1 Address (RKEY)", size: 8, value: "0x...RKEY...", color: "#c4b5fd", note: "Virtual address and RKEY of the initiator's registered memory region. The target performs RDMA Read against this RKEY to pull the 4 MiB data payload." },
  { name: "NVMe CDW10 (LBA low)", size: 4, value: "0x00080000", color: "#a78bfa", note: "Starting Logical Block Address (lower 32 bits). LBA * 512 bytes = byte offset on the target namespace." },
  { name: "NVMe CDW11 (LBA high)", size: 4, value: "0x00000000", color: "#a78bfa", note: "Starting LBA (upper 32 bits) for >2TB namespaces" },
  { name: "NVMe CDW12 (NLB/DTYPE)", size: 4, value: "0x00001FFF", color: "#a78bfa", note: "NLB = 0x1FFF = 8191. NLB is 0-based: 8192 logical blocks of 512B = 4 MiB. DTYPE = 0 (no directive type)." },
  { name: "ICRC", size: 4, value: "computed", color: "#0f172a", note: "Invariant CRC-32C over all invariant fields in the BTH + payload. Computed by CX7 hardware. The switch never modifies invariant fields, so ICRC survives transit unchanged." },
];

const WRITE_FIELDS: Field[] = [
  { name: "Ethernet + IP + UDP", size: 42, value: "(same outer framing)", color: "#475569", note: "Identical outer headers to the SQE frame. Same src/dst IPs, same UDP dst port 4791." },
  { name: "BTH OpCode", size: 1, value: "0x0D", color: "#0ea5e9", note: "RDMA_READ_RESPONSE_FIRST (0x0D) -- first packet of a multi-packet Read Response stream. Middle packets use 0x0E, last packet 0x0F, single-packet response 0x10. These are sent by the initiator CX7 in response to the target's RDMA Read request." },
  { name: "BTH SE/MigReq/Pad/TV", size: 1, value: "0x00", color: "#0ea5e9", note: "SE=0 for intermediate data frames. The final Read Response packet (opcode 0x0F/0x10) has AckReq=1 so the target sends an ACK back to the initiator." },
  { name: "BTH Partition Key", size: 2, value: "0xFFFF", color: "#0ea5e9", note: "Same partition key as SQE frame" },
  { name: "BTH QPN", size: 3, value: "0x00001A", color: "#0ea5e9", note: "Same NVMe-oF QP. All phases of the exchange share the same QP." },
  { name: "BTH PSN", size: 4, value: "0x80001235", color: "#0ea5e9", note: "PSN incremented from the SQE frame. PSN sequence must be contiguous. A gap triggers an NAK from the target." },
  { name: "AETH (first/last packet only)", size: 4, value: "0x00000000", color: "#38bdf8", note: "ACK Extended Transport Header -- present on the first and last Read Response packet. Syndrome=0x00 indicates success. Only on RDMA_READ_RESPONSE_FIRST (0x0D) and LAST (0x0F)." },
  { name: "Data Payload", size: 4096, value: "checkpoint bytes", color: "#bae6fd", note: "Raw model weight bytes DMA-read by the initiator CX7 from its registered DRAM MR (host CPU path) or GPU HBM (GDS path). This payload lands in the target storage appliance's receive buffer, keyed by the RKEY the target supplied in its RDMA Read request." },
  { name: "ICRC", size: 4, value: "computed", color: "#0f172a", note: "CRC32C over invariant BTH + RETH + payload. Each packet has its own ICRC." },
];

const FRAME_TOTALS: Record<FrameType, { frames: string; overhead: string; payload: string }> = {
  send: {
    frames: "1 frame (SQE capsule is 64 bytes -- fits in one frame)",
    overhead: "~134 bytes of headers + framing",
    payload: "64-byte NVMe SQE command",
  },
  write: {
    frames: "~1024 RDMA Read Response frames for a 4 MiB transfer at 4096-byte MTU",
    overhead: "~50 bytes per frame (Ethernet + IP + UDP + BTH + AETH on first/last + ICRC)",
    payload: "Up to 4096 bytes of checkpoint data per frame",
  },
};

export function StorageFrameAnatomyViz() {
  const [frameType, setFrameType] = useState<FrameType>("send");
  const [selected, setSelected] = useState<number | null>(null);

  const fields = frameType === "send" ? SEND_FIELDS : WRITE_FIELDS;
  const totals = FRAME_TOTALS[frameType];
  const selectedField = selected !== null ? fields[selected] : null;

  // Build a proportional byte bar
  const totalBytes = fields.reduce((s, f) => s + (f.size > 100 ? 100 : f.size), 0);

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 780 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
          Storage Frame Anatomy
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
          NVMe-oF over RoCEv2 -- Field-by-Field
        </div>
      </div>

      {/* Frame type selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {(["send", "write"] as FrameType[]).map((t) => (
          <button
            key={t}
            onClick={() => { setFrameType(t); setSelected(null); }}
            style={{
              padding: "7px 18px",
              borderRadius: 6,
              border: `1px solid ${frameType === t ? "#6366f1" : "#334155"}`,
              background: frameType === t ? "#6366f122" : "transparent",
              color: frameType === t ? "#818cf8" : "#94a3b8",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: "monospace",
              fontWeight: frameType === t ? 700 : 400,
            }}
          >
            {t === "send" ? "SQE SEND frame (Phase 1)" : "RDMA Read Response frame (Phase 2)"}
          </button>
        ))}
      </div>

      {/* Visual byte bar */}
      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        <div style={{ display: "flex", height: 16, borderRadius: 4, overflow: "hidden", marginBottom: 6, minWidth: 480 }}>
          {fields.map((f, i) => (
            <div
              key={i}
              onClick={() => setSelected(selected === i ? null : i)}
              style={{
                flex: f.size > 100 ? 100 : f.size,
                background: selected === i ? f.color : f.color + "88",
                cursor: "pointer",
                transition: "background 0.1s",
                borderRight: "1px solid #0f172a",
              }}
              title={`${f.name} (${f.size}B)`}
            />
          ))}
        </div>
      </div>
      <div style={{ fontSize: 10, color: "#334155", marginBottom: 16, textAlign: "right" }}>
        bar width proportional to byte count (data payload capped)
      </div>

      {/* Field list */}
      <div style={{ maxHeight: 300, overflowY: "auto", marginBottom: 16 }}>
        {fields.map((f, i) => (
          <div
            key={i}
            onClick={() => setSelected(selected === i ? null : i)}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "baseline",
              padding: "5px 10px",
              borderRadius: 4,
              cursor: "pointer",
              background: selected === i ? "#1e293b" : "transparent",
              borderLeft: `3px solid ${selected === i ? f.color : "transparent"}`,
              marginBottom: 2,
              transition: "all 0.1s",
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: 2, background: f.color, flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, fontSize: 12, color: selected === i ? "#e2e8f0" : "#94a3b8" }}>{f.name}</div>
            <div style={{ fontSize: 11, color: f.color, minWidth: 72, textAlign: "right", fontWeight: 600 }}>
              {f.value.length > 18 ? f.value.slice(0, 16) + ".." : f.value}
            </div>
            <div style={{ fontSize: 11, color: "#475569", minWidth: 50, textAlign: "right" }}>
              {f.size > 4096 ? "4096 B" : `${f.size} B`}
            </div>
          </div>
        ))}
      </div>

      {/* Selected field detail */}
      {selectedField && (
        <div style={{
          background: "#1e293b",
          borderRadius: 8,
          padding: "12px 16px",
          borderLeft: `3px solid ${selectedField.color}`,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, color: selectedField.color, fontWeight: 700, marginBottom: 5 }}>{selectedField.name}</div>
          <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.65 }}>{selectedField.note}</div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 5 }}>
            Value: <span style={{ color: "#94a3b8" }}>{selectedField.value}</span>
            {"  "}  Size: <span style={{ color: "#94a3b8" }}>{selectedField.size} bytes</span>
          </div>
        </div>
      )}

      {/* Summary */}
      <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>Frame summary</div>
        <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.8 }}>
          <span style={{ color: "#6366f1" }}>Frames: </span>{totals.frames}<br />
          <span style={{ color: "#f59e0b" }}>Overhead: </span>{totals.overhead}<br />
          <span style={{ color: "#22c55e" }}>Payload: </span>{totals.payload}
        </div>
      </div>
    </div>
  );
}

export default StorageFrameAnatomyViz;

"use client";

import { useState } from "react";

// NVMeOFCapsuleViz -- Shows the NVMe-oF RDMA exchange phases and packet structure
// Phase 1: SQE capsule SEND, Phase 2: RDMA Read target-pull transfer, Phase 3: CQE capsule SEND

type Phase = "sqe" | "data" | "cqe";

const PHASES: { id: Phase; label: string; color: string; desc: string }[] = [
  {
    id: "sqe",
    label: "Phase 1: SQE Capsule SEND",
    color: "#6366f1",
    desc: "Initiator sends the 64-byte NVMe Submission Queue Entry to the target as an RDMA Send. This is the command -- not the data.",
  },
  {
    id: "data",
    label: "Phase 2: RDMA Read (target-pull data)",
    color: "#0ea5e9",
    desc: "Target issues an RDMA Read WQE against the initiator's registered MR (keyed by the RKEY in the SQE SGL). The initiator's CX7 responds with RDMA Read Response frames carrying the checkpoint payload. Data flows as 1 to 1024+ frames depending on block size. The initiator CPU is not involved -- the CX7 firmware handles the Read Response DMA autonomously.",
  },
  {
    id: "cqe",
    label: "Phase 3: CQE Capsule SEND",
    color: "#22c55e",
    desc: "Target sends the 16-byte NVMe Completion Queue Entry back to the initiator. I/O is complete.",
  },
];

const SQE_STACK = [
  { name: "Ethernet II", bytes: "14 B", color: "#94a3b8", detail: "Dst MAC / Src MAC / EtherType 0x0800" },
  { name: "IPv4", bytes: "20 B", color: "#64748b", detail: "Src: DGX storage IP  Dst: target portal IP  DSCP 26 or 46  Proto UDP" },
  { name: "UDP", bytes: "8 B", color: "#475569", detail: "Src: ephemeral (entropy)  Dst: 4791 (RoCEv2)" },
  { name: "BTH", bytes: "12 B", color: "#6366f1", detail: "OpCode: SEND_ONLY (0x04)  QPN: NVMe-oF QP  PSN: per-QP sequence  SE bit set" },
  { name: "NVMe-oF SQE Capsule", bytes: "64 B", color: "#818cf8", detail: "Opcode 0x01=Write / 0x02=Read  NSID  LBA  NLB  SGL1: {type, len, addr, RKEY}" },
  { name: "ICRC", bytes: "4 B", color: "#334155", detail: "Invariant CRC over BTH + payload" },
];

const DATA_STACK = [
  { name: "Ethernet II", bytes: "14 B", color: "#94a3b8", detail: "Same outer framing" },
  { name: "IPv4", bytes: "20 B", color: "#64748b", detail: "Same src/dst IPs" },
  { name: "UDP", bytes: "8 B", color: "#475569", detail: "Same port 4791" },
  { name: "BTH", bytes: "12 B", color: "#0ea5e9", detail: "OpCode: RDMA_READ_RESPONSE_FIRST (0x0D) / MIDDLE (0x0E) / LAST (0x0F) / ONLY (0x10). Sent by the initiator CX7 in response to the target's RDMA Read request." },
  { name: "AETH (first/last packet)", bytes: "4 B", color: "#38bdf8", detail: "ACK Extended Transport Header -- present on first and last Read Response packets. Syndrome field indicates success (0x00) or NAK." },
  { name: "Data Payload", bytes: "up to 4096 B", color: "#bae6fd", detail: "Checkpoint bytes DMA-read by the initiator CX7 from the pinned DRAM MR (host CPU path) or from GPU HBM via GDS (GPUDirect path). Sent to the target storage appliance." },
  { name: "ICRC", bytes: "4 B", color: "#334155", detail: "Invariant CRC" },
];

const CQE_STACK = [
  { name: "Ethernet II", bytes: "14 B", color: "#94a3b8", detail: "Src: target  Dst: DGX initiator" },
  { name: "IPv4", bytes: "20 B", color: "#64748b", detail: "Reverse direction" },
  { name: "UDP", bytes: "8 B", color: "#475569", detail: "Dst port 4791" },
  { name: "BTH", bytes: "12 B", color: "#22c55e", detail: "OpCode: SEND_ONLY (0x04)  SE bit set -- triggers initiator CQ notification" },
  { name: "NVMe-oF CQE Capsule", bytes: "16 B", color: "#4ade80", detail: "Command ID  Status Field (0x0000 = success)  SQ Head Pointer  Phase Tag" },
  { name: "ICRC", bytes: "4 B", color: "#334155", detail: "Invariant CRC" },
];

const stacks: Record<Phase, typeof SQE_STACK> = {
  sqe: SQE_STACK,
  data: DATA_STACK,
  cqe: CQE_STACK,
};

export function NVMeOFCapsuleViz() {
  const [active, setActive] = useState<Phase>("sqe");
  const [hovered, setHovered] = useState<number | null>(null);

  const stack = stacks[active];
  const phase = PHASES.find((p) => p.id === active)!;

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, fontFamily: "monospace", color: "#e2e8f0", maxWidth: 780 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
          NVMe-oF RDMA Exchange
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
          Three-Phase I/O Transaction
        </div>
      </div>

      {/* Phase selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {PHASES.map((p) => (
          <button
            key={p.id}
            onClick={() => { setActive(p.id); setHovered(null); }}
            style={{
              padding: "7px 14px",
              borderRadius: 6,
              border: `1px solid ${active === p.id ? p.color : "#334155"}`,
              background: active === p.id ? p.color + "22" : "transparent",
              color: active === p.id ? p.color : "#94a3b8",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: "monospace",
              fontWeight: active === p.id ? 700 : 400,
              transition: "all 0.15s",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Phase description */}
      <div style={{
        background: "#1e293b",
        borderLeft: `3px solid ${phase.color}`,
        borderRadius: 6,
        padding: "10px 14px",
        fontSize: 13,
        color: "#cbd5e1",
        marginBottom: 20,
        lineHeight: 1.6,
      }}>
        {phase.desc}
      </div>

      {/* Flow diagram */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        {/* Initiator box */}
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 16px", textAlign: "center", minWidth: 100, border: "1px solid #334155" }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>INITIATOR</div>
          <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>DGX H100</div>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>CX7 Slot1/2</div>
        </div>

        {/* Arrow area */}
        <div style={{ flex: 1, position: "relative", height: 60 }}>
          {/* SQE arrow */}
          {active === "sqe" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <div style={{ flex: 1, height: 2, background: phase.color, borderRadius: 1 }} />
              <div style={{ fontSize: 11, color: phase.color, fontWeight: 700, whiteSpace: "nowrap" }}>
                RDMA SEND (SQE) --&gt;
              </div>
              <div style={{ flex: 1, height: 2, background: phase.color, borderRadius: 1 }} />
            </div>
          )}
          {active === "data" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ flex: 1, height: 2, background: "#64748b", borderRadius: 1 }} />
                <div style={{ fontSize: 10, color: "#64748b" }}>&lt;-- RDMA READ request (target pulls)</div>
                <div style={{ flex: 1, height: 2, background: "#64748b", borderRadius: 1 }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ flex: 1, height: 2, background: phase.color, borderRadius: 1 }} />
                <div style={{ fontSize: 10, color: phase.color, fontWeight: 700 }}>RDMA Read Response frames --&gt;</div>
                <div style={{ flex: 1, height: 2, background: phase.color, borderRadius: 1 }} />
              </div>
            </div>
          )}
          {active === "cqe" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <div style={{ flex: 1, height: 2, background: phase.color, borderRadius: 1 }} />
              <div style={{ fontSize: 11, color: phase.color, fontWeight: 700, whiteSpace: "nowrap" }}>
                &lt;-- RDMA SEND (CQE)
              </div>
              <div style={{ flex: 1, height: 2, background: phase.color, borderRadius: 1 }} />
            </div>
          )}
        </div>

        {/* Target box */}
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 16px", textAlign: "center", minWidth: 100, border: "1px solid #334155" }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>TARGET</div>
          <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>Storage</div>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>Appliance</div>
        </div>
      </div>

      {/* Packet stack */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Frame Structure (hover for field details)
        </div>
        {stack.map((layer, i) => (
          <div
            key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 12px",
              marginBottom: 3,
              borderRadius: 5,
              background: hovered === i ? "#1e293b" : "transparent",
              cursor: "default",
              transition: "background 0.1s",
              border: `1px solid ${hovered === i ? layer.color + "55" : "transparent"}`,
            }}
          >
            <div style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: layer.color,
              flexShrink: 0,
            }} />
            <div style={{ flex: 1 }}>
              <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{layer.name}</span>
              {hovered === i && (
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{layer.detail}</div>
              )}
            </div>
            <div style={{ fontSize: 12, color: layer.color, fontFamily: "monospace", fontWeight: 700, minWidth: 80, textAlign: "right" }}>
              {layer.bytes}
            </div>
          </div>
        ))}
      </div>

      {/* RKEY callout for data phase */}
      {active === "data" && (
        <div style={{ marginTop: 14, background: "#1e293b", borderRadius: 6, padding: "10px 14px", borderLeft: "3px solid #0ea5e9" }}>
          <div style={{ fontSize: 12, color: "#38bdf8", fontWeight: 700, marginBottom: 4 }}>RKEY origin</div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
            The RKEY was published by the initiator inside the SQE SGL descriptor (Phase 1). The
            target issues an RDMA Read Work Request specifying the initiator virtual address, RKEY,
            and length. The initiator CX7 receives this Read request and autonomously DMA-reads the
            data from the registered MR, sending back RDMA Read Response frames. No CPU instruction
            touches the data payload. For GDS, the MR covers GPU HBM pages. For the host CPU path,
            it covers pinned system DRAM.
          </div>
        </div>
      )}
    </div>
  );
}

export default NVMeOFCapsuleViz;

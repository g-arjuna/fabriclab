"use client"
import { useState } from "react"

// -- QueuePairMechanicsViz -------------------------
// Shows the RDMA Queue Pair model: how NCCL posts WQEs, HCA DMAs from GPU HBM,
// constructs BTH, sends, and posts completion -- zero CPU in data path

const steps = [
  {
    id: 0, phase: "GPU kernel completes AllReduce",
    actor: "CUDA / NCCL",
    desc: "NCCL's AllReduce kernel finishes computing partial gradients. NCCL now needs to synchronise with 127 remote GPUs. It calls into libibverbs to post RDMA Write operations.",
    active: { gpu: true, sq: false, hca: false, wire: false, rq: false, remotegpu: false },
    detail: "No network packet yet. Still in GPU compute domain.",
  },
  {
    id: 1, phase: "NCCL posts Work Queue Entry (WQE)",
    actor: "libibverbs -> pinned memory",
    desc: "NCCL writes a WQE into the Send Queue ring buffer in pinned, GPU-accessible memory. The WQE specifies: remote virtual address (destination GPU HBM), RKEY, local scatter-gather VA, message length, QPN of remote QP. NCCL then rings the HCA doorbell register (a single memory-mapped write). No system call. No kernel. No interrupt.",
    active: { gpu: true, sq: true, hca: false, wire: false, rq: false, remotegpu: false },
    detail: "WQE content: {op: RDMA_WRITE, remote_va: 0x7f3a..., rkey: 0x1, sge: [{va: 0x6f00..., len: 128M}], qpn: 0x42, signal: false}",
  },
  {
    id: 2, phase: "HCA DMA-reads WQE + payload from GPU HBM",
    actor: "ConnectX-7 DMA engine",
    desc: "The HCA's send engine polls the SQ head pointer and finds a valid WQE (ownership bit set by NCCL). It DMA-reads the WQE, then DMA-reads the payload data from GPU HBM via the scatter-gather VA. This is GPUDirect RDMA: PCIe peer-to-peer between the NIC and the GPU, no system RAM involved.",
    active: { gpu: true, sq: true, hca: true, wire: false, rq: false, remotegpu: false },
    detail: "DMA path: GPU HBM -> NVLink -> NVSwitch -> PCIe -> ConnectX-7 TX buffer. CPU does zero work here.",
  },
  {
    id: 3, phase: "HCA constructs headers: BTH + UDP + IP + Ethernet",
    actor: "ConnectX-7 firmware",
    desc: "With payload in TX buffer, HCA constructs all headers in one pass: BTH (QPN from WQE, PSN from QP state, opcode RDMA_WRITE_FIRST), UDP (dst 4791, src from QPN hash), IP (src/dst from GID lookup, DSCP 46), Ethernet (dst = leaf switch gateway MAC from ARP cache). Segments into MTU-sized packets (4200B) automatically.",
    active: { gpu: false, sq: true, hca: true, wire: false, rq: false, remotegpu: false },
    detail: "Header construction is in firmware -- no driver, no kernel. Each 4200B packet gets its own BTH with sequential PSN.",
  },
  {
    id: 4, phase: "Packets transmitted at 400G",
    actor: "ConnectX-7 SerDes -> PAM-4 -> wire",
    desc: "Packets are serialised at 400 Gbps over 8 lanes x 50G PAM-4. A 128 MB RDMA Write produces approximately 32,000 packets at a 4096B MTU (exact count varies with MTU setting and RETH overhead on first packet). At 400G, this takes approximately 2.5 ms of NIC TX time. The leaf switch, spine switch, and destination leaf each forward at line rate -- the full transfer crosses the fabric in approximately 2.5 ms plus a few microseconds of switch latency.",
    active: { gpu: false, sq: true, hca: true, wire: true, rq: false, remotegpu: false },
    detail: "128 MB / 400 Gbps = 2.56 ms transmission time. Actual observed AllReduce throughput ~390 Gbps (accounting for BTH/UDP/IP/Ethernet header overhead).",
  },
  {
    id: 5, phase: "Destination HCA validates + DMA to GPU HBM",
    actor: "Remote ConnectX-7 firmware",
    desc: "Destination HCA receives each packet. Validates: FCS OK, dst MAC OK, dst IP OK, UDP port 4791 OK. Looks up QPN 0x42 in local QP table. Checks PSN in-order. Validates RKEY against MR table. DMA-writes payload to remote VA in destination GPU HBM. No completion posted yet -- waiting for RDMA_WRITE_LAST packet.",
    active: { gpu: false, sq: false, hca: true, wire: true, rq: true, remotegpu: false },
    detail: "Out-of-order: with RSHP enabled, packets may arrive out of PSN order. HCA reorder buffer holds them until sequence is complete before DMAing.",
  },
  {
    id: 6, phase: "RDMA_WRITE_LAST received -- completion posted",
    actor: "Remote ConnectX-7 -> NCCL",
    desc: "When the last packet (opcode RDMA_WRITE_LAST) is received and validated, the destination HCA posts a Completion Queue Entry (CQE) to the destination NCCL's Completion Queue. NCCL's background thread polls the CQ and sees the completion -- gradient data is now in destination GPU HBM. NCCL signals the GPU kernel to continue. CPU was not involved in any data transfer.",
    active: { gpu: false, sq: false, hca: false, wire: false, rq: true, remotegpu: true },
    detail: "Completion is posted after ALL packets of the RDMA Write are received and DMAed. The GPU kernel on the remote side continues processing the gradient update.",
  },
]

const NODE = { w: 80, h: 44 }

export function QueuePairMechanicsViz() {
  const [step, setStep] = useState(0)
  const s = steps[step]

  const nodeStyle = (active: boolean, color: string, bg: string) => ({
    background: active ? bg : "#1e293b",
    border: `1px solid ${active ? color : "#334155"}`,
    borderRadius: 8,
    padding: "8px 10px",
    textAlign: "center" as const,
    transition: "all 0.25s",
    minWidth: NODE.w,
    fontSize: 11,
    fontWeight: 500 as const,
    color: active ? "#e2e8f0" : "#475569",
  })

  const a = s.active

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">Queue pair mechanics -- RDMA Write pipeline</div>
      <div className="mb-5 text-xs text-slate-600">Step through the journey from NCCL to GPU HBM. Zero CPU instructions touch the data.</div>

      <div style={{ overflowX: "auto", paddingBottom: 6, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(92px, 1fr))", gap: 6, alignItems: "center", minWidth: 600 }}>
          <div style={nodeStyle(a.gpu, "#9333EA", "#2e1065")}>GPU<br/><span style={{ fontSize: 9, fontWeight: 400 }}>HBM + NCCL</span></div>
          <div style={nodeStyle(a.sq, "#185FA5", "#0c3260")}>Send Queue<br/><span style={{ fontSize: 9, fontWeight: 400 }}>WQE ring buffer</span></div>
          <div style={nodeStyle(a.hca, "#0F6E56", "#0a2e22")}>ConnectX-7<br/><span style={{ fontSize: 9, fontWeight: 400 }}>HCA firmware</span></div>
          <div style={nodeStyle(a.wire, "#854F0B", "#2a1a06")}>Fabric<br/><span style={{ fontSize: 9, fontWeight: 400 }}>400G PAM-4</span></div>
          <div style={nodeStyle(a.rq, "#0F6E56", "#0a2e22")}>Remote HCA<br/><span style={{ fontSize: 9, fontWeight: 400 }}>Recv Queue</span></div>
          <div style={nodeStyle(a.remotegpu, "#9333EA", "#2e1065")}>Remote GPU<br/><span style={{ fontSize: 9, fontWeight: 400 }}>HBM target</span></div>
        </div>
      </div>

      <div style={{ background: "#1e293b", borderRadius: 10, padding: "14px 16px", marginBottom: 14, minHeight: 110 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 6 }}>
          <div style={{ background: "#0c3260", border: "1px solid #378ADD", borderRadius: 5, padding: "2px 8px", fontSize: 10, color: "#93c5fd", flexShrink: 0 }}>Phase {step + 1}/7</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: "#e2e8f0" }}>{s.phase}</div>
        </div>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Actor: {s.actor}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>{s.desc}</div>
      </div>

      {s.detail && (
        <div style={{ background: "#111827", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontFamily: "monospace", fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>
          {s.detail}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} style={{ flex: 1, padding: "8px 0", background: "transparent", border: "1px solid #334155", borderRadius: 8, color: step === 0 ? "#334155" : "#94a3b8", fontSize: 12, cursor: step === 0 ? "not-allowed" : "pointer" }}>{"<- Previous"}</button>
        <button onClick={() => setStep(Math.min(steps.length - 1, step + 1))} disabled={step === steps.length - 1} style={{ flex: 1, padding: "8px 0", background: "transparent", border: "1px solid #334155", borderRadius: 8, color: step === steps.length - 1 ? "#334155" : "#94a3b8", fontSize: 12, cursor: step === steps.length - 1 ? "not-allowed" : "pointer" }}>{"Next ->"}</button>
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 10 }}>
        {steps.map((_, i) => <button key={i} onClick={() => setStep(i)} style={{ width: 8, height: 8, borderRadius: "50%", background: i === step ? "#378ADD" : "#334155", border: "none", cursor: "pointer", padding: 0 }} />)}
      </div>
    </div>
  )
}

export default QueuePairMechanicsViz

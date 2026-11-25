"use client"
import { useState } from "react"

// -- QueuePairMechanicsViz -------------------------
// Ordinary RDMA WRITE data movement, initiator completion, and remote
// notification are related but distinct mechanisms.  The animation keeps them
// visually separate because confusing them is a common RDMA programming error.

const steps = [
  {
    id: 0,
    phase: "Application posts an ordinary RDMA WRITE",
    actor: "CUDA / NCCL / libibverbs",
    desc: "The application asks the verbs layer to write local memory directly into a remote registered memory region. This is an ordinary WRITE, not WRITE with immediate data.",
    active: { gpu: true, sq: false, hca: false, wire: false, dest: false, mem: false, cq: false, notify: false },
    detail: "The WR names the remote virtual address and RKEY. No remote receive WR is involved in the payload placement.",
  },
  {
    id: 1,
    phase: "Work Queue Entry enters the Send Queue",
    actor: "libibverbs -> SQ / WQE",
    desc: "The WQE in the Send Queue specifies the operation, local scatter-gather memory, remote virtual address, RKEY, length, destination QP, and whether this send WR is signalled. Signalling controls initiator-side completion; it does not create a remote receive completion.",
    active: { gpu: true, sq: true, hca: false, wire: false, dest: false, mem: false, cq: false, notify: false },
    detail: "Example WQE: {op: RDMA_WRITE, remote_va, rkey, local_sge, len, dest_qpn, signalled: true}. sq_sig_all is an alternative CQ-signalling model.",
  },
  {
    id: 2,
    phase: "Initiator RNIC consumes the WQE",
    actor: "Initiator RNIC",
    desc: "The initiator RNIC reads the WQE and DMA-reads the payload described by the local scatter-gather entries. With GPUDirect RDMA that source can be GPU memory; the CPU still does not copy the payload.",
    active: { gpu: true, sq: true, hca: true, wire: false, dest: false, mem: false, cq: false, notify: false },
    detail: "Application -> Send Queue/WQE -> Initiator RNIC.",
  },
  {
    id: 3,
    phase: "RoCEv2 packets cross the fabric",
    actor: "RoCEv2 / UDP 4791",
    desc: "The RNIC constructs the transport and network headers and transmits MTU-sized packets. The first or only WRITE packet carries the RETH fields: remote virtual address, RKEY, and DMA length.",
    active: { gpu: false, sq: true, hca: true, wire: true, dest: false, mem: false, cq: false, notify: false },
    detail: "Initiator RNIC -> RoCEv2 -> Destination RNIC.",
  },
  {
    id: 4,
    phase: "Destination RNIC validates and places payload",
    actor: "Destination RNIC",
    desc: "The destination RNIC validates the packet sequence, destination QP, RKEY, and memory-region bounds, then DMA-writes the payload into the registered memory region named by the RETH. An ordinary WRITE does not consume a receive WR while doing this.",
    active: { gpu: false, sq: false, hca: false, wire: true, dest: true, mem: false, cq: false, notify: false },
    detail: "Destination RNIC -> Registered Memory. No RQ entry is needed for the ordinary-WRITE payload.",
  },
  {
    id: 5,
    phase: "Remote payload is available in memory",
    actor: "Registered memory",
    desc: "After placement, the new bytes are present in the remote registered memory region. No normal receive CQE has been generated on the remote target, so memory presence alone is not an application-level synchronisation protocol.",
    active: { gpu: false, sq: false, hca: false, wire: false, dest: true, mem: true, cq: false, notify: false },
    detail: "Registered Memory -> remote payload available. Destination CQ remains silent for ordinary WRITE.",
  },
  {
    id: 6,
    phase: "Initiator receives its own signalled completion",
    actor: "Initiator RNIC -> initiator CQ",
    desc: "If the WRITE WR was signalled (or the QP uses sq_sig_all), the initiator can poll a successful work completion from its own CQ. That local completion concerns the posted send WR. It is not a receive CQE on the destination and does not by itself notify the remote application.",
    active: { gpu: false, sq: false, hca: true, wire: false, dest: false, mem: false, cq: true, notify: false },
    detail: "Initiator RNIC -> signalled completion -> Initiator CQ / Work Completion (WC).",
  },
  {
    id: 7,
    phase: "Remote application notification is a separate protocol step",
    actor: "Application protocol",
    desc: "Before consuming the data, the remote application must learn that the transfer is ready through an explicit synchronisation design. Examples include an application message or a carefully ordered doorbell/flag protocol. WRITE with immediate data is a different verbs operation: it consumes a posted receive WR and can produce a receive completion carrying the immediate value.",
    active: { gpu: false, sq: false, hca: false, wire: false, dest: false, mem: true, cq: false, notify: true },
    detail: "Do not treat the ordinary WRITE itself as remote notification. The FabricLab lab uses a TCP control message only as demonstration synchronisation.",
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

  const flowStyle = (active: boolean) => ({
    background: active ? "#0c3260" : "#111827",
    border: `1px solid ${active ? "#378ADD" : "#334155"}`,
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 10,
    color: active ? "#bfdbfe" : "#64748b",
    lineHeight: 1.5,
    transition: "all 0.25s",
  })

  const a = s.active

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">Queue pair mechanics -- ordinary RDMA WRITE</div>
      <div className="mb-5 text-xs text-slate-600">Payload placement, initiator completion, and remote notification are distinct. Step through each concept.</div>

      <div style={{ overflowX: "auto", paddingBottom: 6, marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(92px, 1fr))", gap: 6, alignItems: "center", minWidth: 600 }}>
          <div style={nodeStyle(a.gpu, "#9333EA", "#2e1065")}>Application<br/><span style={{ fontSize: 9, fontWeight: 400 }}>posts WRITE</span></div>
          <div style={nodeStyle(a.sq, "#185FA5", "#0c3260")}>Send Queue<br/><span style={{ fontSize: 9, fontWeight: 400 }}>WQE</span></div>
          <div style={nodeStyle(a.hca, "#0F6E56", "#0a2e22")}>Initiator RNIC<br/><span style={{ fontSize: 9, fontWeight: 400 }}>send side</span></div>
          <div style={nodeStyle(a.wire, "#854F0B", "#2a1a06")}>RoCEv2<br/><span style={{ fontSize: 9, fontWeight: 400 }}>UDP 4791</span></div>
          <div style={nodeStyle(a.dest, "#0F6E56", "#0a2e22")}>Destination RNIC<br/><span style={{ fontSize: 9, fontWeight: 400 }}>QP + MR validation</span></div>
          <div style={nodeStyle(a.mem, "#9333EA", "#2e1065")}>Registered Memory<br/><span style={{ fontSize: 9, fontWeight: 400 }}>payload available</span></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 8, marginBottom: 16 }}>
        <div style={flowStyle(a.cq)} aria-live="polite">
          <strong>Initiator completion path</strong><br />
          Initiator RNIC → signalled completion → Initiator CQ / WC
        </div>
        <div style={flowStyle(a.notify)} aria-live="polite">
          <strong>Remote notification concept</strong><br />
          Registered memory ready → explicit application synchronisation → remote application consumes data
        </div>
      </div>

      <div style={{ background: "#1e293b", borderRadius: 10, padding: "14px 16px", marginBottom: 14, minHeight: 110 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 6 }}>
          <div style={{ background: "#0c3260", border: "1px solid #378ADD", borderRadius: 5, padding: "2px 8px", fontSize: 10, color: "#93c5fd", flexShrink: 0 }}>Phase {step + 1}/{steps.length}</div>
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
        {steps.map((_, i) => <button key={i} aria-label={`Go to queue-pair step ${i + 1}`} onClick={() => setStep(i)} style={{ width: 8, height: 8, borderRadius: "50%", background: i === step ? "#378ADD" : "#334155", border: "none", cursor: "pointer", padding: 0 }} />)}
      </div>
    </div>
  )
}

export default QueuePairMechanicsViz

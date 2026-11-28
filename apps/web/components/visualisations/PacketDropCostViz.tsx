"use client"

import { useState } from "react"

type Scenario = "tcp" | "recoverable" | "unrecoverable" | "healthy"

const scenarios: Record<Scenario, {
  label: string
  color: string
  qpState: string
  outcome: string
  explanation: string
  steps: { label: string; detail: string; state: "ok" | "warn" | "fail" | "wait" }[]
}> = {
  tcp: {
    label: "TCP — recoverable loss",
    color: "#38bdf8",
    qpState: "Not applicable — TCP socket, not an RDMA QP",
    outcome: "Loss detected and retransmitted; connection remains established",
    explanation: "TCP does not always wait for a retransmission timeout. Depending on the implementation and packet pattern, duplicate acknowledgments, selective acknowledgments, and modern loss-detection algorithms can trigger earlier retransmission. A timeout is a fallback, not the only detection mechanism.",
    steps: [
      { label: "Application writes data", detail: "The kernel TCP implementation segments and transmits data while the NIC uses DMA and applicable offloads.", state: "ok" },
      { label: "Packet 3 is lost", detail: "Packets 1, 2, 4, and 5 may still arrive. TCP tracks sequence numbers and acknowledgments.", state: "warn" },
      { label: "Receiver signals the gap", detail: "Duplicate ACKs and selective acknowledgments can identify what is missing.", state: "wait" },
      { label: "Sender retransmits the missing segment", detail: "TCP retransmits according to its loss-recovery algorithm; it does not inherently restart the whole file.", state: "ok" },
      { label: "Data completes in order", detail: "The connection stays established. Latency increases for the affected transfer, but there is no universal fixed penalty.", state: "ok" },
    ],
  },
  recoverable: {
    label: "RDMA RC — recoverable loss",
    color: "#f59e0b",
    qpState: "QP remains operational — no error transition is required",
    outcome: "Missing PSN recovered; transfer completes successfully",
    explanation: "Reliable Connected RDMA uses packet sequence numbers. A sequence discontinuity can trigger NAK/timeout recovery. Implementations commonly retransmit outstanding data from the missing sequence point using a Go-Back-N-style rule, but implementation details differ. Outstanding unacknowledged data is not synonymous with the entire tensor. Successful recovery does not require a QP error.",
    steps: [
      { label: "PSN 101, 102, 103 transmitted", detail: "The RC transport tracks packet sequence numbers independently of the application tensor boundaries.", state: "ok" },
      { label: "PSN 102 missing", detail: "The receiver observes a sequence gap or the sender fails to receive the expected acknowledgment.", state: "warn" },
      { label: "Recovery starts", detail: "The implementation retransmits outstanding data according to its configured transport recovery mechanism.", state: "wait" },
      { label: "PSN 102 recovered", detail: "Acknowledgment advances. No completion error is generated for a successfully recovered loss.", state: "ok" },
      { label: "RDMA WRITE completes", detail: "The application observes successful completion. The collective may be delayed, but there is no universal fixed-duration training stall.", state: "ok" },
    ],
  },
  unrecoverable: {
    label: "RDMA RC — recovery exhausted",
    color: "#ef4444",
    qpState: "Completion error; QP may transition to ERR depending on error type",
    outcome: "Application must handle a failed work completion and rebuild communication state",
    explanation: "If retry limits are exhausted or an unrecoverable transport/protocol condition occurs, the work request completes in error. The application or communication library must tear down, reset, or recreate the affected QP and decide whether the job can continue. This is different from a successfully retransmitted packet loss.",
    steps: [
      { label: "PSN 102 missing", detail: "The initial event may look identical to recoverable loss.", state: "warn" },
      { label: "Retransmission attempts fail", detail: "The peer, path, memory registration, or fabric may still be broken.", state: "fail" },
      { label: "Retry limit exhausted", detail: "Transport retry or receiver-not-ready retry limits depend on QP configuration.", state: "fail" },
      { label: "Work completion reports error", detail: "The application learns of failure through a completion error, not through ibstat port state.", state: "fail" },
      { label: "QP enters error handling", detail: "Software must destroy/reset/recreate communication state and then re-establish the collective or restart the affected process/job.", state: "wait" },
    ],
  },
  healthy: {
    label: "Engineered lossless fabric",
    color: "#22c55e",
    qpState: "QP remains operational",
    outcome: "No congestion-induced packet loss in the illustrated path",
    explanation: "A correctly engineered fabric attempts to prevent congestion-induced loss. InfiniBand credit flow control and RoCE designs using appropriate QoS, congestion control, and headroom can reduce loss risk. Neither technology makes physical corruption, hardware faults, misconfiguration, or software errors impossible.",
    steps: [
      { label: "Receiver/buffer resources available", detail: "Credit-based or configured lossless behavior prevents normal overrun in the illustrated design.", state: "ok" },
      { label: "Packets arrive in sequence", detail: "PSNs advance without a sequence gap.", state: "ok" },
      { label: "No recovery timer needed", detail: "There is no packet loss to repair.", state: "ok" },
      { label: "Transfer completes", detail: "Application-visible completion is successful.", state: "ok" },
      { label: "Training continues", detail: "Healthy fabric behavior is the design objective, not an absolute guarantee against every failure mode.", state: "ok" },
    ],
  },
}

const colors = {
  ok: ["#14532d", "#22c55e", "#bbf7d0"],
  warn: ["#78350f", "#f59e0b", "#fde68a"],
  fail: ["#7f1d1d", "#ef4444", "#fecaca"],
  wait: ["#1e1b4b", "#818cf8", "#c7d2fe"],
} as const

export function PacketDropCostViz() {
  const [scenario, setScenario] = useState<Scenario>("recoverable")
  const [open, setOpen] = useState(1)
  const current = scenarios[scenario]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">Packet loss and transport recovery — distinct scenarios</p>
      <p className="mb-4 text-xs leading-5 text-slate-500">Illustrative sequence only. It intentionally avoids invented universal recovery durations or fixed training-job stalls.</p>

      <div className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(scenarios) as Scenario[]).map((id) => {
          const item = scenarios[id]
          const active = id === scenario
          return (
            <button key={id} type="button" onClick={() => { setScenario(id); setOpen(1) }}
              className="rounded-xl px-3 py-2 text-left text-xs"
              style={{ backgroundColor: active ? `${item.color}22` : "#0f172a", border: `1px solid ${active ? item.color : "#1e293b"}`, color: active ? item.color : "#94a3b8" }}>
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
          <div className="mb-3 text-[10px] uppercase tracking-widest text-slate-500">Packet sequence illustration</div>
          <div className="flex flex-wrap gap-2">
            {[101, 102, 103, 104].map((psn) => {
              const missing = (scenario === "recoverable" || scenario === "unrecoverable") && psn === 102
              const recovered = scenario === "recoverable" && psn === 102
              return (
                <div key={psn} className="rounded-lg px-3 py-2 font-mono text-xs"
                  style={{
                    backgroundColor: missing ? (recovered ? "#78350f" : "#7f1d1d") : "#14532d",
                    border: `1px solid ${missing ? (recovered ? "#f59e0b" : "#ef4444") : "#22c55e"}`,
                    color: "#fff",
                    opacity: scenario === "healthy" || scenario === "tcp" || !missing ? 1 : 0.95,
                  }}>
                  {scenario === "tcp" ? "SEQ" : "PSN"} {psn}{missing ? (recovered ? " recovered" : " missing") : ""}
                </div>
              )
            })}
          </div>
          <div className="mt-4 rounded-lg bg-slate-900 p-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">QP / connection state</div>
            <p className="mt-1 text-sm font-semibold" style={{ color: current.color }}>{current.qpState}</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">{current.outcome}</p>
          </div>
          <p className="mt-4 text-xs leading-6 text-slate-400">{current.explanation}</p>
        </div>

        <div className="space-y-2">
          {current.steps.map((step, index) => {
            const [bg, border, text] = colors[step.state]
            const isOpen = open === index
            return (
              <button key={step.label} type="button" onClick={() => setOpen(isOpen ? -1 : index)}
                className="w-full rounded-xl px-4 py-3 text-left"
                style={{ backgroundColor: isOpen ? bg : "#0f172a", border: `1px solid ${isOpen ? border : `${border}55`}` }}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 font-mono text-[10px]" style={{ color: border }}>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: text }}>{step.label}</div>
                    {isOpen && <p className="mt-1 text-xs leading-5" style={{ color: text, opacity: 0.85 }}>{step.detail}</p>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default PacketDropCostViz

"use client"

import { useEffect, useState } from "react"

type Scenario = "tcp" | "recoverable" | "unrecoverable" | "healthy"
type PacketVisualState = "queued" | "inflight" | "received" | "missing" | "retransmitting" | "recovered" | "failed" | "complete"

type PacketSpec = { id: string; label: string; state: PacketVisualState }
type StepSpec = {
  label: string
  detail: string
  packets: PacketSpec[]
  endpointState: string
  outcome: string
}

function rdmaPackets(states: Record<string, PacketVisualState>): PacketSpec[] {
  return [101, 102, 103, 104].map((psn) => ({
    id: `psn-${psn}`,
    label: `PSN ${psn}`,
    state: states[String(psn)] ?? "queued",
  }))
}

function tcpPackets(states: Record<string, PacketVisualState>): PacketSpec[] {
  return [
    ["seg-1000", "SEQ 1000–1459"],
    ["seg-1460", "SEQ 1460–1919"],
    ["seg-1920", "SEQ 1920–2379"],
    ["seg-2380", "SEQ 2380–2839"],
  ].map(([id, label]) => ({ id, label, state: states[id] ?? "queued" }))
}

const scenarios: Record<Scenario, { label: string; color: string; summary: string; steps: StepSpec[] }> = {
  recoverable: {
    label: "RDMA RC — recoverable loss",
    color: "#f59e0b",
    summary: "A missing reliable-connected transport packet is retransmitted successfully. The illustrated signaled work request completes successfully and the QP remains RTS.",
    steps: [
      {
        label: "QP operational; operation posted",
        detail: "The reliable-connected queue pair is in RTS. The application posts a signaled RDMA WRITE work request. Packet sequence numbers belong to the transport, not to tensor elements.",
        packets: rdmaPackets({}),
        endpointState: "QP state: RTS",
        outcome: "No packets have been transmitted in the selected execution state.",
      },
      {
        label: "Packets transmitted",
        detail: "PSNs 101–103 are transmitted; PSN 104 is still queued. Transport transmission does not yet imply application-visible completion.",
        packets: rdmaPackets({ "101": "received", "102": "inflight", "103": "inflight" }),
        endpointState: "QP state: RTS",
        outcome: "Receiver has accepted PSN 101; PSNs 102–103 are in flight.",
      },
      {
        label: "PSN 102 is missing",
        detail: "PSN 102 does not arrive while a later sequence number is observed. This is a sequence gap. The final outcome is deliberately not shown yet.",
        packets: rdmaPackets({ "101": "received", "102": "missing", "103": "received", "104": "received" }),
        endpointState: "QP state: RTS",
        outcome: "Sequence gap detected at or after PSN 102; completion has not occurred.",
      },
      {
        label: "Loss detection",
        detail: "Depending on implementation and timeout behavior, the receiver can signal the sequence gap or the sender can detect missing acknowledgments. Retry has not yet succeeded.",
        packets: rdmaPackets({ "101": "received", "102": "missing", "103": "received", "104": "received" }),
        endpointState: "QP state: RTS · recovery armed",
        outcome: "The QP is still operational; recovery is required before completion.",
      },
      {
        label: "Retransmission in progress",
        detail: "The implementation retransmits outstanding data according to its transport recovery rule. RC implementations commonly use Go-Back-N-style behavior, but details are implementation-specific.",
        packets: rdmaPackets({ "101": "received", "102": "retransmitting", "103": "received", "104": "received" }),
        endpointState: "QP state: RTS",
        outcome: "PSN 102 is being retransmitted; no completion has been reported.",
      },
      {
        label: "Acknowledgment advances",
        detail: "The retransmission arrives and acknowledgment state advances. Previously received later packets do not need to represent a new application operation.",
        packets: rdmaPackets({ "101": "received", "102": "recovered", "103": "received", "104": "received" }),
        endpointState: "QP state: RTS",
        outcome: "The sequence gap is repaired; the QP never left RTS.",
      },
      {
        label: "Signaled work completion succeeds",
        detail: "Because the illustrated work request is signaled and transport recovery succeeded, the requester can observe a successful work completion. This does not prove that a remote application consumed the data, that a remote receive CQ entry exists for an ordinary RDMA WRITE, or that data was persisted.",
        packets: rdmaPackets({ "101": "complete", "102": "complete", "103": "complete", "104": "complete" }),
        endpointState: "QP state: RTS",
        outcome: "Application-visible result: successful completion after additional latency.",
      },
    ],
  },
  unrecoverable: {
    label: "RDMA RC — transport retry exhaustion",
    color: "#ef4444",
    summary: "A specific transport retry-exhaustion example: retransmission never obtains the required acknowledgment, retry_cnt is exhausted, the signaled request completes with retry-exceeded error, and the affected QP enters ERR.",
    steps: [
      {
        label: "QP operational",
        detail: "The QP starts in RTS with a posted signaled RDMA WRITE. This example concerns transport retry exhaustion, not receiver-not-ready retry exhaustion or a remote-access error.",
        packets: rdmaPackets({}),
        endpointState: "QP state: RTS",
        outcome: "No failure has occurred in the selected execution state.",
      },
      {
        label: "PSN 102 lost; acknowledgement missing",
        detail: "The initial symptoms can look like recoverable loss. The sender does not receive the required acknowledgment for PSN 102.",
        packets: rdmaPackets({ "101": "received", "102": "missing", "103": "missing", "104": "queued" }),
        endpointState: "QP state: RTS",
        outcome: "Loss detected; no error completion yet.",
      },
      {
        label: "Retry attempts",
        detail: "The transport retries within the QP's configured retry limit. In this example the path remains broken, so retries also fail.",
        packets: rdmaPackets({ "101": "received", "102": "retransmitting", "103": "missing", "104": "queued" }),
        endpointState: "QP state: RTS · transport retries in progress",
        outcome: "Retry attempts have not exhausted the configured limit yet.",
      },
      {
        label: "Transport retry limit exhausted",
        detail: "The configured transport retry count is exhausted. This is a specific failure mechanism; it must not be blurred with receiver-not-ready retries or remote memory access errors.",
        packets: rdmaPackets({ "101": "received", "102": "failed", "103": "failed", "104": "queued" }),
        endpointState: "QP state: RTS transitioning toward error handling",
        outcome: "Transport recovery has failed.",
      },
      {
        label: "Failed work completion",
        detail: "The signaled work request completes in error. The representative completion status is retry-exceeded error (for example IBV_WC_RETRY_EXC_ERR in Verbs terminology).",
        packets: rdmaPackets({ "101": "received", "102": "failed", "103": "failed", "104": "failed" }),
        endpointState: "Completion: retry-exceeded error",
        outcome: "The application or collective library must handle failure explicitly.",
      },
      {
        label: "Affected QP enters ERR",
        detail: "For this selected transport retry-exhaustion scenario, the affected QP transitions to ERR. ibstat port state is not QP state and cannot substitute for completion/error diagnostics.",
        packets: rdmaPackets({ "101": "received", "102": "failed", "103": "failed", "104": "failed" }),
        endpointState: "QP state: ERR",
        outcome: "The QP can no longer complete ordinary new work successfully.",
      },
      {
        label: "Software recovery required",
        detail: "The communication library or application must destroy/reset/recreate the affected QP, re-establish communication state, and decide whether the job can continue or must restart.",
        packets: rdmaPackets({ "101": "received", "102": "failed", "103": "failed", "104": "failed" }),
        endpointState: "QP state: ERR · software recovery required",
        outcome: "No automatic recovery is claimed by this visualization.",
      },
    ],
  },
  tcp: {
    label: "TCP — segment loss and recovery",
    color: "#38bdf8",
    summary: "TCP uses byte sequence ranges, not packet-count sequence numbers like RDMA PSNs. This example shows one missing segment and successful recovery.",
    steps: [
      {
        label: "Connection established",
        detail: "The sender transmits segments covering illustrative byte ranges. TCP sequence numbers identify byte positions in the stream.",
        packets: tcpPackets({}),
        endpointState: "TCP state: ESTABLISHED",
        outcome: "No segment is missing in the selected initial state.",
      },
      {
        label: "Middle segment missing",
        detail: "The segment covering bytes 1460–1919 is lost. Later bytes can arrive, but the receiver cannot deliver a gap in the ordered byte stream to the application.",
        packets: tcpPackets({ "seg-1000": "received", "seg-1460": "missing", "seg-1920": "received", "seg-2380": "received" }),
        endpointState: "TCP state: ESTABLISHED",
        outcome: "Receive gap: bytes 1460–1919 missing.",
      },
      {
        label: "Receiver signals the gap",
        detail: "Duplicate acknowledgments and selective acknowledgments can tell the sender which byte ranges are missing. A timeout is a fallback rather than the only detection mechanism.",
        packets: tcpPackets({ "seg-1000": "received", "seg-1460": "missing", "seg-1920": "received", "seg-2380": "received" }),
        endpointState: "TCP state: ESTABLISHED · loss recovery",
        outcome: "Sender has evidence of the missing byte range.",
      },
      {
        label: "Missing segment retransmitted",
        detail: "The sender retransmits the missing byte range according to TCP loss recovery. It does not inherently restart the whole file or connection.",
        packets: tcpPackets({ "seg-1000": "received", "seg-1460": "retransmitting", "seg-1920": "received", "seg-2380": "received" }),
        endpointState: "TCP state: ESTABLISHED · retransmission",
        outcome: "Retransmission is in progress.",
      },
      {
        label: "Ordered byte stream completes",
        detail: "The retransmitted segment arrives and the receive gap closes. The connection remains established; latency increases for the affected transfer by an implementation- and path-dependent amount.",
        packets: tcpPackets({ "seg-1000": "complete", "seg-1460": "complete", "seg-1920": "complete", "seg-2380": "complete" }),
        endpointState: "TCP state: ESTABLISHED",
        outcome: "Application receives ordered data after recovery.",
      },
    ],
  },
  healthy: {
    label: "Engineered lossless fabric",
    color: "#22c55e",
    summary: "No congestion-induced packet loss occurs in this illustrative path. This is a design objective, not immunity from every physical, software, or configuration fault.",
    steps: [
      {
        label: "Resources available",
        detail: "Credit-based or engineered lossless behavior prevents normal receiver overrun in the illustrated design.",
        packets: rdmaPackets({}),
        endpointState: "QP state: RTS",
        outcome: "Transfer not yet transmitted.",
      },
      {
        label: "Packets transmitted",
        detail: "PSNs are transmitted without congestion-induced loss in this example.",
        packets: rdmaPackets({ "101": "inflight", "102": "inflight", "103": "inflight", "104": "inflight" }),
        endpointState: "QP state: RTS",
        outcome: "Packets in flight.",
      },
      {
        label: "Packets arrive in sequence",
        detail: "No sequence gap is observed and no recovery timer is needed.",
        packets: rdmaPackets({ "101": "received", "102": "received", "103": "received", "104": "received" }),
        endpointState: "QP state: RTS",
        outcome: "Acknowledgment state advances normally.",
      },
      {
        label: "Signaled completion succeeds",
        detail: "The illustrated signaled request completes. As before, ordinary RDMA WRITE completion does not prove remote application consumption, a receive CQ entry, or durable persistence.",
        packets: rdmaPackets({ "101": "complete", "102": "complete", "103": "complete", "104": "complete" }),
        endpointState: "QP state: RTS",
        outcome: "Successful completion without transport loss recovery.",
      },
    ],
  },
}

const stateStyle: Record<PacketVisualState, { bg: string; border: string; label: string }> = {
  queued: { bg: "#0f172a", border: "#475569", label: "queued" },
  inflight: { bg: "#1e1b4b", border: "#818cf8", label: "in flight" },
  received: { bg: "#14532d", border: "#22c55e", label: "received" },
  missing: { bg: "#7f1d1d", border: "#ef4444", label: "missing" },
  retransmitting: { bg: "#78350f", border: "#f59e0b", label: "retransmitting" },
  recovered: { bg: "#365314", border: "#84cc16", label: "recovered" },
  failed: { bg: "#450a0a", border: "#dc2626", label: "failed" },
  complete: { bg: "#052e16", border: "#4ade80", label: "complete" },
}

export function PacketDropCostViz() {
  const [scenario, setScenario] = useState<Scenario>("recoverable")
  const [stepIndex, setStepIndex] = useState(0)
  const current = scenarios[scenario]
  const safeStepIndex = Math.min(stepIndex, current.steps.length - 1)
  const step = current.steps[safeStepIndex]

  useEffect(() => setStepIndex(0), [scenario])

  return (
    <div data-testid="packet-drop-cost-viz" className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">Packet loss and transport recovery — deterministic execution states</p>
      <p className="mb-4 text-xs leading-5 text-slate-500">Use Previous and Next to reconstruct the selected scenario state. Future outcomes are not displayed before they occur.</p>
      <div className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4" role="group" aria-label="Packet-loss scenario">
        {(Object.keys(scenarios) as Scenario[]).map((id) => (
          <button key={id} type="button" aria-pressed={id === scenario} onClick={() => setScenario(id)}
            className="rounded-xl px-3 py-2 text-left text-xs"
            style={{ backgroundColor: id === scenario ? `${scenarios[id].color}22` : "#0f172a", border: `1px solid ${id === scenario ? scenarios[id].color : "#1e293b"}`, color: id === scenario ? scenarios[id].color : "#94a3b8" }}>
            {scenarios[id].label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4" data-testid={`packet-state-${scenario}-step-${safeStepIndex}`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Current packet/segment state</div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStepIndex(Math.max(0, safeStepIndex - 1))} disabled={safeStepIndex === 0} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40">Previous</button>
              <button type="button" onClick={() => setStepIndex(Math.min(current.steps.length - 1, safeStepIndex + 1))} disabled={safeStepIndex === current.steps.length - 1} className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200 disabled:opacity-40">Next</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {step.packets.map((packet) => {
              const style = stateStyle[packet.state]
              return (
                <div key={packet.id} data-testid={`packet-${packet.id}`} data-state={packet.state} className="rounded-lg px-3 py-2 font-mono text-xs"
                  style={{ backgroundColor: style.bg, border: `1px solid ${style.border}`, color: "#fff" }}>
                  {packet.label}
                  <span className="ml-2 text-[9px] uppercase opacity-80">{style.label}</span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 rounded-lg bg-slate-900 p-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Transport / completion state</div>
            <p className="mt-1 text-sm font-semibold" style={{ color: current.color }} data-testid="transport-state">{step.endpointState}</p>
            <p className="mt-2 text-xs leading-5 text-slate-400" data-testid="step-outcome">{step.outcome}</p>
          </div>
          <p className="mt-4 text-xs leading-6 text-slate-400">{current.summary}</p>
        </div>
        <div className="space-y-2">
          {current.steps.map((item, index) => (
            <button key={item.label} type="button" aria-pressed={index === safeStepIndex} onClick={() => setStepIndex(index)}
              className="w-full rounded-xl px-4 py-3 text-left"
              style={{ backgroundColor: index === safeStepIndex ? "#13243b" : "#0f172a", border: `1px solid ${index === safeStepIndex ? current.color : "#1e293b"}` }}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 font-mono text-[10px]" style={{ color: current.color }}>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <div className="text-sm font-semibold text-slate-100">{item.label}</div>
                  {index === safeStepIndex && <p className="mt-1 text-xs leading-5 text-slate-300">{item.detail}</p>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PacketDropCostViz

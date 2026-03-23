"use client"
import { useState } from "react"

// â”€â”€â”€ NCCLLayerViz â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Shows the software stack from training framework → NCCL → RDMA driver → NIC
// Click any layer to see what it owns and what it does NOT own

type Layer = "framework" | "nccl" | "verbs" | "driver" | "nic" | "fabric"

const layers: {
  id: Layer
  label: string
  sublabel: string
  color: string
  border: string
  owns: string[]
  doesNotOwn: string[]
  realWorldSignature: string
}[] = [
  {
    id: "framework",
    label: "Training framework",
    sublabel: "PyTorch / JAX / TensorFlow",
    color: "#1e3a5f",
    border: "#60a5fa",
    owns: [
      "When to call AllReduce (after backward pass)",
      "Which tensors to reduce",
      "What to do with the result",
      "Training loop orchestration",
    ],
    doesNotOwn: [
      "How the AllReduce happens",
      "Which NICs are used",
      "Algorithm selection",
      "Network error handling",
    ],
    realWorldSignature:
      "PyTorch: torch.distributed.all_reduce(tensor)",
  },
  {
    id: "nccl",
    label: "NCCL",
    sublabel: "NVIDIA Collective Communications Library",
    color: "#14532d",
    border: "#22c55e",
    owns: [
      "Algorithm selection (ring / tree / DBT)",
      "GPU topology detection (NVLink vs external fabric)",
      "Queue Pair establishment and lifecycle",
      "Error detection: timeouts, QP failures",
      "busbw metric — performance reporting",
      "Fallback transport selection (RDMA → socket)",
    ],
    doesNotOwn: [
      "PFC configuration",
      "ECN thresholds",
      "DCQCN rate control parameters",
      "Switch load balancing mode",
      "Physical link state",
      "Fabric topology (it only measures, does not know)",
    ],
    realWorldSignature:
      "NCCL logs: 'transport selected: NET/socket', 'Channel 00: [mlx5_0]', QP timeouts",
  },
  {
    id: "verbs",
    label: "RDMA Verbs API",
    sublabel: "libibverbs — ibv_post_send / ibv_poll_cq",
    color: "#4c1d95",
    border: "#a78bfa",
    owns: [
      "Work Queue Element (WQE) submission",
      "Queue Pair creation and state transitions",
      "Completion Queue polling",
      "Memory registration for DMA",
    ],
    doesNotOwn: [
      "Packet routing",
      "Congestion signals",
      "Physical link management",
    ],
    realWorldSignature:
      "NCCL calls ibv_post_send() for each tensor shard transfer",
  },
  {
    id: "driver",
    label: "ConnectX-7 RDMA driver",
    sublabel: "MLNX-OFED / inbox driver",
    color: "#78350f",
    border: "#f59e0b",
    owns: [
      "DSCP marking of outbound packets (DSCP 26)",
      "QP state machine (Init → RTR → RTS → Error)",
      "PSN (Packet Sequence Number) tracking",
      "NIC firmware interaction",
      "Verbs API implementation",
    ],
    doesNotOwn: [
      "Switch buffer configuration",
      "PFC pause frame generation (done in NIC ASIC)",
      "ECN bit setting (done in switch ASIC)",
    ],
    realWorldSignature:
      "ibstat shows QP state transitions. mlxconfig controls driver parameters.",
  },
  {
    id: "nic",
    label: "ConnectX-7 ASIC",
    sublabel: "Hardware — transport engine in silicon",
    color: "#7f1d1d",
    border: "#ef4444",
    owns: [
      "Packet construction from WQEs",
      "PFC PAUSE frame generation and reception",
      "ECN CE-bit marking response (DCQCN rate reduction)",
      "RDMA transport reliability (ACK / NACK / retransmit)",
      "400G line rate packet processing",
      "RSHP reorder buffer (for per-packet load balancing)",
    ],
    doesNotOwn: [
      "Switch-side buffer management",
      "Routing decisions",
      "ECN threshold configuration (that is the switch)",
    ],
    realWorldSignature:
      "ethtool -S eth0 shows: rx_pfc_pause_frames, rx_ecn_marked, tx_dropped",
  },
  {
    id: "fabric",
    label: "Fabric (switches)",
    sublabel: "Spectrum-X / QM9700 — the network",
    color: "#1e3a5f",
    border: "#38bdf8",
    owns: [
      "ECN threshold monitoring and CE-bit marking",
      "PFC PAUSE frame propagation",
      "ECMP / per-packet load balancing (RSHP)",
      "Buffer depth management",
      "Adaptive routing (IB) / RSHP (Ethernet)",
    ],
    doesNotOwn: [
      "NCCL algorithm selection",
      "QP state machines",
      "Training job orchestration",
    ],
    realWorldSignature:
      "show interface counters, show dcb pfc, show dcb ets, show roce",
  },
]

export function NCCLLayerViz() {
  const [active, setActive] = useState<Layer>("nccl")
  const selected = layers.find((l) => l.id === active)!

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
        The full stack — from training framework to fabric
      </p>
      <p className="mb-4 text-xs text-slate-600">
        Click any layer to see what it owns and what it hands to the layer below
      </p>

      {/* Stack diagram */}
      <div className="flex flex-col gap-1.5 mb-5">
        {layers.map((layer) => (
          <button
            key={layer.id}
            onClick={() => setActive(layer.id)}
            className="rounded-xl px-4 py-2.5 text-left transition-all"
            style={{
              backgroundColor:
                active === layer.id ? layer.color + "55" : "#0f172a",
              border: `1px solid ${
                active === layer.id ? layer.border : "#1e293b"
              }`,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <span
                  className="text-sm font-semibold"
                  style={{
                    color: active === layer.id ? layer.border : "#64748b",
                  }}
                >
                  {layer.label}
                </span>
                <span className="ml-3 text-[10px] text-slate-600">
                  {layer.sublabel}
                </span>
              </div>
              {active === layer.id && (
                <span className="text-xs text-slate-500">â–² expanded</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Detail panel */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{
          backgroundColor: selected.color + "22",
          border: `1px solid ${selected.border}33`,
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div
              className="text-[10px] uppercase tracking-widest mb-2"
              style={{ color: selected.border }}
            >
              This layer owns
            </div>
            <ul className="space-y-1">
              {selected.owns.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-slate-300">
                  <span style={{ color: selected.border }} className="mt-0.5 flex-shrink-0">âœ“</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest mb-2 text-slate-500">
              Does NOT own
            </div>
            <ul className="space-y-1">
              {selected.doesNotOwn.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-slate-500">
                  <span className="mt-0.5 flex-shrink-0">âœ—</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="rounded-lg bg-[#0a0f1a] border border-white/8 p-3">
          <span className="text-[10px] text-slate-500">Real-world signature: </span>
          <span className="text-xs text-slate-300">{selected.realWorldSignature}</span>
        </div>
      </div>
    </div>
  )
}
export default NCCLLayerViz
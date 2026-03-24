"use client"
import { useState } from "react"

// ── NVMeoFProtocolViz ─────────────────────────────────────────────────────────
// Compares NVMe-oF transport options: TCP, RDMA/RoCEv2, Fibre Channel.
// Click each to expand. RDMA highlighted as AI cluster standard.

type Transport = "tcp" | "rdma" | "fc"

const transports: {
  id: Transport
  name: string
  fullName: string
  latency: string
  latencyTier: 1 | 2 | 3
  cpuOverhead: string
  cpuTier: 1 | 2 | 3
  switchReq: string
  usedIn: string
  aiCluster: boolean
  description: string
  pros: string[]
  cons: string[]
  color: string
  border: string
}[] = [
  {
    id: "tcp",
    name: "NVMe-oF/TCP",
    fullName: "NVMe over TCP",
    latency: "~100–500 µs",
    latencyTier: 3,
    cpuOverhead: "High — kernel TCP processing",
    cpuTier: 3,
    switchReq: "Any Ethernet switch",
    usedIn: "General enterprise, cold storage tiers, backup",
    aiCluster: false,
    description:
      "NVMe commands encapsulated in TCP/IP packets. Runs on any standard Ethernet switch with no special configuration. TCP provides reliable delivery — the initiator and target exchange ACKs for each segment. Every storage I/O involves the kernel TCP stack on both ends.",
    pros: [
      "Works on any existing Ethernet switch",
      "No PFC or ECN configuration required",
      "Widest ecosystem — most storage vendors support it",
      "Simple to troubleshoot with standard tools",
    ],
    cons: [
      "TCP kernel processing consumes CPU cores at scale",
      "High latency from TCP ACK overhead",
      "Not compatible with GPUDirect Storage zero-copy path",
      "Not suitable for checkpoint writes at AI cluster scale",
    ],
    color: "#1e293b",
    border: "#64748b",
  },
  {
    id: "rdma",
    name: "NVMe-oF/RDMA",
    fullName: "NVMe over RDMA (RoCEv2)",
    latency: "~2–10 µs",
    latencyTier: 1,
    cpuOverhead: "Near-zero — DPU handles all I/O",
    cpuTier: 1,
    switchReq: "Ethernet with ECN (PFC optional)",
    usedIn: "AI training clusters, HPC storage fabrics",
    aiCluster: true,
    description:
      "NVMe commands transmitted using RDMA verbs over RoCEv2. The DPU issues NVMe commands as RDMA Write operations. No TCP overhead. No CPU involvement on the data path at either end. The combination of RDMA transport and GDS completes the zero-CPU-copy path — data flows from storage appliance directly to GPU HBM with no system RAM involvement.",
    pros: [
      "Zero CPU copies — host CPU never touches storage data",
      "~10–50× lower latency than TCP transport",
      "Enables GPUDirect Storage zero-copy path",
      "DPU handles all NVMe-oF I/O without host CPU",
      "Same switch infrastructure as compute fabric (Spectrum)",
    ],
    cons: [
      "Requires RDMA-capable switches (ECN recommended)",
      "More complex to configure than TCP transport",
      "Storage appliance must support NVMe-oF/RDMA target",
      "PFC storm risk if mixed with compute fabric (hence separate fabric)",
    ],
    color: "#14532d",
    border: "#22c55e",
  },
  {
    id: "fc",
    name: "NVMe-oF/FC",
    fullName: "NVMe over Fibre Channel",
    latency: "~50–100 µs",
    latencyTier: 2,
    cpuOverhead: "Medium — FC HBA driver overhead",
    cpuTier: 2,
    switchReq: "Fibre Channel switches (separate FC fabric)",
    usedIn: "Legacy enterprise SAN environments",
    aiCluster: false,
    description:
      "NVMe commands carried over a Fibre Channel fabric. Fibre Channel is an inherently lossless transport — credit-based flow control is built in, similar to InfiniBand. Used in enterprises that already have a Fibre Channel SAN and are transitioning storage protocols from SCSI to NVMe without rebuilding the network.",
    pros: [
      "Inherently lossless — no PFC/ECN configuration",
      "Mature enterprise ecosystem, long track record",
      "Works with existing FC SAN infrastructure",
    ],
    cons: [
      "Requires dedicated FC switches — cannot share with IP network",
      "FC HBAs are expensive specialised hardware",
      "Not used in AI cluster deployments",
      "Does not support GPUDirect Storage path",
    ],
    color: "#4c1d95",
    border: "#a78bfa",
  },
]

const tierColors = { 1: "#22c55e", 2: "#f59e0b", 3: "#ef4444" }
const tierBars = { 1: "33%", 2: "66%", 3: "100%" }

export function NVMeoFProtocolViz() {
  const [selected, setSelected] = useState<Transport>("rdma")
  const [tab, setTab] = useState<"overview" | "pros" | "cons">("overview")
  const sel = transports.find(t => t.id === selected)!

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
        NVMe-oF transport options — click to compare
      </p>
      <p className="mb-5 text-xs text-slate-600">
        Three ways to carry NVMe commands over a network. RDMA is the AI cluster standard.
      </p>

      {/* Transport selector */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {transports.map(t => (
          <button
            key={t.id}
            onClick={() => { setSelected(t.id); setTab("overview") }}
            className="rounded-xl p-3 text-left transition-all"
            style={{
              backgroundColor: selected === t.id ? t.color + "55" : "#0f172a",
              border: `2px solid ${selected === t.id ? t.border : "#1e293b"}`,
            }}
          >
            <div className="text-xs font-bold mb-0.5" style={{ color: selected === t.id ? t.border : "#64748b" }}>
              {t.name}
            </div>
            <div className="text-[9px] text-slate-600">{t.fullName}</div>
            {t.aiCluster && (
              <div className="mt-1.5 text-[8px] rounded px-1.5 py-0.5 inline-block bg-green-500/20 text-green-400 font-bold">
                AI cluster standard
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Stats bars */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: "Latency", tier: sel.latencyTier, value: sel.latency },
          { label: "CPU overhead", tier: sel.cpuTier, value: sel.cpuOverhead },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-slate-800/50 p-3">
            <div className="flex justify-between text-[9px] mb-1">
              <span className="text-slate-500">{s.label}</span>
              <span className="text-slate-300 font-medium">{s.value}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-700">
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ width: tierBars[s.tier], backgroundColor: tierColors[s.tier] }}
              />
            </div>
            <div className="text-[8px] text-slate-600 mt-0.5">
              {s.tier === 1 ? "Low" : s.tier === 2 ? "Medium" : "High"}
            </div>
          </div>
        ))}
      </div>

      {/* Detail tabs */}
      <div className="flex gap-1 mb-3">
        {([
          { k: "overview" as const, l: "How it works" },
          { k: "pros" as const, l: "Advantages" },
          { k: "cons" as const, l: "Limitations" },
        ]).map(t => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all"
            style={{
              backgroundColor: tab === t.k ? sel.color + "55" : "#0f172a",
              border: `1px solid ${tab === t.k ? sel.border + "66" : "#1e293b"}`,
              color: tab === t.k ? sel.border : "#475569",
            }}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: sel.color + "22", border: `1px solid ${sel.border}33` }}
      >
        {tab === "overview" && (
          <div>
            <div className="text-xs text-slate-300 leading-5 mb-3">{sel.description}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { l: "Switch required", v: sel.switchReq },
                { l: "Deployed in", v: sel.usedIn },
              ].map(r => (
                <div key={r.l} className="rounded-lg bg-slate-900/60 p-2">
                  <div className="text-[9px] text-slate-500 mb-0.5">{r.l}</div>
                  <div className="text-slate-300 text-[10px]">{r.v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "pros" && (
          <ul className="space-y-1.5">
            {sel.pros.map((p, i) => (
              <li key={i} className="flex gap-2 text-[11px] text-slate-300">
                <span style={{ color: sel.border }}>✓</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
        {tab === "cons" && (
          <ul className="space-y-1.5">
            {sel.cons.map((c, i) => (
              <li key={i} className="flex gap-2 text-[11px] text-slate-300">
                <span className="text-slate-600">✗</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bottom note */}
      <div className="mt-4 rounded-xl bg-green-950/30 border border-green-500/20 p-3">
        <div className="text-[10px] text-slate-400 leading-4">
          <span className="font-semibold text-green-400">Why RDMA wins: </span>
          Only NVMe-oF/RDMA enables GPUDirect Storage's zero-copy path. The DPU's RDMA engine
          issues NVMe write commands as RDMA operations, writing GPU HBM contents directly to
          the storage appliance without CPU involvement at either end.
        </div>
      </div>
    </div>
  )
}

export default NVMeoFProtocolViz

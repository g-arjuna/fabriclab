"use client"

import { useState } from "react"

type Mode = "what" | "offloads" | "vs_hca" | "in_dgx"

const modes: { id: Mode; label: string }[] = [
  { id: "what", label: "What is a DPU?" },
  { id: "offloads", label: "What it offloads" },
  { id: "vs_hca", label: "DPU vs HCA" },
  { id: "in_dgx", label: "In a DGX node" },
]

interface OffloadItem {
  name: string
  without: string
  with: string
  color: string
}

const offloads: OffloadItem[] = [
  {
    name: "OVS (Open vSwitch)",
    without: "Host CPU runs all virtual switching logic. At 400GbE line rate, OVS processing consumes 30–40% of CPU cores. Multi-tenant GPU clusters have no CPU left for actual workloads.",
    with: "DPU runs OVS entirely in hardware at line rate. Host CPU is completely free. Tenant isolation enforced in silicon — cannot be bypassed.",
    color: "#1e40af",
  },
  {
    name: "NVMe-oF storage",
    without: "Host CPU initiates all NVMe-oF transactions. Every storage I/O involves a syscall, kernel processing, and CPU cycles. At high IOPS this saturates CPU cores.",
    with: "BlueField-3 runs the NVMe-oF initiator stack. GPUDirect Storage sends data GPU → NVMe directly through the DPU without involving the host CPU at all.",
    color: "#065f46",
  },
  {
    name: "TLS 1.3 / IPsec",
    without: "All encryption/decryption uses host CPU. For a data center requiring encryption at rest and in transit, this can consume 15–25% of CPU cores at 400GbE.",
    with: "DPU terminates TLS and IPsec at line rate in dedicated crypto engines. Zero host CPU cycles. Regulatory compliance without performance penalty.",
    color: "#6d28d9",
  },
  {
    name: "Firewall / microsegmentation",
    without: "Software firewalls run on host CPU or require a dedicated appliance in the traffic path. Neither scales to 400GbE per server.",
    with: "DPU enforces firewall policy on every packet at line rate. Policy is programmed by the infrastructure team, invisible to the tenant — cannot be modified by a compromised host.",
    color: "#92400e",
  },
]

export function DPUExplainerViz() {
  const [mode, setMode] = useState<Mode>("what")
  const [selectedOffload, setSelectedOffload] = useState<number>(0)

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        NVIDIA BlueField-3 DPU — the infrastructure co-processor
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              backgroundColor: mode === m.id ? "#4c1d95" : "#0f172a",
              border: `1px solid ${mode === m.id ? "#8b5cf6" : "#1e293b"}`,
              color: mode === m.id ? "#ddd6fe" : "#64748b",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "what" && (
        <div className="space-y-4">
          <p className="text-sm leading-7 text-slate-300">
            A DPU (Data Processing Unit) is a programmable SmartNIC with an embedded multi-core Arm CPU complex running a complete Linux OS — independently of the host server. Think of it as a small server inside your server, dedicated entirely to running infrastructure services.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "CPU", value: "16× Arm Cortex-A78", sub: "BlueField-3, independent OS", color: "#6d28d9" },
              { label: "Memory", value: "32 GB LPDDR5", sub: "Completely separate from host RAM", color: "#065f46" },
              { label: "Network", value: "2× 400GbE / NDR", sub: "Same line rate as ConnectX-7", color: "#1e40af" },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4"
                style={{ backgroundColor: item.color + "22", border: `1px solid ${item.color}44` }}>
                <div className="text-xs text-slate-500 mb-1">{item.label}</div>
                <div className="text-sm font-bold text-white">{item.value}</div>
                <div className="text-xs text-slate-400 mt-1">{item.sub}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-slate-800/50 p-4">
            <p className="text-sm leading-7 text-slate-300">
              The key distinction from a NIC or HCA: the DPU has its own CPU, memory, and operating system. It boots separately from the host. It can be patched and updated without touching the host. In a cloud environment, the infrastructure team owns the DPU — the tenant owns the host. The DPU enforces security and network policy that the tenant cannot see or modify.
            </p>
          </div>

          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">Where BlueField fits in NVIDIA&apos;s lineup</p>
            <div className="space-y-2 text-xs">
              {[
                { name: "ConnectX-7", type: "HCA", role: "Compute fabric RDMA — 8 per DGX node", color: "#1e40af" },
                { name: "BlueField-3", type: "DPU", role: "Storage + security offload — 2 per DGX node", color: "#6d28d9" },
                { name: "ConnectX-8", type: "HCA", role: "Next-gen HCA, 800G XDR InfiniBand", color: "#1d4ed8" },
              ].map(item => (
                <div key={item.name} className="flex items-center gap-3 rounded-lg px-3 py-2"
                  style={{ backgroundColor: item.color + "22", border: `1px solid ${item.color}33` }}>
                  <span className="font-mono text-white w-24 flex-shrink-0">{item.name}</span>
                  <span className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                    style={{ backgroundColor: item.color, color: "#fff" }}>{item.type}</span>
                  <span className="text-slate-300">{item.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === "offloads" && (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            {offloads.map((o, i) => (
              <button
                key={i}
                onClick={() => setSelectedOffload(i)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  backgroundColor: selectedOffload === i ? o.color : "#0f172a",
                  border: `1px solid ${selectedOffload === i ? o.color : "#1e293b"}`,
                  color: selectedOffload === i ? "#fff" : "#64748b",
                }}
              >
                {o.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wider">Without DPU</div>
              <p className="text-sm leading-7 text-slate-300">{offloads[selectedOffload].without}</p>
            </div>
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
              <div className="text-xs font-semibold text-green-400 mb-2 uppercase tracking-wider">With DPU</div>
              <p className="text-sm leading-7 text-slate-300">{offloads[selectedOffload].with}</p>
            </div>
          </div>
        </div>
      )}

      {mode === "vs_hca" && (
        <div className="space-y-3">
          <p className="text-sm leading-7 text-slate-300">
            Both ConnectX-7 (HCA) and BlueField-3 (DPU) support full RDMA at 400G. The difference is what else they can do.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 pr-4 text-slate-500 font-medium">Capability</th>
                  <th className="text-center py-2 px-4 text-blue-400 font-medium">ConnectX-7 HCA</th>
                  <th className="text-center py-2 px-4 text-violet-400 font-medium">BlueField-3 DPU</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  ["Full RDMA (InfiniBand / RoCEv2)", true, true],
                  ["400G / NDR line rate", true, true],
                  ["GPUDirect RDMA", true, true],
                  ["SHARP in-network compute", true, true],
                  ["Embedded Arm CPU", false, true],
                  ["Independent OS (Linux)", false, true],
                  ["OVS hardware offload", false, true],
                  ["NVMe-oF initiator offload", false, true],
                  ["TLS/IPsec line-rate termination", false, true],
                  ["Tenant-isolated security enforcement", false, true],
                  ["Cost", "Lower", "Higher"],
                  ["Power consumption", "~25W", "~75W"],
                  ["Best for", "Pure AI training", "Multi-tenant / cloud infra"],
                ].map(([cap, hca, dpu], i) => (
                  <tr key={i}>
                    <td className="py-2 pr-4 text-slate-400">{cap}</td>
                    <td className="py-2 px-4 text-center">
                      {typeof hca === "boolean"
                        ? <span className={hca ? "text-green-400" : "text-slate-700"}>{hca ? "✓" : "—"}</span>
                        : <span className="text-slate-300">{hca}</span>}
                    </td>
                    <td className="py-2 px-4 text-center">
                      {typeof dpu === "boolean"
                        ? <span className={dpu ? "text-green-400" : "text-slate-700"}>{dpu ? "✓" : "—"}</span>
                        : <span className="text-slate-300">{dpu}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mode === "in_dgx" && (
        <div className="space-y-4">
          <p className="text-sm leading-7 text-slate-300">
            A DGX H100 or H200 node uses 8 ConnectX-7 HCAs for the compute fabric plus 2 dual-port ConnectX-7 cards for storage and in-band management. BlueField-3 enters the picture on later platforms such as DGX B200 and GB200, where storage and security offload move onto the DPU itself.
          </p>

          <div className="rounded-xl bg-slate-800/50 p-4">
            <div className="text-xs uppercase tracking-widest text-slate-500 mb-3">DGX H100 network adapters</div>
            <div className="space-y-2">
              {[
                { name: "ConnectX-7 × 8", count: "One per GPU", network: "Compute fabric", purpose: "AllReduce, RDMA training traffic — Rails 0–7", color: "#1e40af" },
                { name: "BlueField-3 × 2", count: "Slot1 / Slot2", network: "Storage fabric", purpose: "NVMe-oF storage and in-band management", color: "#6d28d9" },
              ].map(item => (
                <div key={item.name} className="rounded-xl p-3"
                  style={{ backgroundColor: item.color + "22", border: `1px solid ${item.color}44` }}>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-sm font-bold text-white">{item.name}</span>
                    <span className="text-xs text-slate-400">{item.count}</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-slate-500 w-24 flex-shrink-0">Network</span>
                    <span className="text-slate-300">{item.network}</span>
                  </div>
                  <div className="flex gap-3 text-xs mt-1">
                    <span className="text-slate-500 w-24 flex-shrink-0">Purpose</span>
                    <span className="text-slate-300">{item.purpose}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
            <span className="font-semibold">Important: </span>
            On DGX H100 and H200, the compute and storage fabrics are still physically separate, but both use ConnectX-7 adapters. The compute HCAs connect to InfiniBand or Spectrum-X switches. The Slot1 and Slot2 dual-port ConnectX-7 cards connect to the Ethernet storage fabric. This physical separation is what prevents storage traffic from impacting training performance.
          </div>
        </div>
      )}
    </div>
  )
}

export default DPUExplainerViz

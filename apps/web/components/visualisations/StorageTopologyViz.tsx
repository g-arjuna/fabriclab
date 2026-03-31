"use client"
import { useState } from "react"

// ── StorageTopologyViz ────────────────────────────────────────────────────────
// Side-by-side: compute fabric vs storage fabric.
// Toggle to highlight differences: topology, oversubscription, protocol, traffic.

type Focus = "both" | "compute" | "storage"

const specs = {
  compute: {
    label: "Compute fabric",
    switches: "QM9700 IB / SN5600 Ethernet",
    topology: "Rail-optimised fat-tree (1:1 non-blocking)",
    overSubscription: "1:1 (non-blocking)",
    protocol: "InfiniBand NDR or RoCEv2",
    traffic: "Bursty all-to-all AllReduce — µs bursts",
    lossless: true,
    pfcRequired: true,
    ecnRequired: true,
    adaptiveRouting: true,
    color: "#1e3a5f",
    border: "#60a5fa",
    nodes: ["ConnectX-7 × 2\nper DGX node"],
  },
  storage: {
    label: "Storage fabric",
    switches: "SN5600 / SN4600 Ethernet (Spectrum)",
    topology: "Standard fat-tree (2:1 oversubscribed acceptable)",
    overSubscription: "2:1 to 4:1",
    protocol: "NVMe-oF/RDMA over Ethernet",
    traffic: "Sustained sequential — 1–30 sec transfers",
    lossless: false,
    pfcRequired: false,
    ecnRequired: true,
    adaptiveRouting: false,
    color: "#14532d",
    border: "#22c55e",
    nodes: ["ConnectX-7 × 2\nper DGX node"],
  },
}

const rows: { key: keyof typeof specs.compute; label: string }[] = [
  { key: "switches", label: "Switch hardware" },
  { key: "topology", label: "Topology" },
  { key: "overSubscription", label: "Oversubscription" },
  { key: "protocol", label: "Protocol" },
  { key: "traffic", label: "Traffic pattern" },
]

const boolRows: { key: "lossless" | "pfcRequired" | "ecnRequired" | "adaptiveRouting"; label: string }[] = [
  { key: "lossless", label: "Lossless required" },
  { key: "pfcRequired", label: "PFC required" },
  { key: "ecnRequired", label: "ECN recommended" },
  { key: "adaptiveRouting", label: "Adaptive/per-packet routing" },
]

export function StorageTopologyViz() {
  const [focus, setFocus] = useState<Focus>("both")

  const showCompute = focus === "both" || focus === "compute"
  const showStorage = focus === "both" || focus === "storage"

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
        Storage vs compute fabric topology
      </p>
      <p className="mb-5 text-xs text-slate-600">
        Same DGX node, two completely separate network fabrics with different design requirements
      </p>

      {/* Focus toggle */}
      <div className="flex gap-2 mb-5">
        {(["both", "compute", "storage"] as Focus[]).map(f => (
          <button key={f} onClick={() => setFocus(f)}
            className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all"
            style={{
              backgroundColor: focus === f ? "#1e293b" : "#0f172a",
              border: `1px solid ${focus === f ? "#60a5fa" : "#1e293b"}`,
              color: focus === f ? "#e2e8f0" : "#475569",
            }}
          >
            {f === "both" ? "Compare both" : f === "compute" ? "Compute fabric" : "Storage fabric"}
          </button>
        ))}
      </div>

      {/* Topology diagram */}
      <div className="rounded-xl bg-[#060d18] border border-white/8 p-4 mb-5">
        <svg viewBox="0 0 560 220" className="w-full">

          {/* DGX node in center */}
          <rect x="220" y="85" width="120" height="50" rx="8"
            fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
          <text x="280" y="107" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="600">DGX H100</text>
          <text x="280" y="122" textAnchor="middle" fill="#475569" fontSize="8">8 GPUs · 8 CX7 · 2 CX7 (Slot1/2)</text>

          {/* Compute fabric (left side) */}
          {showCompute && (
            <>
              {/* ConnectX-7 label */}
              <rect x="60" y="100" width="80" height="20" rx="4"
                fill="#1e3a5f33" stroke="#60a5fa55" strokeWidth="1" />
              <text x="100" y="114" textAnchor="middle" fill="#60a5fa" fontSize="7">ConnectX-7 × 8</text>

              {/* Leaf switches */}
              {[0, 1, 2].map(i => {
                const y = 25 + i * 55
                return (
                  <g key={i}>
                    <rect x="10" y={y} width="60" height="28" rx="4"
                      fill="#1e3a5f55" stroke="#60a5fa" strokeWidth="1.5" />
                    <text x="40" y={y + 12} textAnchor="middle" fill="#93c5fd" fontSize="7">Leaf {i}</text>
                    <text x="40" y={y + 22} textAnchor="middle" fill="#475569" fontSize="6">IB / RoCEv2</text>
                    {/* Link to ConnectX-7 */}
                    <line x1="70" y1={y + 14} x2="60" y2="110" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
                  </g>
                )
              })}
              {/* ConnectX-7 to DGX */}
              <line x1="140" y1="110" x2="220" y2="110" stroke="#60a5fa" strokeWidth="2" />

              {/* Compute label */}
              <text x="40" y="196" textAnchor="middle" fill="#60a5fa" fontSize="8" fontWeight="600">
                Compute fabric
              </text>
              <text x="40" y="208" textAnchor="middle" fill="#475569" fontSize="7">
                1:1 non-blocking
              </text>
            </>
          )}

          {/* Storage fabric (right side) */}
          {showStorage && (
            <>
              {/* BlueField-3 label */}
              <rect x="420" y="100" width="80" height="20" rx="4"
                fill="#14532d33" stroke="#22c55e55" strokeWidth="1" />
              <text x="460" y="114" textAnchor="middle" fill="#22c55e" fontSize="7">ConnectX-7 × 2</text>

              {/* Storage switch */}
              <rect x="490" y="52" width="60" height="28" rx="4"
                fill="#14532d55" stroke="#22c55e" strokeWidth="1.5" />
              <text x="520" y="66" textAnchor="middle" fill="#86efac" fontSize="7">Storage sw</text>
              <text x="520" y="76" textAnchor="middle" fill="#475569" fontSize="6">Spectrum</text>

              {/* Storage appliance */}
              <rect x="490" y="122" width="60" height="28" rx="4"
                fill="#14532d33" stroke="#22c55e55" strokeWidth="1" />
              <text x="520" y="136" textAnchor="middle" fill="#22c55e" fontSize="7">NVMe-oF</text>
              <text x="520" y="146" textAnchor="middle" fill="#475569" fontSize="6">storage tier</text>

              {/* Links */}
              <line x1="340" y1="110" x2="420" y2="110" stroke="#22c55e" strokeWidth="2" />
              <line x1="500" y1="110" x2="490" y2="80" stroke="#22c55e" strokeWidth="1.5" opacity="0.8" />
              <line x1="500" y1="110" x2="490" y2="136" stroke="#22c55e" strokeWidth="1.5" opacity="0.8" />

              {/* Storage label */}
              <text x="520" y="196" textAnchor="middle" fill="#22c55e" fontSize="8" fontWeight="600">
                Storage fabric
              </text>
              <text x="520" y="208" textAnchor="middle" fill="#475569" fontSize="7">
                2:1 oversubscribed OK
              </text>
            </>
          )}

          {/* Physical separation callout */}
          {focus === "both" && (
            <>
              <line x1="280" y1="148" x2="280" y2="175"
                stroke="#334155" strokeWidth="0.5" strokeDasharray="3 2" />
              <text x="280" y="190" textAnchor="middle" fill="#334155" fontSize="8">
                physically separate switches
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Comparison table */}
      <div className="rounded-xl bg-slate-800/40 border border-white/5 overflow-hidden">
        <div className="grid grid-cols-3 gap-0">
          <div className="p-2 text-[9px] text-slate-600 uppercase tracking-widest">Property</div>
          <div className="p-2 text-[9px] font-bold text-center" style={{ color: "#60a5fa" }}>Compute fabric</div>
          <div className="p-2 text-[9px] font-bold text-center" style={{ color: "#22c55e" }}>Storage fabric</div>
        </div>

        {rows.map((r, i) => (
          <div key={r.key}
            className="grid grid-cols-3 gap-0 border-t border-white/5"
            style={{ backgroundColor: i % 2 === 0 ? "transparent" : "#0f172a44" }}
          >
            <div className="p-2 text-[9px] text-slate-500">{r.label}</div>
            <div className="p-2 text-[9px] text-slate-300 text-center leading-3">
              {specs.compute[r.key] as string}
            </div>
            <div className="p-2 text-[9px] text-slate-300 text-center leading-3">
              {specs.storage[r.key] as string}
            </div>
          </div>
        ))}

        {boolRows.map((r, i) => (
          <div key={r.key}
            className="grid grid-cols-3 gap-0 border-t border-white/5"
            style={{ backgroundColor: (rows.length + i) % 2 === 0 ? "transparent" : "#0f172a44" }}
          >
            <div className="p-2 text-[9px] text-slate-500">{r.label}</div>
            <div className="p-2 text-center">
              <span style={{ color: specs.compute[r.key] ? "#22c55e" : "#475569", fontSize: "12px" }}>
                {specs.compute[r.key] ? "✓" : "—"}
              </span>
            </div>
            <div className="p-2 text-center">
              <span style={{ color: specs.storage[r.key] ? "#22c55e" : "#475569", fontSize: "12px" }}>
                {specs.storage[r.key] ? "✓" : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-slate-800/40 border border-white/5 p-3">
        <div className="text-[10px] text-slate-400 leading-4">
          <span className="font-semibold text-slate-300">Why the same switch hardware (Spectrum)? </span>
          Operational simplicity. The same Cumulus Linux or SONiC OS, the same CLI, the same monitoring.
          The storage fabric does not need InfiniBand's credit-based flow control or SHARP in-network compute.
          Standard fat-tree Ethernet is completely sufficient for sequential storage transfer patterns.
        </div>
      </div>
    </div>
  )
}

export default StorageTopologyViz





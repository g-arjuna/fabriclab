// ConnectX7ModesViz.tsx
"use client"
import { useState } from "react"

type Tab = "side-by-side" | "deep-dive"
type Mode = "ib" | "eth"

const modeConfig = {
  ib: {
    label: "InfiniBand mode",
    color: "#818cf8",
    bg: "#818cf822",
    border: "#818cf844",
    linkType: "IB(1)",
    linkLayer: "InfiniBand",
    baseLid: "12",
    smLid: "1",
    addressing: "LID assigned by Subnet Manager",
    flowControl: "Credit-based (built-in to protocol)",
    lossless: "Guaranteed — cannot be misconfigured away",
    switches: "QM9700 (leaf), Q3400 (spine)",
    switchOS: "NVIDIA ONYX",
    management: "Centralised — UFM manages entire fabric",
    multitenancy: "Complex — requires IB partitioning",
    perfGap: "Baseline (maximum performance)",
  },
  eth: {
    label: "Ethernet / RoCEv2 mode",
    color: "#22c55e",
    bg: "#22c55e22",
    border: "#22c55e44",
    linkType: "ETH(2)",
    linkLayer: "Ethernet",
    baseLid: "0",
    smLid: "0",
    addressing: "MAC + IP address",
    flowControl: "PFC + ECN (must be configured)",
    lossless: "Requires correct PFC + ECN on every port",
    switches: "SN5600 (leaf), standard Ethernet (spine)",
    switchOS: "Cumulus Linux / SONiC",
    management: "Distributed — each switch configured independently",
    multitenancy: "Straightforward — standard Ethernet segmentation",
    perfGap: "5–10% below IB at typical cluster scale",
  },
}

const deepDiveRows = [
  { label: "Protocol", ib: "Native InfiniBand", eth: "RoCEv2 (RDMA over UDP/IP)" },
  { label: "Address type", ib: "LID (Local Identifier)", eth: "MAC + IP address" },
  { label: "Flow control", ib: "Credit-based (link layer)", eth: "PFC + ECN (configured)" },
  { label: "Packet loss", ib: "Impossible at link layer", eth: "Possible if PFC/ECN misconfigured" },
  { label: "Switch family", ib: "QM9700 / Q3400", eth: "SN5600 / standard Ethernet" },
  { label: "Switch OS", ib: "NVIDIA ONYX", eth: "Cumulus Linux / SONiC" },
  { label: "Fabric manager", ib: "UFM (centralised)", eth: "None required" },
  { label: "ibstat LIDs", ib: "Non-zero (SM assigned)", eth: "Zero (no SM)" },
  { label: "Physical cables", ib: "QSFP56 / OSFP", eth: "QSFP56 / OSFP (same)" },
  { label: "NVLink affected", ib: "No", eth: "No" },
]

function MlxconfigBlock({ mode }: { mode: Mode }) {
  const cfg = modeConfig[mode]
  const cmd = mode === "ib"
    ? "mlxconfig -d /dev/mst/mt4129_pciconf0 set LINK_TYPE_P1=1"
    : "mlxconfig -d /dev/mst/mt4129_pciconf0 set LINK_TYPE_P1=2"
  return (
    <div className="rounded-xl bg-[#0a0f1a] border border-white/10 p-3 font-mono text-xs leading-6 text-slate-300">
      <div className="text-slate-500 mb-1"># Set NIC to {cfg.label}</div>
      <div className="text-amber-300">{cmd}</div>
      <div className="mt-2 text-slate-500"># After reboot, ibstat shows:</div>
      <div className="pl-4 text-slate-400">Link layer: <span style={{ color: cfg.color }}>{cfg.linkLayer}</span></div>
      <div className="pl-4 text-slate-400">Base lid:   <span style={{ color: cfg.baseLid === "0" ? "#ef4444" : "#22c55e" }}>{cfg.baseLid}{cfg.baseLid === "0" ? "  ← no SM, no LID" : "  ← SM assigned"}</span></div>
      <div className="pl-4 text-slate-400">SM lid:     <span style={{ color: cfg.smLid === "0" ? "#ef4444" : "#22c55e" }}>{cfg.smLid}{cfg.smLid === "0" ? "     ← no Subnet Manager" : "     ← SM at LID 1"}</span></div>
      <div className="pl-4 text-slate-400">LINK_TYPE:  <span className="text-slate-200">{cfg.linkType}</span></div>
    </div>
  )
}

export function ConnectX7ModesViz() {
  const [tab, setTab] = useState<Tab>("side-by-side")
  const [activeMode, setActiveMode] = useState<Mode>("eth")

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">ConnectX-7 — one card, two operating modes</p>
      <p className="mb-4 text-xs text-slate-500">The same silicon. The same cable. Completely different protocol personality.</p>

      {/* Tab selector */}
      <div className="flex gap-2 mb-5">
        {(["side-by-side", "deep-dive"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
            style={{
              backgroundColor: tab === t ? "#3b82f622" : "#0f172a",
              border: `1px solid ${tab === t ? "#3b82f6" : "#1e293b"}`,
              color: tab === t ? "#60a5fa" : "#64748b",
            }}>
            {t === "side-by-side" ? "Side by side" : "Deep dive"}
          </button>
        ))}
      </div>

      {tab === "side-by-side" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(["ib", "eth"] as Mode[]).map(mode => {
            const cfg = modeConfig[mode]
            return (
              <div key={mode} className="rounded-xl p-4 space-y-3"
                style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                  <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                </div>
                <MlxconfigBlock mode={mode} />
                <div className="space-y-1.5 text-xs">
                  <Row label="Addressing" value={cfg.addressing} />
                  <Row label="Flow control" value={cfg.flowControl} highlight={mode === "eth"} />
                  <Row label="Lossless" value={cfg.lossless} highlight={mode === "eth"} />
                  <Row label="Switches" value={cfg.switches} />
                  <Row label="Switch OS" value={cfg.switchOS} />
                  <Row label="Performance" value={cfg.perfGap} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === "deep-dive" && (
        <div>
          <div className="flex gap-2 mb-4">
            {(["ib", "eth"] as Mode[]).map(mode => {
              const cfg = modeConfig[mode]
              return (
                <button key={mode} onClick={() => setActiveMode(mode)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: activeMode === mode ? cfg.bg : "#0f172a",
                    border: `1px solid ${activeMode === mode ? cfg.color : "#1e293b"}`,
                    color: activeMode === mode ? cfg.color : "#64748b",
                  }}>
                  {cfg.label}
                </button>
              )
            })}
          </div>
          <div className="rounded-xl bg-[#0a0f1a] border border-white/10 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-3 text-slate-500 font-medium">Property</th>
                  <th className="text-left p-3 font-medium" style={{ color: modeConfig[activeMode].color }}>
                    {modeConfig[activeMode].label}
                  </th>
                </tr>
              </thead>
              <tbody>
                {deepDiveRows.map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? "bg-white/[0.02]" : ""}>
                    <td className="p-3 text-slate-400 font-mono">{row.label}</td>
                    <td className="p-3 text-slate-200">{activeMode === "ib" ? row.ib : row.eth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            The DGX node hardware — GPUs, NVLink, NVSwitch, CPUs — is identical in both modes. Only the external fabric changes.
          </p>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-500 shrink-0 w-24">{label}:</span>
      <span className={highlight ? "text-amber-300" : "text-slate-300"}>{value}</span>
    </div>
  )
}

export default ConnectX7ModesViz

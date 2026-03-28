"use client"
import { useState } from "react"

// ── NVLinkDiagnosticsViz ───────────────────────────────────────────────────
// Side-by-side comparison of IB vs NVLink Switch diagnostic approaches.
// Click a fault scenario to see which commands and counters apply on each fabric.

type Scenario = {
  id: string
  label: string
  ib: {
    tool: string
    command: string
    output: string
    action: string
  }
  nvlink: {
    tool: string
    command: string
    output: string
    action: string
  }
  keyDiff: string
}

const SCENARIOS: Scenario[] = [
  {
    id: "link-check",
    label: "Routine link health check",
    ib: {
      tool: "ibstat / UFM REST",
      command: "ibstat\ncurl -sk -u admin:pw https://ufm/ufmRest/resources/alarms",
      output: `CA 'mlx5_0'\n  Port 1:\n    State: Active\n    Physical state: LinkUp\n    Rate: 400 Gb/sec`,
      action: "State: Active = healthy. Check UFM alarms for fabric-wide issues.",
    },
    nvlink: {
      tool: "nvidia-smi nvlink",
      command: "nvidia-smi nvlink --status -i 0",
      output: `GPU 00000000:03:00.0\n  Link 0: Active\n  Link 1: Active\n  ...all 18 links Active`,
      action: "All links Active = healthy. Monitor DCGM NVLink bandwidth counters for degradation.",
    },
    keyDiff: "IB uses UFM + ibstat for fabric-wide state. NVLink uses nvidia-smi per GPU — no fabric-wide management plane.",
  },
  {
    id: "error-counters",
    label: "Check error counters",
    ib: {
      tool: "perfquery / UFM REST",
      command: "perfquery -x 0  # query port counters\ncurl .../ufmRest/resources/ports | jq '.[].symbol_error'",
      output: `# PortCounters: SymbolErrors=0\n# LinkErrorRecovery=0\n# PortRcvErrors=0`,
      action: "Rate-of-change is the signal. See Ch11 threshold guidance: >0.17/s for 5+ min = alert.",
    },
    nvlink: {
      tool: "nvidia-smi nvlink / DCGM",
      command: "nvidia-smi nvlink --errorcounters -i 0\ndcgmi dmon -e 1001,1002,1003",
      output: `GPU 00000000:03:00.0\n  Link 0: Replay errors: 0\n          CRC Flit errors: 0\n          CRC Data errors: 0`,
      action: "Any non-zero replay or CRC errors warrant immediate investigation. No 'rate threshold' — NVLink errors should be zero.",
    },
    keyDiff: "IB allows occasional symbol errors (FEC-corrected). NVLink errors should be strictly zero — any non-zero count means investigate immediately.",
  },
  {
    id: "link-failure",
    label: "Link failure / degraded link",
    ib: {
      tool: "ibstat + UFM",
      command: "ibstat  # shows State: Down\nibdiagnet --ber_threshold 1e-12",
      output: `Port 1:\n  State: Down\n  Physical state: Polling\nUFM alarm: PortDown on 0x506b...`,
      action: "UFM Subnet Manager detects down port, re-routes around it automatically (adaptive routing). Replace cable during maintenance window.",
    },
    nvlink: {
      tool: "nvidia-smi nvlink",
      command: "nvidia-smi nvlink --status -i 0",
      output: `GPU 00000000:03:00.0\n  Link 0: Active\n  Link 5: Inactive  ← degraded\n  Link 6: Active`,
      action: "Inactive link = reduced bandwidth. NO automatic rerouting. Replace OSFP cable immediately — the link will not recover on its own.",
    },
    keyDiff: "IB: SM re-routes around failures automatically. NVLink Switch: no SM, no rerouting. A failed lane is a permanent bandwidth loss until the cable is replaced.",
  },
  {
    id: "bandwidth-drop",
    label: "Bandwidth drop during training",
    ib: {
      tool: "DCGM + NCCL logs",
      command: "dcgmi dmon -e 252  # GPU util\n# NCCL log: look for timeout_count",
      output: `# DCGM_FI_DEV_GPU_UTIL: 71%  ← dropped from 97%\n# NCCL log: timeout_count=12`,
      action: "GPU util drop + NCCL timeouts → check UFM for IB port symbol errors or link flaps on affected DGX nodes. Follow Ch11 correlation timeline.",
    },
    nvlink: {
      tool: "DCGM NVLink BW counters",
      command: "dcgmi dmon -e 1001  # NVLink BW\nnvidia-smi nvlink --errorcounters -i 0",
      output: `# NVLINK_BANDWIDTH_C0_TX: 410 GB/s  ← below 900 GB/s expected\n# Replay errors: 847  ← non-zero`,
      action: "NVLink BW drop + replay errors → degraded NVLink lane. Identify which lane with nvidia-smi nvlink --status. Replace OSFP cable on the Inactive lane.",
    },
    keyDiff: "IB bandwidth drops trace through the scale-out fabric (UFM, ibstat). NVLink Switch bandwidth drops trace through DCGM NVLink counters and nvidia-smi per-link status.",
  },
]

export function NVLinkDiagnosticsViz() {
  const [selected, setSelected] = useState<string>("link-failure")
  const scenario = SCENARIOS.find(s => s.id === selected)!

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">Diagnostics: IB vs NVLink Switch</p>
      <p className="mb-4 text-xs text-slate-600">
        Different fabrics, different tools. Select a fault scenario to compare the diagnostic approach on each fabric.
      </p>

      {/* Scenario selector */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {SCENARIOS.map(s => (
          <button key={s.id}
            onClick={() => setSelected(s.id)}
            style={{
              background: selected === s.id ? "#1d4ed8" : "#1e293b",
              color: selected === s.id ? "#fff" : "#94a3b8",
              border: `1px solid ${selected === s.id ? "#3b82f6" : "#334155"}`,
              borderRadius: 8, padding: "5px 12px",
              fontSize: 11, cursor: "pointer",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Side-by-side panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        {[
          { title: "InfiniBand / RoCEv2", side: scenario.ib, borderColor: "#3b82f6", bg: "#020f23" },
          { title: "NVLink Switch System", side: scenario.nvlink, borderColor: "#f59e0b", bg: "#100a00" },
        ].map(({ title, side, borderColor, bg }) => (
          <div key={title} style={{
            background: bg,
            borderRadius: 10,
            padding: 12,
            borderTop: `2px solid ${borderColor}`,
          }}>
            <p style={{ fontSize: 11, color: borderColor, fontWeight: 700, marginBottom: 8 }}>{title}</p>

            <p style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              Tool
            </p>
            <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>{side.tool}</p>

            <p style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              Command
            </p>
            <pre style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 10,
              color: "#86efac",
              background: "#020617",
              borderRadius: 6,
              padding: "8px 10px",
              margin: "0 0 10px",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
            }}>
              {side.command}
            </pre>

            <p style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              Expected output
            </p>
            <pre style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 10,
              color: "#7dd3fc",
              background: "#020617",
              borderRadius: 6,
              padding: "8px 10px",
              margin: "0 0 10px",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
            }}>
              {side.output}
            </pre>

            <p style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              Action
            </p>
            <p style={{ fontSize: 11, color: "#e2e8f0", lineHeight: 1.5, margin: 0 }}>{side.action}</p>
          </div>
        ))}
      </div>

      {/* Key difference callout */}
      <div style={{
        background: "#0f172a",
        borderRadius: 10,
        padding: 12,
        borderLeft: "3px solid #8b5cf6",
      }}>
        <p style={{ fontSize: 10, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
          Key difference
        </p>
        <p style={{ fontSize: 12, color: "#c4b5fd", margin: 0, lineHeight: 1.6 }}>
          {scenario.keyDiff}
        </p>
      </div>
    </div>
  )
}

export default NVLinkDiagnosticsViz

"use client"
import { useState } from "react"

// ── DCGMMetricsViz ──────────────────────────────────────────────────────────
// GPU metric taxonomy for AI fabric health. Click a failure scenario to see
// which DCGM metrics spike, which stay normal, and what to investigate next.

type Scenario = {
  id: string
  label: string
  description: string
  metrics: Record<string, "critical" | "elevated" | "normal" | "na">
  nextStep: string
}

type Metric = {
  id: string
  name: string
  unit: string
  healthy: string
  group: string
}

const METRICS: Metric[] = [
  { id: "gpu_util",         name: "GPU_UTIL",                    unit: "%",      healthy: "95–100%",  group: "Compute" },
  { id: "power",            name: "POWER_USAGE",                 unit: "W",      healthy: "300–700W", group: "Compute" },
  { id: "temp",             name: "GPU_TEMP",                    unit: "°C",     healthy: "<80°C",    group: "Compute" },
  { id: "nvlink_bw",        name: "NVLINK_BANDWIDTH_TOTAL",      unit: "GB/s",   healthy: "600–900",  group: "NVLink" },
  { id: "nvlink_replay",    name: "NVLINK_REPLAY_ERROR_COUNT",   unit: "count",  healthy: "0",        group: "NVLink" },
  { id: "nvlink_crc",       name: "NVLINK_CRC_FLIT_ERROR",       unit: "count",  healthy: "0",        group: "NVLink" },
  { id: "ecc_sbe",          name: "ECC_SBE_VOL_TOTAL",           unit: "count",  healthy: "<10/day",  group: "Memory" },
  { id: "ecc_dbe",          name: "ECC_DBE_VOL_TOTAL",           unit: "count",  healthy: "0",        group: "Memory" },
  { id: "pcie_replay",      name: "PCIE_REPLAY_COUNTER",         unit: "count",  healthy: "0",        group: "PCIe" },
]

const SCENARIOS: Scenario[] = [
  {
    id: "healthy",
    label: "Healthy training run",
    description: "All systems nominal. GPU utilisation is high, NVLink bandwidth near peak, no error counters incrementing.",
    metrics: {
      gpu_util: "normal", power: "normal", temp: "normal",
      nvlink_bw: "normal", nvlink_replay: "normal", nvlink_crc: "normal",
      ecc_sbe: "normal", ecc_dbe: "normal", pcie_replay: "normal",
    },
    nextStep: "No action needed. Verify utilisation stays above 90% throughout the job.",
  },
  {
    id: "ib_link_flap",
    label: "IB link flapping",
    description: "A leaf-to-DGX DAC cable is marginal. The IB link flaps occasionally, causing AllReduce stalls and retransmissions.",
    metrics: {
      gpu_util: "critical", power: "elevated", temp: "normal",
      nvlink_bw: "elevated", nvlink_replay: "normal", nvlink_crc: "normal",
      ecc_sbe: "normal", ecc_dbe: "normal", pcie_replay: "normal",
    },
    nextStep: "GPU util drops but NVLink errors are absent → fault is in the scale-out fabric (IB/RoCEv2), not NVLink. Check UFM alarms for the affected DGX node's HCA ports.",
  },
  {
    id: "nvlink_degraded",
    label: "NVLink lane degraded",
    description: "One NVLink lane between two GPUs in the same DGX node is degrading. Intra-node AllReduce bandwidth drops.",
    metrics: {
      gpu_util: "elevated", power: "normal", temp: "normal",
      nvlink_bw: "critical", nvlink_replay: "critical", nvlink_crc: "elevated",
      ecc_sbe: "normal", ecc_dbe: "normal", pcie_replay: "normal",
    },
    nextStep: "NVLink replay errors + bandwidth drop → intra-node issue. Use nvidia-smi nvlink --status to identify the degraded link. Check NVSwitch logs. This is a hardware fault — engage NVIDIA support.",
  },
  {
    id: "hbm_degrading",
    label: "HBM memory degrading",
    description: "A GPU's HBM stack is accumulating ECC errors. Training continues but with increasing single-bit corrections.",
    metrics: {
      gpu_util: "normal", power: "normal", temp: "elevated",
      nvlink_bw: "normal", nvlink_replay: "normal", nvlink_crc: "normal",
      ecc_sbe: "critical", ecc_dbe: "elevated", pcie_replay: "normal",
    },
    nextStep: "ECC SBE accumulation with rising temperature → HBM degradation. Monitor DBE count — if non-zero, the GPU must be taken out of service. Run nvidia-smi -q for page retirement status.",
  },
  {
    id: "thermal_throttle",
    label: "GPU thermal throttling",
    description: "Cooling failure or airflow obstruction is causing the GPU to throttle. Compute throughput drops to protect the chip.",
    metrics: {
      gpu_util: "critical", power: "critical", temp: "critical",
      nvlink_bw: "elevated", nvlink_replay: "normal", nvlink_crc: "normal",
      ecc_sbe: "normal", ecc_dbe: "normal", pcie_replay: "normal",
    },
    nextStep: "GPU temp >83°C with power and util dropping together = thermal throttle. Check DGX chassis fans, inlet air temperature, and rack cooling. This is a data centre / mechanical issue, not a network fault.",
  },
  {
    id: "pcie_issue",
    label: "PCIe link quality issue",
    description: "A PCIe link between the GPU and CPU or NVMe drive is degraded. Checkpoint writes slow, storage throughput drops.",
    metrics: {
      gpu_util: "elevated", power: "normal", temp: "normal",
      nvlink_bw: "normal", nvlink_replay: "normal", nvlink_crc: "normal",
      ecc_sbe: "normal", ecc_dbe: "normal", pcie_replay: "critical",
    },
    nextStep: "PCIe replay counter rising with no NVLink or IB issues → PCIe link quality problem. Check lspci -vvv for link speed downgrade (e.g. PCIe Gen5 → Gen3). Reseat the GPU or replace the riser cable.",
  },
]

const STATUS_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "#7f1d1d", text: "#fca5a5", label: "ABNORMAL" },
  elevated: { bg: "#78350f", text: "#fcd34d", label: "ELEVATED" },
  normal:   { bg: "#14532d", text: "#86efac", label: "NORMAL" },
  na:       { bg: "#1e293b", text: "#475569", label: "N/A" },
}

const GROUP_COLOR: Record<string, string> = {
  Compute: "#3b82f6",
  NVLink:  "#8b5cf6",
  Memory:  "#f59e0b",
  PCIe:    "#06b6d4",
}

export function DCGMMetricsViz() {
  const [selected, setSelected] = useState<string>("healthy")
  const scenario = SCENARIOS.find(s => s.id === selected)!

  const groups = Array.from(new Set(METRICS.map(m => m.group)))

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">DCGM Metric Taxonomy</p>
      <p className="mb-5 text-xs text-slate-600">
        Click a failure scenario to see which GPU metrics spike and what to investigate next.
      </p>

      {/* Scenario tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {SCENARIOS.map(s => (
          <button
            key={s.id}
            onClick={() => setSelected(s.id)}
            style={{
              background: selected === s.id ? "#1d4ed8" : "#1e293b",
              color: selected === s.id ? "#fff" : "#94a3b8",
              border: `1px solid ${selected === s.id ? "#3b82f6" : "#334155"}`,
              borderRadius: 8,
              padding: "5px 12px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Scenario description */}
      <div style={{ background: "#0f172a", borderRadius: 10, padding: 12, marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: "#cbd5e1", margin: 0, lineHeight: 1.6 }}>
          {scenario.description}
        </p>
      </div>

      {/* Metric grid by group */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        {groups.map(group => {
          const groupMetrics = METRICS.filter(m => m.group === group)
          return (
            <div key={group}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: GROUP_COLOR[group] }} />
                <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {group}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 6 }}>
                {groupMetrics.map(m => {
                  const status = scenario.metrics[m.id] as string
                  const colors = STATUS_COLOR[status]
                  return (
                    <div key={m.id} style={{
                      background: colors.bg,
                      borderRadius: 8,
                      padding: "8px 10px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}>
                      <div>
                        <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: colors.text, margin: 0 }}>
                          {m.name}
                        </p>
                        <p style={{ fontSize: 10, color: "#475569", margin: 0 }}>healthy: {m.healthy}</p>
                      </div>
                      <span style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: colors.text,
                        letterSpacing: "0.06em",
                        background: "rgba(0,0,0,0.3)",
                        padding: "2px 6px",
                        borderRadius: 4,
                      }}>
                        {colors.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Next step */}
      <div style={{ background: "#0f172a", borderRadius: 10, padding: 12, borderLeft: "3px solid #3b82f6" }}>
        <p style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          Investigation next step
        </p>
        <p style={{ fontSize: 12, color: "#7dd3fc", margin: 0, lineHeight: 1.6 }}>
          {scenario.nextStep}
        </p>
      </div>
    </div>
  )
}

export default DCGMMetricsViz

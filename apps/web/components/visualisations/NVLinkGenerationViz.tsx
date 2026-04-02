"use client"
import { useState } from "react"

// ── NVLinkGenerationViz ─────────────────────────
// Interactive NVLink / NVSwitch generation table.
// Click a GPU generation to see bandwidth breakdown,
// NVSwitch pairing, and real machine context.

const GENERATIONS = [
  {
    id: "v100",
    gpu: "V100",
    arch: "Volta",
    year: 2017,
    nvlinkGen: 2,
    linksPerGPU: 6,
    bwPerLink: 25,
    totalBW: 300,
    nvswitchGen: 1,
    nvswitchAgg: 900,
    dgx: "DGX V100",
    gpusPerNode: 8,
    formFactor: "SXM2",
    color: "#185FA5",
    fill: "#B5D4F4",
  },
  {
    id: "a100",
    gpu: "A100",
    arch: "Ampere",
    year: 2020,
    nvlinkGen: 3,
    linksPerGPU: 12,
    bwPerLink: 25,
    totalBW: 600,
    nvswitchGen: 2,
    nvswitchAgg: 7200,
    dgx: "DGX A100",
    gpusPerNode: 8,
    formFactor: "SXM4",
    color: "#0F6E56",
    fill: "#9FE1CB",
  },
  {
    id: "h100",
    gpu: "H100",
    arch: "Hopper",
    year: 2022,
    nvlinkGen: 4,
    linksPerGPU: 18,
    bwPerLink: 25,
    totalBW: 900,
    nvswitchGen: 3,
    nvswitchAgg: 13600,
    dgx: "DGX H100",
    gpusPerNode: 8,
    formFactor: "SXM5",
    color: "#534AB7",
    fill: "#CECBF6",
  },
  {
    id: "b200",
    gpu: "B200",
    arch: "Blackwell",
    year: 2024,
    nvlinkGen: 5,
    linksPerGPU: 18,
    bwPerLink: 50,
    totalBW: 1800,
    nvswitchGen: 4,
    nvswitchAgg: 28000,
    dgx: "DGX B200 / NVL72",
    gpusPerNode: 8,
    formFactor: "SXM6",
    color: "#854F0B",
    fill: "#FAC775",
  },
]

function BandwidthBar({ bw, maxBw, color }: { bw: number; maxBw: number; color: string }) {
  const pct = Math.round((bw / maxBw) * 100)
  return (
    <div style={{ height: "10px", background: "#1e293b", borderRadius: "5px", overflow: "hidden", marginTop: "4px" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "5px", transition: "width 0.4s" }} />
    </div>
  )
}

export function NVLinkGenerationViz() {
  const [sel, setSel] = useState("h100")
  const g = GENERATIONS.find(x => x.id === sel)!
  const maxBW = 1800
  const maxSwitch = 28000

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">NVLink & NVSwitch generations</div>
      <div className="mb-4 text-xs text-slate-600">Select a GPU generation to see the interconnect stack and DGX configuration</div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {GENERATIONS.map(gen => (
          <button
            key={gen.id}
            onClick={() => setSel(gen.id)}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: `1px solid ${sel === gen.id ? gen.color : "#444441"}`,
              background: sel === gen.id ? gen.color + "33" : "transparent",
              color: sel === gen.id ? gen.fill : "#888780",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: sel === gen.id ? 500 : 400,
            }}
          >
            {gen.gpu} ({gen.year})
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "16px" }}>
        <div style={{ background: "#1e293b", borderRadius: "10px", padding: "14px" }}>
          <div style={{ fontSize: "11px", color: "#5F5E5A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>NVLink {g.nvlinkGen} — GPU interconnect</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", marginBottom: "12px" }}>
            {[
              { label: "Links per GPU", value: String(g.linksPerGPU) },
              { label: "BW per link", value: `${g.bwPerLink} GB/s` },
              { label: "Total per GPU", value: `${g.totalBW} GB/s` },
              { label: "Form factor", value: g.formFactor },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#0f172a", borderRadius: "6px", padding: "8px 10px" }}>
                <div style={{ fontSize: "11px", color: "#5F5E5A", marginBottom: "2px" }}>{label}</div>
                <div style={{ fontSize: "15px", fontWeight: 500, color: g.fill }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: "11px", color: "#5F5E5A", marginBottom: "4px" }}>Bidirectional bandwidth vs B200</div>
          <BandwidthBar bw={g.totalBW} maxBw={maxBW} color={g.color} />
          <div style={{ fontSize: "11px", color: "#888780", marginTop: "4px", textAlign: "right" }}>{g.totalBW} GB/s / {maxBW} GB/s</div>
        </div>

        <div style={{ background: "#1e293b", borderRadius: "10px", padding: "14px" }}>
          <div style={{ fontSize: "11px", color: "#5F5E5A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>NVSwitch {g.nvswitchGen}th gen — node fabric</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", marginBottom: "12px" }}>
            {[
              { label: "Agg. switch BW", value: `${(g.nvswitchAgg / 1000).toFixed(1)} Tb/s` },
              { label: "GPUs per node", value: String(g.gpusPerNode) },
              { label: "DGX product", value: g.dgx },
              { label: "Architecture", value: g.arch },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#0f172a", borderRadius: "6px", padding: "8px 10px" }}>
                <div style={{ fontSize: "11px", color: "#5F5E5A", marginBottom: "2px" }}>{label}</div>
                <div style={{ fontSize: "13px", fontWeight: 500, color: g.fill }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: "11px", color: "#5F5E5A", marginBottom: "4px" }}>Switch aggregate BW vs B200</div>
          <BandwidthBar bw={g.nvswitchAgg} maxBw={maxSwitch} color={g.color} />
          <div style={{ fontSize: "11px", color: "#888780", marginTop: "4px", textAlign: "right" }}>{(g.nvswitchAgg / 1000).toFixed(1)} Tb/s / {(maxSwitch / 1000).toFixed(0)} Tb/s</div>
        </div>
      </div>

      <div style={{ padding: "10px 14px", background: "#1e293b", borderRadius: "8px", borderLeft: `3px solid ${g.color}`, fontSize: "12px", color: "#5F5E5A" }}>
        NVLink gen ≠ NVSwitch gen — separate counters. NVSwitch silicon generation always matches the DGX product generation it ships in, not the NVLink protocol number.
      </div>
    </div>
  )
}

export default NVLinkGenerationViz

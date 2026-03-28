"use client"
import { useState } from "react"

// ── PCIeBandwidthViz ─────────────────────────
// Shows PCIe Gen 4/5/6 bandwidth ceilings and
// how NIC + GPU demands consume that ceiling.
// Interactive: adjust NIC speed to see saturation.

const PCIE_GENS = [
  { gen: 4, bwPerDir: 31.5, label: "PCIe Gen 4 (x16)" },
  { gen: 5, bwPerDir: 63,   label: "PCIe Gen 5 (x16)" },
  { gen: 6, bwPerDir: 126,  label: "PCIe Gen 6 (x16)" },
]

const NIC_SPEEDS = [
  { label: "100G NIC",   gbps: 100, gbs: 12.5 },
  { label: "200G NIC",   gbps: 200, gbs: 25 },
  { label: "400G NIC",   gbps: 400, gbs: 50 },
  { label: "800G NIC",   gbps: 800, gbs: 100 },
]

function Gauge({ used, total, label, color }: { used: number; total: number; label: string; color: string }) {
  const pct = Math.min(100, Math.round((used / total) * 100))
  const over = pct >= 95
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
        <span style={{ fontSize: "12px", color: "#B4B2A9" }}>{label}</span>
        <span style={{ fontSize: "12px", fontWeight: 500, color: over ? "#E24B4A" : color }}>{pct}% used</span>
      </div>
      <div style={{ height: "14px", background: "#0f172a", borderRadius: "7px", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: over ? "#A32D2D" : color,
          borderRadius: "7px",
          transition: "width 0.4s",
        }} />
      </div>
      <div style={{ fontSize: "11px", color: "#5F5E5A", marginTop: "2px" }}>
        {used.toFixed(1)} GB/s used of {total} GB/s ceiling {over ? "— SATURATED" : ""}
      </div>
    </div>
  )
}

export function PCIeBandwidthViz() {
  const [pcieGen, setPcieGen] = useState(4)
  const [nicIdx, setNicIdx] = useState(2)

  const pcie = PCIE_GENS.find(g => g.gen === pcieGen)!
  const nic = NIC_SPEEDS[nicIdx]

  const nicDemand = nic.gbs
  const gpuCtrlDemand = 4
  const cudaMemcpyDemand = nicDemand
  const totalDemand = nicDemand + gpuCtrlDemand + cudaMemcpyDemand

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">PCIe bandwidth ceiling</div>
      <div className="mb-4 text-xs text-slate-600">Select PCIe generation and NIC speed to see how the bandwidth ceiling fills up (without GDS bypass)</div>

      <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "11px", color: "#5F5E5A", marginBottom: "6px" }}>PCIe generation</div>
          <div style={{ display: "flex", gap: "6px" }}>
            {PCIE_GENS.map(g => (
              <button
                key={g.gen}
                onClick={() => setPcieGen(g.gen)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "8px",
                  border: `1px solid ${pcieGen === g.gen ? "#378ADD" : "#444441"}`,
                  background: pcieGen === g.gen ? "#0C447C" : "transparent",
                  color: pcieGen === g.gen ? "#B5D4F4" : "#888780",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Gen {g.gen}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: "11px", color: "#5F5E5A", marginBottom: "6px" }}>NIC speed</div>
          <div style={{ display: "flex", gap: "6px" }}>
            {NIC_SPEEDS.map((n, i) => (
              <button
                key={i}
                onClick={() => setNicIdx(i)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "8px",
                  border: `1px solid ${nicIdx === i ? "#7F77DD" : "#444441"}`,
                  background: nicIdx === i ? "#3C3489" : "transparent",
                  color: nicIdx === i ? "#CECBF6" : "#888780",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div style={{ background: "#1e293b", borderRadius: "10px", padding: "14px" }}>
          <div style={{ fontSize: "11px", color: "#5F5E5A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
            {pcie.label} — {pcie.bwPerDir} GB/s per direction
          </div>
          <Gauge used={nicDemand} total={pcie.bwPerDir} label={`NIC inbound (${nic.label})`} color="#7F77DD" />
          <Gauge used={gpuCtrlDemand} total={pcie.bwPerDir} label="GPU control traffic" color="#888780" />
          <Gauge used={totalDemand} total={pcie.bwPerDir} label="Total (without GDS)" color="#D85A30" />
        </div>

        <div style={{ background: "#1e293b", borderRadius: "10px", padding: "14px" }}>
          <div style={{ fontSize: "11px", color: "#5F5E5A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>Summary</div>
          {[
            { label: "PCIe ceiling (1-dir)", value: `${pcie.bwPerDir} GB/s`, color: "#B5D4F4" },
            { label: "NIC demand", value: `${nicDemand} GB/s`, color: "#CECBF6" },
            { label: "Without GDS: total", value: `${totalDemand.toFixed(0)} GB/s`, color: totalDemand > pcie.bwPerDir ? "#E24B4A" : "#9FE1CB" },
            { label: "GDS bypasses cudaMemcpy", value: totalDemand > pcie.bwPerDir ? "Required" : "Recommended", color: totalDemand > pcie.bwPerDir ? "#E24B4A" : "#9FE1CB" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "0.5px solid #2d3748" }}>
              <span style={{ fontSize: "12px", color: "#5F5E5A" }}>{label}</span>
              <span style={{ fontSize: "13px", fontWeight: 500, color }}>{value}</span>
            </div>
          ))}
          <div style={{ marginTop: "10px", fontSize: "11px", color: "#5F5E5A", lineHeight: "1.6" }}>
            {totalDemand > pcie.bwPerDir
              ? `PCIe Gen ${pcieGen} is saturated by a ${nic.label} without GDS. Enable GPUDirect RDMA to bypass host RAM copies.`
              : `PCIe Gen ${pcieGen} handles a ${nic.label} with ${(pcie.bwPerDir - nicDemand).toFixed(0)} GB/s headroom.`}
          </div>
        </div>
      </div>

      <div style={{ padding: "10px 14px", background: "#1e293b", borderRadius: "8px", fontSize: "12px", color: "#5F5E5A", borderLeft: "2px solid #378ADD" }}>
        SXM GPUs avoid this entirely: NIC-to-GPU RDMA in a DGX node uses GDS via the DPU, bypassing PCIe for bulk data. The PCIe bus carries only control traffic — never training data.
      </div>
    </div>
  )
}

export default PCIeBandwidthViz

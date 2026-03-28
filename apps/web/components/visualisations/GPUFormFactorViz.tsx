"use client"
import { useState } from "react"

// ── GPUFormFactorViz ─────────────────────────
// Compares SXM and PCIe GPU form factors:
// connectivity paths, bandwidth per link, and
// which workload each suits.

type Mode = "sxm" | "pcie"

export function GPUFormFactorViz() {
  const [mode, setMode] = useState<Mode>("sxm")

  const sxmPaths = [
    { from: "GPU A (HBM)", to: "GPU B (HBM)", via: "NVSwitch", bw: "900 GB/s", color: "#1D9E75", good: true },
    { from: "GPU", to: "ConnectX-7", via: "NVLink → CPU PCIe", bw: "400 Gbps NIC", color: "#378ADD", good: true },
    { from: "DPU", to: "NVMe storage", via: "NVMe-oF / GDS", bw: "800 Gbps", color: "#7F77DD", good: true },
    { from: "CPU", to: "GPU", via: "PCIe Gen 5 (control only)", bw: "63 GB/s", color: "#888780", good: true },
  ]

  const pciePaths = [
    { from: "GPU A (HBM)", to: "GPU B (HBM)", via: "PCIe root complex", bw: "31.5 GB/s", color: "#D85A30", good: false },
    { from: "GPU", to: "ConnectX-7", via: "PCIe bus (shared)", bw: "limited by PCIe", color: "#D85A30", good: false },
    { from: "CPU RAM", to: "GPU HBM", via: "cudaMemcpy → PCIe", bw: "31.5 GB/s", color: "#D85A30", good: false },
    { from: "NIC RDMA", to: "GPU HBM", via: "PCIe + host RAM copy", bw: "≤31.5 GB/s", color: "#888780", good: false },
  ]

  const paths = mode === "sxm" ? sxmPaths : pciePaths

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">GPU form factors: SXM vs PCIe</div>
      <div className="mb-4 text-xs text-slate-600">Toggle to compare connectivity paths and bandwidth in each form factor</div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {(["sxm", "pcie"] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: "6px 18px",
              borderRadius: "8px",
              border: `1px solid ${mode === m ? (m === "sxm" ? "#1D9E75" : "#D85A30") : "#444441"}`,
              background: mode === m ? (m === "sxm" ? "#085041" : "#4A1B0C") : "transparent",
              color: mode === m ? (m === "sxm" ? "#9FE1CB" : "#F5C4B3") : "#888780",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: mode === m ? 500 : 400,
            }}
          >
            {m === "sxm" ? "SXM form factor (DGX)" : "PCIe form factor (OEM server)"}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
        {[
          {
            label: "GPU-to-GPU bandwidth",
            sxm: "900 GB/s (NVLink 4)",
            pcie: "31.5 GB/s (PCIe Gen 4)",
            ratio: "28×",
          },
          {
            label: "NIC-to-GPU (RDMA)",
            sxm: "Full line rate (GDS)",
            pcie: "PCIe ceiling limited",
            ratio: "~6×",
          },
          {
            label: "NVLink Switch eligible",
            sxm: "Yes — full port count",
            pcie: "No — NVLink absent",
            ratio: "—",
          },
          {
            label: "Primary workload",
            sxm: "Training at scale",
            pcie: "Inference / cloud VM",
            ratio: "—",
          },
        ].map(({ label, sxm, pcie, ratio }) => (
          <div key={label} style={{ background: "#1e293b", borderRadius: "8px", padding: "10px 12px" }}>
            <div style={{ fontSize: "11px", color: "#5F5E5A", marginBottom: "4px" }}>{label}</div>
            <div style={{ fontSize: "13px", fontWeight: 500, color: "#9FE1CB", marginBottom: "2px" }}>SXM: {sxm}</div>
            <div style={{ fontSize: "13px", color: "#F5C4B3" }}>PCIe: {pcie}</div>
            {ratio !== "—" && (
              <div style={{ fontSize: "11px", color: "#5F5E5A", marginTop: "4px" }}>SXM advantage: {ratio}</div>
            )}
          </div>
        ))}
      </div>

      <div style={{ fontSize: "11px", color: "#5F5E5A", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {mode === "sxm" ? "SXM connectivity paths" : "PCIe connectivity paths"}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {paths.map((p, i) => (
          <div key={i} style={{ background: "#1e293b", borderRadius: "8px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "12px", borderLeft: `3px solid ${p.color}` }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "#B4B2A9" }}>{p.from}</span>
              <span style={{ fontSize: "12px", color: "#5F5E5A", margin: "0 6px" }}>→ via {p.via} →</span>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "#B4B2A9" }}>{p.to}</span>
            </div>
            <div style={{ flexShrink: 0, fontSize: "12px", fontWeight: 500, color: p.color, background: "#0f172a", borderRadius: "6px", padding: "3px 10px" }}>
              {p.bw}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "12px", padding: "10px 14px", background: "#1e293b", borderRadius: "8px", fontSize: "12px", color: "#5F5E5A", borderLeft: `2px solid ${mode === "sxm" ? "#1D9E75" : "#D85A30"}` }}>
        {mode === "sxm"
          ? "SXM: NVLink handles all GPU-to-GPU traffic. PCIe carries only CPU control traffic and BlueField-3 DPU storage operations — neither on the training critical path."
          : "PCIe: all GPU-to-GPU and NIC-to-GPU traffic shares the same PCIe bus. Effective training bandwidth is 28× lower than SXM for intra-node communication."}
      </div>
    </div>
  )
}

export default GPUFormFactorViz

"use client"
import { useState } from "react"

// ── GH200ArchViz ─────────────────────────
// Compares conventional DGX H100 CPU-GPU architecture
// vs GH200 Grace Hopper Superchip NVLink-C2C path.
// All colors use hardcoded hex — c-* classes not available in Next.js app context.

type View = "dgx" | "gh200"

export function GH200ArchViz() {
  const [view, setView] = useState<View>("dgx")

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">GH200 Grace Hopper Superchip architecture</div>
      <div className="mb-4 text-xs text-slate-600">Compare conventional DGX H100 CPU-GPU interconnect vs GH200 NVLink-C2C die-to-die path</div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {(["dgx", "gh200"] as View[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: "6px 18px",
              borderRadius: "8px",
              border: `1px solid ${view === v ? (v === "dgx" ? "#185FA5" : "#EF9F27") : "#444441"}`,
              background: view === v ? (v === "dgx" ? "#0C447C" : "#633806") : "transparent",
              color: view === v ? (v === "dgx" ? "#B5D4F4" : "#FAC775") : "#888780",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            {v === "dgx" ? "DGX H100 (conventional)" : "GH200 Grace Hopper"}
          </button>
        ))}
      </div>

      {view === "dgx" && (
        <>
          <svg width="100%" viewBox="0 0 680 300" style={{ display: "block", marginBottom: "16px" }}>
            <defs>
              <marker id="ga-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M2 1L8 5L2 9" fill="none" stroke="#185FA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </marker>
              <marker id="ga-purple" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M2 1L8 5L2 9" fill="none" stroke="#534AB7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </marker>
              <marker id="ga-teal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M2 1L8 5L2 9" fill="none" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </marker>
            </defs>

            {/* CPU */}
            <rect x="20" y="30" width="180" height="70" rx="10" fill="#E6F1FB" stroke="#185FA5" strokeWidth="1" />
            <text x="110" y="61" textAnchor="middle" fontSize="13" fontWeight="500" fill="#0C447C">Intel Xeon CPU</text>
            <text x="110" y="81" textAnchor="middle" fontSize="11" fill="#185FA5">2 TB DDR5 DRAM</text>

            {/* PCIe */}
            <rect x="240" y="30" width="150" height="70" rx="10" fill="#F1EFE8" stroke="#5F5E5A" strokeWidth="1" />
            <text x="315" y="61" textAnchor="middle" fontSize="13" fontWeight="500" fill="#444441">PCIe Gen 5</text>
            <text x="315" y="81" textAnchor="middle" fontSize="11" fill="#5F5E5A">63 GB/s ceiling</text>

            {/* GPUs */}
            <rect x="430" y="30" width="230" height="70" rx="10" fill="#EEEDFE" stroke="#534AB7" strokeWidth="1" />
            <text x="545" y="61" textAnchor="middle" fontSize="13" fontWeight="500" fill="#3C3489">8× H100 SXM5 GPUs</text>
            <text x="545" y="81" textAnchor="middle" fontSize="11" fill="#534AB7">8× 80 GB HBM3 = 640 GB</text>

            {/* Arrows */}
            <line x1="200" y1="65" x2="238" y2="65" stroke="#185FA5" strokeWidth="1.5" markerEnd="url(#ga-blue)" />
            <line x1="390" y1="65" x2="428" y2="65" stroke="#534AB7" strokeWidth="1.5" markerEnd="url(#ga-purple)" />

            {/* NVSwitch */}
            <rect x="430" y="210" width="230" height="55" rx="8" fill="#E1F5EE" stroke="#0F6E56" strokeWidth="1" />
            <text x="545" y="235" textAnchor="middle" fontSize="13" fontWeight="500" fill="#085041">NVSwitch (onboard)</text>
            <text x="545" y="253" textAnchor="middle" fontSize="11" fill="#0F6E56">13.6 Tb/s all-to-all</text>

            {/* NVLink dashed line */}
            <line x1="545" y1="100" x2="545" y2="208" stroke="#1D9E75" strokeWidth="1.5" strokeDasharray="5 3" markerEnd="url(#ga-teal)" />

            {/* Annotations */}
            <text x="340" y="148" textAnchor="middle" fontSize="11" fill="#888780">CPU ↔ GPU: PCIe Gen 5 = 63 GB/s bidirectional</text>
            <text x="340" y="166" textAnchor="middle" fontSize="11" fill="#888780">cudaMemcpy required for host-device transfers</text>
            <text x="340" y="184" textAnchor="middle" fontSize="11" fill="#888780">GPU-GPU: NVLink 4 @ 900 GB/s (bypasses CPU)</text>
          </svg>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            {[
              { label: "CPU→GPU bandwidth", value: "63 GB/s", note: "PCIe Gen 5 ceiling", color: "#F0997B" },
              { label: "GPU→GPU bandwidth", value: "900 GB/s", note: "NVLink 4 (bypasses CPU)", color: "#9FE1CB" },
              { label: "Memory visibility", value: "Separate", note: "cudaMemcpy required", color: "#CECBF6" },
            ].map(({ label, value, note, color }) => (
              <div key={label} style={{ background: "#1e293b", borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ fontSize: "11px", color: "#5F5E5A", marginBottom: "3px" }}>{label}</div>
                <div style={{ fontSize: "16px", fontWeight: 500, color }}>{value}</div>
                <div style={{ fontSize: "11px", color: "#5F5E5A", marginTop: "2px" }}>{note}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {view === "gh200" && (
        <>
          <svg width="100%" viewBox="0 0 680 300" style={{ display: "block", marginBottom: "16px" }}>
            <defs>
              <marker id="gb-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M2 1L8 5L2 9" fill="none" stroke="#EF9F27" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </marker>
            </defs>

            {/* Outer superchip container */}
            <rect x="20" y="20" width="640" height="140" rx="14" fill="#FAEEDA" stroke="#854F0B" strokeWidth="1" />
            <text x="340" y="44" textAnchor="middle" fontSize="13" fontWeight="500" fill="#633806">GH200 Superchip (single package)</text>

            {/* Grace CPU */}
            <rect x="50" y="58" width="220" height="80" rx="8" fill="#E6F1FB" stroke="#185FA5" strokeWidth="1" />
            <text x="160" y="94" textAnchor="middle" fontSize="13" fontWeight="500" fill="#0C447C">Grace CPU (ARM)</text>
            <text x="160" y="114" textAnchor="middle" fontSize="11" fill="#185FA5">480 GB LPDDR5X @ 500 GB/s</text>

            {/* H100 GPU */}
            <rect x="410" y="58" width="220" height="80" rx="8" fill="#EEEDFE" stroke="#534AB7" strokeWidth="1" />
            <text x="520" y="94" textAnchor="middle" fontSize="13" fontWeight="500" fill="#3C3489">H100 GPU</text>
            <text x="520" y="114" textAnchor="middle" fontSize="11" fill="#534AB7">96 GB HBM3 (coherent)</text>

            {/* NVLink-C2C arrows (bidirectional) */}
            <line x1="270" y1="92" x2="408" y2="92" stroke="#EF9F27" strokeWidth="3" markerEnd="url(#gb-amber)" />
            <line x1="408" y1="108" x2="270" y2="108" stroke="#EF9F27" strokeWidth="3" markerEnd="url(#gb-amber)" />
            <text x="339" y="84" textAnchor="middle" fontSize="12" fontWeight="500" fill="#BA7517">NVLink-C2C</text>
            <text x="339" y="122" textAnchor="middle" fontSize="11" fill="#854F0B">900 GB/s</text>

            {/* Annotations */}
            <text x="340" y="192" textAnchor="middle" fontSize="11" fill="#888780">Coherent unified memory: CPU reads GPU HBM directly. No cudaMemcpy needed.</text>
            <text x="340" y="212" textAnchor="middle" fontSize="11" fill="#888780">Combined address space: 480 GB LPDDR5X + 96 GB HBM3 ≈ 576 GB</text>
            <text x="340" y="232" textAnchor="middle" fontSize="11" fill="#888780">DGX GH200: 256 superchips, NVLink Switch fabric, 144 TB total memory</text>
          </svg>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            {[
              { label: "CPU→GPU bandwidth", value: "900 GB/s", note: "NVLink-C2C (coherent)", color: "#9FE1CB" },
              { label: "Addressable memory", value: "~576 GB", note: "Unified CPU+GPU space", color: "#FAC775" },
              { label: "cudaMemcpy needed", value: "No", note: "Direct coherent access", color: "#9FE1CB" },
            ].map(({ label, value, note, color }) => (
              <div key={label} style={{ background: "#1e293b", borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ fontSize: "11px", color: "#5F5E5A", marginBottom: "3px" }}>{label}</div>
                <div style={{ fontSize: "16px", fontWeight: 500, color }}>{value}</div>
                <div style={{ fontSize: "11px", color: "#5F5E5A", marginTop: "2px" }}>{note}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ marginTop: "12px", padding: "10px 14px", background: "#1e293b", borderRadius: "8px", fontSize: "12px", color: "#5F5E5A", borderLeft: `2px solid ${view === "dgx" ? "#185FA5" : "#EF9F27"}` }}>
        {view === "dgx"
          ? "DGX H100: PCIe Gen 5 connects CPU to GPUs. GPU-GPU traffic bypasses CPU via NVLink. Scale-out training is unaffected by CPU-GPU PCIe bandwidth."
          : "GH200: NVLink-C2C replaces PCIe for CPU-GPU traffic. Coherent memory eliminates explicit copies. Target use: large inference, recommendation systems, models > HBM capacity."}
      </div>
    </div>
  )
}

export default GH200ArchViz

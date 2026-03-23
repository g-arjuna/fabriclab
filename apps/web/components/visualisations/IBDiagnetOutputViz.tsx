"use client"
import { useState } from "react"

// IBDiagnetOutputViz
type DiagSection = "discovery" | "speed" | "errors" | "performance" | "summary"

const sections: { id: DiagSection; label: string; badge?: string }[] = [
  { id: "discovery", label: "Discovery" },
  { id: "speed", label: "Speed check", badge: "1 warn" },
  { id: "errors", label: "Error counters", badge: "1 error" },
  { id: "performance", label: "Performance", badge: "1 warn" },
  { id: "summary", label: "Summary" },
]

const sectionContent: Record<DiagSection, { output: string; explanation: string; action: string }> = {
  discovery: {
    output: `-I- Discovering the subnet ...
-I- Loaded fabric:
      32 switches (8 leaf QM9700 + 4 spine Q3400)
      256 nodes (32 DGX × 8 NICs)
      512 IB ports
      
-I- LID uniqueness check: PASS
-I- Path record completeness: PASS  
-I- SM routing consistency: PASS
-I- DISCOVERY: OK`,
    explanation: "ibdiagnet successfully discovered the full fabric. 32 switches, 256 HCAs (8 ConnectX-7 per DGX × 32 DGX nodes). LID uniqueness means every port has a unique LID with no duplicates. Path record completeness means the SM has computed and stored path records for all port pairs. Routing consistency means switch forwarding tables match SM's computed routes.",
    action: "No action needed for this section.",
  },
  speed: {
    output: `-I- ------------ Link Speed Check ---------------
-W- Link Speed Degraded:
    Switch:    QM9700-1 port 3
    Connected: DGX-node-07 mlx5_2 (Rail 2)
    Expected:  NDR (400 Gb/s, 4x)
    Actual:    HDR (200 Gb/s, 4x)
    
    CAUSE: Cable does not meet NDR specification.
    NDR requires 50Gb/s per lane (AWG28 or AOC).
    The installed cable is rated for HDR only.
    
-I- All other 511 links: NDR ✓`,
    explanation: "One link negotiated down from NDR (400G) to HDR (200G). The GPU Rail 2 NIC on DGX-node-07 is running at half bandwidth because the cable between this NIC and leaf switch QM9700-1/port3 does not meet NDR specifications. This is a common issue after cable replacement — HDR cables look identical to NDR cables visually.",
    action: "Replace the cable between QM9700-1/port3 and DGX-node-07's mlx5_2 NIC with an NDR-certified cable. After replacement, ibdiagnet should show NDR on this link.",
  },
  errors: {
    output: `-I- ------------------- Errors -------------------
-E- High Symbol Error Rate:
    Switch:    QM9700-2 port 7
    Connected: DGX-node-12 mlx5_7 (Rail 7)
    SymbolErrors:   14,827
    Threshold:      100
    Delta (1hr):    8,293  ← ACTIVELY GROWING
    
    RECOMMENDATION: Replace transceiver or cable.
    This port will likely progress to link flapping.
    
-W- Non-zero XmtDiscards:
    Switch:    QM9700-5 port 12
    Connected: DGX-node-03 mlx5_4 (Rail 4)
    XmtDiscards: 47
    
    RECOMMENDATION: Check routing on paths through
    this port. Possible routing loop.`,
    explanation: "Two problems identified. First: QM9700-2/port7 is actively accumulating symbol errors at 8,293/hour — this port is failing and will progress to link flapping within hours or days. Second: QM9700-5/port12 has non-zero transmit discards, which in InfiniBand's credit-based system should never occur — this indicates a routing or credit flow problem.",
    action: "Immediate: Schedule maintenance to replace transceiver on QM9700-2/port7. Run show interface ib 1/7 on that switch to confirm. For XmtDiscards: run ibdiagnet with --vlq flag to check VL credit configuration, and review UFM event log for SM routing events.",
  },
  performance: {
    output: `-I- -------------- Performance Summary -----------
-I- Measurement interval: 30 seconds
-I- Average link utilisation:  34.2%
-I- Median link utilisation:   31.8%
-I- Peak utilisation port:     QM9700-3/1 (87.3%)
-I- Peak connected to:         DGX-node-14 Rail-0
    
-I- Top 5 busiest ports:
    QM9700-3/1:   87.3%  (DGX-node-14 Rail-0)
    QM9700-3/2:   84.1%  (DGX-node-15 Rail-0)
    QM9700-3/3:   81.7%  (DGX-node-16 Rail-0)
    QM9700-3/4:   79.3%  (DGX-node-17 Rail-0)
    QM9700-7/9:    4.2%  (DGX-node-08 Rail-1)
    
-W- Traffic distribution imbalance detected:
    Some Rail-0 ports at 80%+ while Rail-1 ports below 10%.
    Possible cause: Non-optimal job placement or failed links
    forcing traffic concentration.`,
    explanation: "Average utilisation is 34.2% but some ports are running at 87% while others are at 4%. This imbalance suggests traffic is not distributed evenly across the fabric. In a correctly functioning fat-tree with FTREE routing, utilisation should be more uniform. The concentration on QM9700-3 (multiple Rail-0 ports) and the near-zero utilisation on Rail-1 ports is suspicious.",
    action: "Check if there are failed Rail-1 links forcing the SM to route Rail-1 AllReduce traffic over Rail-0 paths. Run 'show interfaces ib status' on the switches and look for Rail-1 ports in Down or Polling state. Also check if job placement is pinning multiple jobs to the same node group.",
  },
  summary: {
    output: `-I- -------------- Summary ----------------------
-I- Total run time: 4 minutes 37 seconds
-I- Fabric size: 32 switches, 256 nodes, 512 ports

PASS:
  ✓ Discovery and topology consistency
  ✓ LID uniqueness (no conflicts)
  ✓ Path record completeness
  ✓ SM routing table consistency
  ✓ 511/512 links at expected speed

WARNINGS (2):
  ⚠ 1 link speed degraded (QM9700-1/3 → HDR instead of NDR)
  ⚠ Traffic distribution imbalance detected

ERRORS (1):
  ✗ High symbol error rate: QM9700-2/7 (REPLACE HARDWARE)

RECOMMENDATION:
  1. Replace transceiver/cable QM9700-2/7 immediately
  2. Replace cable QM9700-1/3 during next maintenance
  3. Investigate traffic imbalance on Rail-0 vs Rail-1
  
  Training jobs can continue but QM9700-2/7 WILL fail.`,
    explanation: "ibdiagnet's summary gives you a prioritised action list. One critical issue (actively failing hardware), two warnings (deferred maintenance). The summary is designed to be actionable: it tells you what to do now vs what can wait.",
    action: "Act on items in order of severity. The ERROR (symbol errors) will become a link failure within days. The WARNINGS can be addressed in the next maintenance window.",
  },
}

export function IBDiagnetOutputViz() {
  const [section, setSection] = useState<DiagSection>("errors")

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">ibdiagnet output — explore each section</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className="rounded-lg px-3 py-1.5 text-xs transition-all flex items-center gap-2"
            style={{
              backgroundColor: section === s.id ? "#1e3a5f" : "#0f172a",
              border: `1px solid ${section === s.id ? "#60a5fa" : "#1e293b"}`,
              color: section === s.id ? "#bfdbfe" : "#64748b",
            }}>
            {s.label}
            {s.badge && (
              <span className="rounded-full px-1.5 py-0.5 text-[8px]"
                style={{ backgroundColor: s.badge.includes("error") ? "#7f1d1d" : "#78350f", color: s.badge.includes("error") ? "#fca5a5" : "#fde68a" }}>
                {s.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <pre className="rounded-xl bg-[#0a0f1a] border border-white/10 p-4 font-mono text-[10px] leading-6 text-slate-300 mb-4 overflow-x-auto whitespace-pre-wrap">{sectionContent[section].output}</pre>
      <div className="space-y-2 text-xs">
        <div className="rounded-xl bg-slate-800/50 p-3"><span className="font-semibold text-white">What this means: </span><span className="text-slate-300">{sectionContent[section].explanation}</span></div>
        <div className="rounded-xl bg-slate-800/50 p-3"><span className="font-semibold text-cyan-400">Action: </span><span className="text-slate-300">{sectionContent[section].action}</span></div>
      </div>
    </div>
  )
}
export default IBDiagnetOutputViz

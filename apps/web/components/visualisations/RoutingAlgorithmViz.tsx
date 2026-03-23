"use client"
import { useState } from "react"

// RoutingAlgorithmViz
type Algorithm = "FTREE" | "MINHOP" | "SSSP" | "DFSSSP"

const algorithms: { id: Algorithm; label: string; best_for: string; color: string }[] = [
  { id: "FTREE", label: "FTREE", best_for: "Fat-tree (DGX SuperPOD)", color: "#14532d" },
  { id: "MINHOP", label: "MINHOP", best_for: "General topologies", color: "#1e3a5f" },
  { id: "SSSP", label: "SSSP", best_for: "Irregular/partial topologies", color: "#065f46" },
  { id: "DFSSSP", label: "DFSSSP", best_for: "Reproducible benchmarking", color: "#4c1d95" },
]

const algorithmDetails: Record<Algorithm, {
  fullName: string
  how: string
  pros: string[]
  cons: string[]
  when: string
}> = {
  FTREE: {
    fullName: "Fat Tree routing",
    how: "Routes traffic along the canonical up-down paths in a fat-tree topology. Up-paths go from edge to spine, down-paths go from spine to edge. Traffic is distributed across equal-cost paths at each level.",
    pros: ["Optimal for perfectly symmetrical fat-tree topologies", "Maximises bisection bandwidth", "Selected automatically by UFM when fat-tree is detected", "AllReduce traffic stays within single rails"],
    cons: ["Requires a perfectly balanced fat-tree — missing links or asymmetric connections degrade performance", "Not suitable for irregular topologies"],
    when: "Use for any DGX BasePOD or SuperPOD deployment. This is the correct default.",
  },
  MINHOP: {
    fullName: "Minimum Hop routing",
    how: "Routes each source-destination pair via the path with the fewest hops. Distributes equal-hop-count paths across multiple options.",
    pros: ["Works on any topology", "Simple and predictable", "Good for regular topologies"],
    cons: ["Does not specifically optimise for fat-tree bisection bandwidth", "May concentrate traffic on high-degree nodes"],
    when: "Use as a fallback if FTREE is not detecting the topology correctly, or for non-fat-tree deployments.",
  },
  SSSP: {
    fullName: "Shortest Shortest Path",
    how: "Distributes traffic across all equal-cost shortest paths simultaneously. Better load balancing than MINHOP for cases where multiple equal-length paths exist.",
    pros: ["Better load balancing than MINHOP", "Handles topology asymmetry better", "Good for clusters with some failed links where FTREE would degrade"],
    cons: ["Can produce non-deterministic routing tables (different SM restarts may produce different routes)", "Not optimal for perfectly symmetric fat-tree"],
    when: "Use when the fabric has sustained link failures and FTREE performance has degraded.",
  },
  DFSSSP: {
    fullName: "Deterministic Fat-tree SSSP",
    how: "Like SSSP but deterministic — the same topology input always produces the same routing table output. Achieves this by using a canonical ordering of paths.",
    pros: ["Deterministic — routing tables are identical after every SM restart", "Enables reproducible performance benchmarking", "Good load balancing"],
    cons: ["Slower to compute than MINHOP for very large fabrics", "More complex to reason about than FTREE"],
    when: "Use when reproducible benchmark results are important. Also good for fabrics with occasional topology changes.",
  },
}

export function RoutingAlgorithmViz() {
  const [algo, setAlgo] = useState<Algorithm>("FTREE")
  const detail = algorithmDetails[algo]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">SM routing algorithms — what each does</p>
      <div className="flex flex-wrap gap-2 mb-5">
        {algorithms.map(a => (
          <button key={a.id} onClick={() => setAlgo(a.id)}
            className="rounded-xl px-3 py-2 text-xs transition-all text-left"
            style={{
              backgroundColor: algo === a.id ? a.color : "#0f172a",
              border: `1px solid ${algo === a.id ? a.color : "#1e293b"}`,
              color: algo === a.id ? "#fff" : "#64748b",
            }}>
            <div className="font-mono font-bold">{a.label}</div>
            <div className="text-[9px] opacity-70 mt-0.5">{a.best_for}</div>
          </button>
        ))}
      </div>
      <div className="space-y-3 text-xs">
        <div className="rounded-xl bg-slate-800/50 p-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{detail.fullName}</div>
          <p className="text-slate-300 leading-6">{detail.how}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-3">
            <div className="text-[10px] uppercase tracking-widest text-green-500 mb-2">Pros</div>
            <ul className="space-y-1">{detail.pros.map((p, i) => <li key={i} className="text-slate-300 flex gap-2"><span className="text-green-400">+</span>{p}</li>)}</ul>
          </div>
          <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-3">
            <div className="text-[10px] uppercase tracking-widest text-red-400 mb-2">Cons</div>
            <ul className="space-y-1">{detail.cons.map((c, i) => <li key={i} className="text-slate-300 flex gap-2"><span className="text-red-400">−</span>{c}</li>)}</ul>
          </div>
        </div>
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
          <span className="font-semibold text-cyan-400">When to use: </span><span className="text-slate-300">{detail.when}</span>
        </div>
      </div>
    </div>
  )
}
export default RoutingAlgorithmViz

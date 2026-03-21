"use client";

import { useLabStore } from "@/store/labStore";

export function TopologyView() {
  const nicState = useLabStore((state) => state.topology.nic.state);
  const isUp = nicState === "up";
  const lineClass = isUp ? "stroke-[#38bdf8]" : "stroke-[#f87171]";
  const dashArray = isUp ? undefined : "8 8";

  return (
    <section className="flex h-full flex-col rounded-3xl border border-white/10 bg-slate-950/80 p-6 text-slate-100 shadow-2xl shadow-slate-950/30 backdrop-blur">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Topology</p>
      <div className="mt-4 flex flex-1 items-center justify-center rounded-[2rem] border border-white/8 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_45%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.95))] p-4">
        <svg viewBox="0 0 360 520" className="h-full max-h-[520px] w-full max-w-[360px]">
          <rect x="80" y="40" width="200" height="60" rx="22" fill="#2563eb" />
          <circle
            cx="248"
            cy="70"
            r="8"
            fill={isUp ? "#22c55e" : "none"}
            stroke="#ef4444"
            strokeWidth="2"
          />
          <text x="105" y="65" fill="#eff6ff" fontSize="18" fontWeight="600">
            DGX H100 Node A
          </text>
          <text x="105" y="87" fill="#dbeafe" fontSize="13">
            eth0 . 400G
          </text>

          <line
            x1="180"
            y1="100"
            x2="180"
            y2="205"
            strokeWidth="6"
            className={lineClass}
            strokeDasharray={dashArray}
          />

          <rect x="80" y="205" width="200" height="50" rx="18" fill="#4338ca" />
          <text x="103" y="235" fill="#eef2ff" fontSize="17" fontWeight="600">
            Spectrum-X SN5600
          </text>

          <line
            x1="180"
            y1="255"
            x2="180"
            y2="420"
            strokeWidth="6"
            className={lineClass}
            strokeDasharray={dashArray}
          />

          <rect x="80" y="420" width="200" height="60" rx="22" fill="#2563eb" />
          <circle
            cx="248"
            cy="450"
            r="8"
            fill={isUp ? "#22c55e" : "none"}
            stroke="#ef4444"
            strokeWidth="2"
          />
          <text x="105" y="445" fill="#eff6ff" fontSize="18" fontWeight="600">
            DGX H100 Node B
          </text>
          <text x="105" y="467" fill="#dbeafe" fontSize="13">
            eth0 . 400G
          </text>
        </svg>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-300">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          <span>Filled green circle = Active</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full border border-red-400" />
          <span>Unfilled red circle = Down</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-6 bg-sky-400" />
          <span>Solid line = 400G link</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-6 border-t-2 border-dashed border-red-400" />
          <span>Dashed line = degraded</span>
        </div>
      </div>
    </section>
  );
}

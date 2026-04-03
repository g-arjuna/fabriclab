"use client";

import type { RailState } from "@/types";
import { useLabStore } from "@/store/labStore";

function handleDeviceClick(deviceId: string) {
  window.dispatchEvent(
    new CustomEvent("device-selected", { detail: { deviceId } }),
  );
}

export function TopologyView({ compact = false }: { compact?: boolean }) {
  const labId = useLabStore((state) => state.lab.labId);
  const nicState = useLabStore((state) => state.topology.nic.state);
  const rails = useLabStore((state) => state.topology.rails);
  const unevenSpine = useLabStore((state) => state.topology.unevenSpine ?? false);

  const diagram = (() => {
    if (labId === "lab0a-fabric-cli-orientation") {
      return <OrientationTopologyDiagram compact={compact} />;
    }

    if (labId === "lab0b-roce-counter-reading") {
      return <CounterPrimerTopologyDiagram compact={compact} />;
    }

    if (labId === "lab0-failed-rail" && rails && rails.length > 0) {
      return <RailTopologyDiagram rails={rails} compact={compact} />;
    }

    if (labId === "lab3-uneven-spine" || labId === "lab5-nccl-diagnosis") {
      return <SpineLoadBalancingDiagram unevenSpine={unevenSpine} labId={labId} compact={compact} />;
    }

    if (labId === "lab4-topology-sizing") {
      return <ProposalComparisonDiagram compact={compact} />;
    }

    return <GenericTopologyDiagram nicState={nicState} compact={compact} />;
  })();

  return (
    <div
      className={compact ? "h-full select-none" : "h-full"}
      style={compact ? { pointerEvents: "none" } : undefined}
    >
      {diagram}
    </div>
  );
}

function ProposalComparisonDiagram({ compact = false }: { compact?: boolean }) {
  return (
    <section className="flex h-full flex-col rounded-3xl border border-white/10 bg-slate-950/80 p-3 text-slate-100 shadow-2xl shadow-slate-950/30 backdrop-blur">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Topology</p>
      <p className="mt-1 text-xs text-slate-600">{"Design evaluation \u2014 64-node DGX H100 cluster"}</p>

      <div className="mt-2 grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto">
        <div className="flex flex-col gap-2 rounded-2xl border border-green-500/20 bg-green-500/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-green-400">Proposal A</span>
            <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-semibold text-green-300">
              32-port
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Spine - 16 switches</p>
            <div className="flex flex-wrap gap-1">
              {["SP-01", "SP-02", "SP-03", "···"].map((switchId) => (
                <div
                  key={switchId}
                  className="rounded border border-green-700/50 bg-green-900/40 px-2 py-1 font-mono text-[10px] text-green-300"
                >
                  {switchId}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <div className="h-4 w-px bg-green-700/40" />
          </div>

          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Leaf - 32 switches</p>
            <div className="flex flex-wrap gap-1">
              {["L-00", "L-01", "L-02", "L-03", "···"].map((leafId) => (
                <div
                  key={leafId}
                  className="rounded border border-blue-700/50 bg-blue-900/40 px-2 py-1 font-mono text-[10px] text-blue-300"
                >
                  {leafId}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <div className="h-4 w-px bg-green-700/40" />
          </div>

          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">DGX nodes</p>
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-center">
              <p className="text-sm font-bold text-blue-300">64 DGX H100 nodes ✓</p>
              <p className="text-[10px] text-slate-500">512 NIC connections</p>
            </div>
          </div>

          <div className="mt-auto space-y-0.5 rounded-lg bg-slate-900/80 p-2">
            <p className="text-[10px] font-mono text-slate-400">{"32 leaf \u00D7 16 down = 512 ports"}</p>
            <p className="text-[10px] font-mono text-slate-400">{"512 \u00F7 8 NICs = 64 nodes"}</p>
            <p className="text-[10px] font-bold text-green-400">{"Ratio: 1:1 non-blocking \u2713"}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-red-400">Proposal B</span>
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-300">
              64-port
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Spine - 32 switches</p>
            <div className="flex flex-wrap gap-1">
              {["SP-01", "SP-02", "SP-03", "···"].map((switchId) => (
                <div
                  key={switchId}
                  className="rounded border border-red-700/50 bg-red-900/40 px-2 py-1 font-mono text-[10px] text-red-300"
                >
                  {switchId}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <div className="h-4 w-px bg-red-700/40" />
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400">
              Leaf - only 8 switches ✗
            </p>
            <div className="flex flex-wrap gap-1">
              {["L-00", "L-01", "···"].map((leafId) => (
                <div
                  key={leafId}
                  className="rounded border border-red-700/50 bg-red-900/40 px-2 py-1 font-mono text-[10px] text-red-300"
                >
                  {leafId}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <div className="h-4 w-px bg-red-700/40" />
          </div>

          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">DGX nodes</p>
            <div className="grid grid-cols-2 gap-1">
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-2 text-center">
                <p className="text-sm font-bold text-red-300">32 nodes ✗</p>
                <p className="text-[10px] text-slate-500">connected</p>
              </div>
              <div className="rounded-lg border border-dashed border-slate-700/50 px-2 py-2 text-center">
                <p className="text-sm font-bold text-slate-600">32 nodes</p>
                <p className="text-[10px] text-slate-600">missing</p>
              </div>
            </div>
          </div>

          <div className="mt-auto space-y-0.5 rounded-lg bg-slate-900/80 p-2">
            <p className="text-[10px] font-mono text-slate-400">{"8 leaf \u00D7 32 down = 256 ports"}</p>
            <p className="text-[10px] font-mono text-slate-400">{"256 \u00F7 8 NICs = 32 nodes"}</p>
            <p className="text-[10px] font-bold text-red-400">Need 64 - capacity fail ✗</p>
          </div>
        </div>
      </div>

      {!compact ? (
        <p className="mt-3 text-center text-[10px] text-slate-600">
          {"show proposal a/b \u00B7 calculate oversubscription a/b \u00B7 recommend proposal a/b"}
        </p>
      ) : null}
    </section>
  );
}

function GenericTopologyDiagram({
  nicState,
  compact = false,
}: {
  nicState: "up" | "down";
  compact?: boolean;
}) {
  const isUp = nicState === "up";
  const lineClass = isUp ? "stroke-[#38bdf8]" : "stroke-[#f87171]";
  const dashArray = isUp ? undefined : "8 8";

  return (
    <section className="flex h-full flex-col rounded-3xl border border-white/10 bg-slate-950/80 p-4 text-slate-100 shadow-2xl shadow-slate-950/30 backdrop-blur">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Topology</p>
      <div className="mt-3 flex flex-1 min-h-0 items-center justify-center rounded-2xl border border-white/8 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.08),_transparent_60%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.95))] p-3">
        <svg viewBox="0 0 360 360" width="100%" height="100%">
          <rect
            x="80"
            y="30"
            width="200"
            height="60"
            rx="22"
            fill="#2563eb"
            onClick={() => handleDeviceClick("dgx-node-a")}
            className="cursor-pointer transition-opacity hover:opacity-90"
          />
          <circle
            cx="248"
            cy="60"
            r="8"
            fill={isUp ? "#22c55e" : "none"}
            stroke="#ef4444"
            strokeWidth="2"
          />
          <text x="105" y="55" fill="#eff6ff" fontSize="18" fontWeight="600">
            DGX H100 Node A
          </text>
          <text x="105" y="77" fill="#dbeafe" fontSize="13">
            {"eth0 \u00B7 400G"}
          </text>

          <line
            x1="180"
            y1="90"
            x2="180"
            y2="160"
            strokeWidth="6"
            className={lineClass}
            strokeDasharray={dashArray}
          />

          <rect
            x="80"
            y="160"
            width="200"
            height="50"
            rx="18"
            fill="#4338ca"
            onClick={() => handleDeviceClick("spectrum-sw")}
            className="cursor-pointer transition-opacity hover:opacity-90"
          />
          <text x="103" y="190" fill="#eef2ff" fontSize="17" fontWeight="600">
            Spectrum-X SN5600
          </text>

          <line
            x1="180"
            y1="210"
            x2="180"
            y2="280"
            strokeWidth="6"
            className={lineClass}
            strokeDasharray={dashArray}
          />

          <rect
            x="80"
            y="280"
            width="200"
            height="60"
            rx="22"
            fill="#2563eb"
            onClick={() => handleDeviceClick("dgx-node-b")}
            className="cursor-pointer transition-opacity hover:opacity-90"
          />
          <circle
            cx="248"
            cy="310"
            r="8"
            fill={isUp ? "#22c55e" : "none"}
            stroke="#ef4444"
            strokeWidth="2"
          />
          <text x="105" y="305" fill="#eff6ff" fontSize="18" fontWeight="600">
            DGX H100 Node B
          </text>
          <text x="105" y="327" fill="#dbeafe" fontSize="13">
            {"eth0 \u00B7 400G"}
          </text>
        </svg>
      </div>

      {!compact ? (
        <>
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
          <p className="mt-4 text-center text-xs text-slate-500">
            Click a device node to open its terminal session
          </p>
        </>
      ) : null}
    </section>
  );
}

function SpineLoadBalancingDiagram({
  unevenSpine,
  labId,
  compact = false,
}: {
  unevenSpine: boolean;
  labId: string | null;
  compact?: boolean;
}) {
  const spineColor = unevenSpine ? "#f59e0b" : "#22c55e";
  const statusText = unevenSpine ? "Uneven spine utilisation" : "Balanced across spine links";
  const focusTitle = labId === "lab5-nccl-diagnosis" ? "Lab focus" : "Lab 3 focus";
  const focusText = labId === "lab5-nccl-diagnosis"
    ? "Validate the fabric is healthy, then diagnose the NCCL transport and environment variable mismatch from the DGX."
    : "Compare leaf and spine counters, then enable per-packet load balancing on the leaf.";

  return (
    <section className="flex h-full flex-col rounded-3xl border border-white/10 bg-slate-950/80 p-4 text-slate-100 shadow-2xl shadow-slate-950/30 backdrop-blur">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Topology</p>
      <div className="mt-3 flex flex-1 min-h-0 items-center justify-center rounded-2xl border border-white/8 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.08),_transparent_60%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.95))] p-3">
        <svg viewBox="0 0 420 300" width="100%" height="100%">
          <rect
            x="110"
            y="20"
            width="200"
            height="58"
            rx="20"
            fill="#2563eb"
            onClick={() => handleDeviceClick("dgx-node-a")}
            className="cursor-pointer transition-opacity hover:opacity-90"
          />
          <text x="140" y="53" fill="#eff6ff" fontSize="18" fontWeight="600">
            DGX H100 Node A
          </text>
          <text x="140" y="72" fill="#dbeafe" fontSize="12">
            {"eth0 \u00B7 400G RoCEv2"}
          </text>

          <line x1="210" y1="78" x2="210" y2="130" stroke="#38bdf8" strokeWidth="6" />

          <rect
            x="110"
            y="130"
            width="200"
            height="54"
            rx="18"
            fill="#4338ca"
            onClick={() => handleDeviceClick("leaf-sw")}
            className="cursor-pointer transition-opacity hover:opacity-90"
          />
          <text x="175" y="160" fill="#eef2ff" fontSize="17" fontWeight="600">
            Leaf Switch
          </text>
          <text x="148" y="176" fill="#c7d2fe" fontSize="11">
            {"SN5600 \u00B7 Cumulus Linux"}
          </text>

          <line x1="210" y1="184" x2="210" y2="220" stroke={spineColor} strokeWidth="6" />

          <rect
            x="110"
            y="220"
            width="200"
            height="58"
            rx="20"
            fill="#0f766e"
            onClick={() => handleDeviceClick("spine-sw")}
            className="cursor-pointer transition-opacity hover:opacity-90"
          />
          <text x="168" y="252" fill="#ecfeff" fontSize="18" fontWeight="600">
            Spine Switch
          </text>
          <text x="145" y="271" fill="#ccfbf1" fontSize="12">
            {statusText}
          </text>
        </svg>
      </div>

      {!compact ? (
        <div className="flex-shrink-0">
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/8 bg-slate-900/70 p-3">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{focusTitle}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {focusText}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-slate-900/70 p-3">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Current spine state</p>
              <p className="mt-2 text-sm leading-6" style={{ color: spineColor }}>
                {statusText}
              </p>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">
            Click the DGX, leaf, or spine device to open its terminal session
          </p>
        </div>
      ) : (
        <div className="mt-2 flex-shrink-0 text-center text-[10px]" style={{ color: spineColor }}>
          {statusText}
        </div>
      )}
    </section>
  );
}

function RailTopologyDiagram({ rails, compact = false }: { rails: RailState[]; compact?: boolean }) {
  const svgWidth = 560;
  const svgHeight = 320;
  const railColors = {
    up: "#22c55e",
    "error-disabled": "#ef4444",
    down: "#ef4444",
    "admin-down": "#f59e0b",
  } as const;

  return (
    <section className="flex h-full flex-col rounded-3xl border border-white/10 bg-slate-950/80 p-4 text-slate-100 shadow-2xl shadow-slate-950/30 backdrop-blur">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Rail topology - DGX H100</p>

      <div className="mt-3 flex flex-1 min-h-0 items-center justify-center rounded-2xl border border-white/8 bg-slate-900/40 p-3">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="100%">
          <rect
            x="80"
            y="10"
            width="400"
            height="40"
            rx="8"
            fill="#1e3a5f"
            stroke="#3b82f6"
            strokeWidth="1.5"
            onClick={() => handleDeviceClick("dgx-node-a")}
            className="cursor-pointer transition-opacity hover:opacity-90"
          />
          <text x="280" y="35" textAnchor="middle" fill="#93c5fd" fontSize="12" fontWeight="600">
            DGX H100 Node
          </text>

          {rails.map((rail, index) => {
            const nicX = 30 + index * (svgWidth / 9);
            const switchX = 30 + index * (svgWidth / 9);
            const switchColor = railColors[rail.switchPort] ?? "#22c55e";
            const lineColor = rail.switchPort === "up" ? "#22c55e" : "#ef4444";
            const isDegraded = rail.switchPort !== "up";

            return (
              <g key={rail.id}>
                <rect
                  x={nicX}
                  y={60}
                  width={48}
                  height={30}
                  rx="4"
                  fill="#1d4ed8"
                  stroke="#3b82f6"
                  strokeWidth="1"
                />
                <text
                  x={nicX + 24}
                  y={73}
                  textAnchor="middle"
                  fill="#bfdbfe"
                  fontSize="7"
                  fontWeight="600"
                >
                  CX-7
                </text>
                <text x={nicX + 24} y={83} textAnchor="middle" fill="#93c5fd" fontSize="6">
                  Rail {rail.id}
                </text>

                <line
                  x1={nicX + 24}
                  y1={90}
                  x2={switchX + 24}
                  y2={200}
                  stroke={lineColor}
                  strokeWidth={isDegraded ? 2 : 1.5}
                  strokeDasharray={isDegraded ? "4 3" : undefined}
                  opacity={0.8}
                />

                {rail.switchPort === "error-disabled" ? (
                  <circle
                    cx={switchX + 24}
                    cy={218}
                    r="30"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    className="pulse-ring"
                  />
                ) : null}
                <rect
                  x={switchX}
                  y={200}
                  width={48}
                  height={36}
                  rx="4"
                  fill={isDegraded ? "#450a0a" : "#14532d"}
                  stroke={switchColor}
                  strokeWidth={isDegraded ? 2 : 1}
                  onClick={() => handleDeviceClick(`leaf-rail${rail.id}`)}
                  className="cursor-pointer transition-opacity hover:opacity-90"
                />
                <text
                  x={switchX + 24}
                  y={213}
                  textAnchor="middle"
                  fill={switchColor}
                  fontSize="6"
                  fontWeight="700"
                >
                  Leaf {rail.id}
                </text>
                <text x={switchX + 24} y={223} textAnchor="middle" fill={switchColor} fontSize="5">
                  {rail.switchPort === "up" ? "UP" : "ERR"}
                </text>
                {isDegraded ? (
                  <text x={switchX + 24} y={232} textAnchor="middle" fill="#ef4444" fontSize="5">
                    DISABLED
                  </text>
                ) : null}
              </g>
            );
          })}

          <circle cx="90" cy="260" r="4" fill="#22c55e" />
          <text x="98" y="264" fill="#64748b" fontSize="8">
            Rail active
          </text>
          <circle cx="175" cy="260" r="4" fill="#ef4444" />
          <text x="183" y="264" fill="#64748b" fontSize="8">
            Error-disabled
          </text>
          <line
            x1="260"
            y1="260"
            x2="280"
            y2="260"
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          <text x="285" y="264" fill="#64748b" fontSize="8">
            Degraded link
          </text>
        </svg>
      </div>

      {!compact ? (
        <div className="flex-shrink-0">
          <div className="mt-3 grid grid-cols-4 gap-2 text-[10px]">
            {rails.map((rail) => {
              const isActive = rail.switchPort === "up";

              return (
                <div
                  key={rail.id}
                  className="rounded-lg px-2 py-1.5 text-center"
                  style={{
                    backgroundColor: isActive ? "#14532d33" : "#450a0a33",
                    border: `1px solid ${isActive ? "#22c55e44" : "#ef444444"}`,
                  }}
                >
                  <div style={{ color: isActive ? "#4ade80" : "#f87171" }}>Rail {rail.id}</div>
                  <div className="text-[9px] text-slate-600">
                    {isActive ? "OK" : "ERR-DISABLED"}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">
            Click the DGX host or a leaf switch to open its terminal session
          </p>
        </div>
      ) : null}
      <style jsx>{`
        .pulse-ring {
          animation: pulse-ring 1.5s ease-in-out infinite;
        }

        @keyframes pulse-ring {
          0% {
            opacity: 0.8;
          }
          50% {
            opacity: 0.2;
          }
          100% {
            opacity: 0.8;
          }
        }
      `}</style>
    </section>
  );
}

function OrientationTopologyDiagram({ compact = false }: { compact?: boolean }) {
  return (
    <section className="flex h-full flex-col rounded-3xl border border-white/10 bg-slate-950/80 p-4 text-slate-100 shadow-2xl shadow-slate-950/30 backdrop-blur">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
        Orientation topology - two DGX rails
      </p>

      <div className="mt-3 flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-white/8 bg-slate-900/40 p-3">
        <svg viewBox="0 0 560 320" width="100%" height="100%">
          <rect
            x="190"
            y="12"
            width="180"
            height="44"
            rx="14"
            fill="#7c2d12"
            stroke="#f59e0b"
            strokeWidth="1.5"
            onClick={() => handleDeviceClick("ufm-server")}
            className="cursor-pointer transition-opacity hover:opacity-90"
          />
          <text x="280" y="40" textAnchor="middle" fill="#fed7aa" fontSize="14" fontWeight="700">
            UFM Server
          </text>

          <line x1="280" y1="56" x2="280" y2="96" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 4" />

          <rect
            x="150"
            y="96"
            width="260"
            height="60"
            rx="18"
            fill="#1d4ed8"
            stroke="#60a5fa"
            strokeWidth="1.5"
            onClick={() => handleDeviceClick("dgx-node-01")}
            className="cursor-pointer transition-opacity hover:opacity-90"
          />
          <text x="280" y="123" textAnchor="middle" fill="#eff6ff" fontSize="16" fontWeight="700">
            DGX Node 01
          </text>
          <text x="280" y="144" textAnchor="middle" fill="#bfdbfe" fontSize="11">
            mlx5_0 / eth0     mlx5_1 / eth1
          </text>

          <line x1="220" y1="156" x2="165" y2="212" stroke="#22c55e" strokeWidth="5" />
          <line x1="340" y1="156" x2="395" y2="212" stroke="#22c55e" strokeWidth="5" />

          <rect
            x="84"
            y="212"
            width="162"
            height="64"
            rx="16"
            fill="#14532d"
            stroke="#22c55e"
            strokeWidth="1.5"
            onClick={() => handleDeviceClick("leaf-rail0")}
            className="cursor-pointer transition-opacity hover:opacity-90"
          />
          <text x="165" y="237" textAnchor="middle" fill="#dcfce7" fontSize="15" fontWeight="700">
            leaf-rail0
          </text>
          <text x="165" y="257" textAnchor="middle" fill="#bbf7d0" fontSize="11">
            swp1 - Rail 0
          </text>

          <rect
            x="314"
            y="212"
            width="162"
            height="64"
            rx="16"
            fill="#14532d"
            stroke="#22c55e"
            strokeWidth="1.5"
            onClick={() => handleDeviceClick("leaf-rail1")}
            className="cursor-pointer transition-opacity hover:opacity-90"
          />
          <text x="395" y="237" textAnchor="middle" fill="#dcfce7" fontSize="15" fontWeight="700">
            leaf-rail1
          </text>
          <text x="395" y="257" textAnchor="middle" fill="#bbf7d0" fontSize="11">
            swp1 - Rail 1
          </text>
        </svg>
      </div>

      {!compact ? (
        <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-slate-300">
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.22em] text-amber-200">UFM</p>
            <p className="mt-1 leading-5 text-slate-300">Fabric-wide rail to endpoint mapping</p>
          </div>
          <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.22em] text-blue-200">DGX OS</p>
            <p className="mt-1 leading-5 text-slate-300">ibstat, RDMA mapping, Linux netdev state</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-200">Cumulus</p>
            <p className="mt-1 leading-5 text-slate-300">NVUE interface link state on swp1</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CounterPrimerTopologyDiagram({ compact = false }: { compact?: boolean }) {
  return (
    <section className="flex h-full flex-col rounded-3xl border border-white/10 bg-slate-950/80 p-4 text-slate-100 shadow-2xl shadow-slate-950/30 backdrop-blur">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
        Lossless counter primer - single RoCE rail
      </p>

      <div className="mt-3 flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-white/8 bg-slate-900/40 p-3">
        <svg viewBox="0 0 560 320" width="100%" height="100%">
          <rect
            x="60"
            y="126"
            width="180"
            height="68"
            rx="18"
            fill="#1d4ed8"
            stroke="#60a5fa"
            strokeWidth="1.5"
            onClick={() => handleDeviceClick("dgx-node-01")}
            className="cursor-pointer transition-opacity hover:opacity-90"
          />
          <text x="150" y="153" textAnchor="middle" fill="#eff6ff" fontSize="16" fontWeight="700">
            DGX Node 01
          </text>
          <text x="150" y="174" textAnchor="middle" fill="#bfdbfe" fontSize="11">
            mlx5_0 / eth0
          </text>

          <line x1="240" y1="160" x2="320" y2="160" stroke="#22c55e" strokeWidth="6" />
          <text x="280" y="147" textAnchor="middle" fill="#86efac" fontSize="11">
            400G RoCEv2
          </text>
          <text x="280" y="190" textAnchor="middle" fill="#67e8f9" fontSize="10">
            ECN marks + PFC pauses, no drops
          </text>

          <rect
            x="320"
            y="126"
            width="180"
            height="68"
            rx="18"
            fill="#14532d"
            stroke="#22c55e"
            strokeWidth="1.5"
            onClick={() => handleDeviceClick("leaf-rail0")}
            className="cursor-pointer transition-opacity hover:opacity-90"
          />
          <text x="410" y="153" textAnchor="middle" fill="#dcfce7" fontSize="16" fontWeight="700">
            leaf-rail0
          </text>
          <text x="410" y="174" textAnchor="middle" fill="#bbf7d0" fontSize="11">
            swp1 to DGX + peer egress
          </text>
        </svg>
      </div>

      {!compact ? (
        <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-slate-300">
          <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.22em] text-blue-200">DGX probe</p>
            <p className="mt-1 leading-5 text-slate-300">Run ib_write_bw, then inspect ethtool counters</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-200">Switch PFC</p>
            <p className="mt-1 leading-5 text-slate-300">Read priority-3 pause frames on swp1</p>
          </div>
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200">Switch ECN</p>
            <p className="mt-1 leading-5 text-slate-300">Check RoCE counters and no-buffer-discard</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

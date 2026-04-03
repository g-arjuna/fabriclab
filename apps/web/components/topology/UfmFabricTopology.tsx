"use client";

import { useMemo, useState } from "react";

import type { LabDevice, RailState, TopologyState } from "@/types";

type UfmNodeKind = "switch" | "host";

interface UfmNode {
  id: string;
  label: string;
  osLabel: string;
  kind: UfmNodeKind;
  portName: string;
  status: "up" | "down" | "error-disabled" | "degraded";
  railId?: number;
  x: number;
  y: number;
}

interface UfmLink {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  status: "Active" | "Down";
  physicalState: "Link Up" | "Polling";
  fromPort: string;
  toPort: string;
}

const NODE_THEME: Record<
  UfmNodeKind,
  { fill: string; stroke: string; iconBg: string; iconFg: string }
> = {
  host: {
    fill: "#0b1730",
    stroke: "#335489",
    iconBg: "#172554",
    iconFg: "#dbeafe",
  },
  switch: {
    fill: "#0e1c1d",
    stroke: "#1f5f52",
    iconBg: "#134e4a",
    iconFg: "#d1fae5",
  },
};

const STATUS_META = {
  up: { label: "Normal", dot: "#22c55e", line: "#14b8a6" },
  degraded: { label: "Warning", dot: "#f59e0b", line: "#f59e0b" },
  "error-disabled": { label: "Critical", dot: "#ef4444", line: "#ef4444" },
  down: { label: "Down", dot: "#ef4444", line: "#ef4444" },
} as const;

function inferPortName(device: LabDevice): string {
  return (
    device.allowedCommands
      .map((command) => /\b(swp\d+|eth\d+|mlx5_\d+)\b/.exec(command)?.[1])
      .find((portName): portName is string => Boolean(portName)) ??
    device.sublabel?.match(/\b(swp\d+|eth\d+|mlx5_\d+)\b/)?.[1] ??
    "1"
  );
}

function buildNodes(devices: LabDevice[]): UfmNode[] {
  return devices
    .filter((device) => device.type !== "ufm-server" || !device.label.startsWith("[SIM ONLY]"))
    .filter((device) => device.type !== "ufm-server")
    .map((device) => ({
      id: device.id,
      label: device.label,
      osLabel: device.osLabel,
      kind: device.type === "dgx" ? "host" : "switch",
      portName: inferPortName(device),
      status: device.status,
      railId: device.railId,
      x: Math.max(80, Math.min(640, device.position.x)),
      y: Math.max(80, Math.min(360, device.position.y + 30)),
    }));
}

function buildLinks(nodes: UfmNode[], rails: RailState[]): UfmLink[] {
  const hosts = nodes.filter((node) => node.kind === "host");
  const switches = nodes.filter((node) => node.kind === "switch");

  if (hosts.length === 0 || switches.length === 0) {
    return [];
  }

  if (rails.length > 0) {
    const primaryHost = hosts[0];

    return rails
      .map((rail) => {
        const switchNode =
          switches.find((node) => node.railId === rail.id) ??
          switches.find((node) => node.id === `leaf-rail${rail.id}`);

        if (!switchNode) {
          return null;
        }

        const linkUp = rail.switchPort === "up";

        return {
          id: `${primaryHost.id}-${switchNode.id}`,
          fromNodeId: primaryHost.id,
          toNodeId: switchNode.id,
          status: linkUp ? "Active" : "Down",
          physicalState: linkUp ? "Link Up" : "Polling",
          fromPort: rail.nicName,
          toPort: switchNode.portName,
        } satisfies UfmLink;
      })
      .filter((link): link is UfmLink => Boolean(link));
  }

  return hosts.flatMap((hostNode, index) => {
    const switchNode = switches[Math.min(index, switches.length - 1)];
    const linkHealthy = hostNode.status === "up" && switchNode.status === "up";

    return [
      {
        id: `${hostNode.id}-${switchNode.id}`,
        fromNodeId: hostNode.id,
        toNodeId: switchNode.id,
        status: linkHealthy ? "Active" : "Down",
        physicalState: linkHealthy ? "Link Up" : "Polling",
        fromPort: hostNode.portName,
        toPort: switchNode.portName,
      },
    ];
  });
}

function nodeIcon(kind: UfmNodeKind) {
  if (kind === "switch") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <rect x="4" y="8" width="16" height="8" rx="2" />
        <path d="M7.5 12h.01M12 12h.01M16.5 12h.01" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <rect x="5" y="5.5" width="14" height="10" rx="2" />
      <path d="M9 19h6M12 15.5V19" />
    </svg>
  );
}

export function UfmFabricTopology({
  devices,
  topologyState,
}: {
  devices: LabDevice[];
  topologyState: TopologyState;
}) {
  const nodes = useMemo(() => buildNodes(devices), [devices]);
  const links = useMemo(
    () => buildLinks(nodes, topologyState.rails ?? []),
    [nodes, topologyState.rails],
  );
  const [selectedNodeId, setSelectedNodeId] = useState(nodes[0]?.id ?? null);

  const selectedNode =
    nodes.find((node) => node.id === selectedNodeId) ?? nodes[0] ?? null;
  const selectedLinks = selectedNode
    ? links.filter(
        (link) =>
          link.fromNodeId === selectedNode.id || link.toNodeId === selectedNode.id,
      )
    : [];

  return (
    <section className="grid h-full min-h-0 grid-cols-[220px,minmax(0,1fr),280px] overflow-hidden rounded-[28px] border border-white/10 bg-[#050914]">
      <aside className="border-r border-white/10 bg-[#070e1a]">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Network Map</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">default fabric</p>
        </div>

        <div className="p-3">
          <p className="px-2 text-[10px] uppercase tracking-[0.22em] text-slate-500">Map Elements</p>
          <div className="mt-2 space-y-1.5">
            {nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const status = STATUS_META[node.status];

              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left transition ${
                    isSelected
                      ? "border-cyan-300/20 bg-cyan-300/5"
                      : "border-transparent hover:border-white/10 hover:bg-white/[0.03]"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: status.dot }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-200">{node.label}</p>
                    <p className="truncate text-[10px] text-slate-500">{node.osLabel}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <div className="relative min-h-0 overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.08),_transparent_35%),linear-gradient(180deg,#07111f,#030712)]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-100/80">
              Map View
            </span>
            <span className="rounded-full border border-white/8 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Information View
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Normal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Warning
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              Critical
            </span>
          </div>
        </div>

        <svg viewBox="0 0 720 420" className="h-[calc(100%-44px)] w-full">
          <defs>
            <linearGradient id="ufm-link-ok" x1="0" x2="1">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>

          {links.map((link) => {
            const fromNode = nodes.find((node) => node.id === link.fromNodeId);
            const toNode = nodes.find((node) => node.id === link.toNodeId);

            if (!fromNode || !toNode) {
              return null;
            }

            return (
              <line
                key={link.id}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={link.status === "Active" ? "url(#ufm-link-ok)" : "#ef4444"}
                strokeDasharray={link.status === "Active" ? undefined : "8 6"}
                strokeWidth="3"
                opacity="0.92"
              />
            );
          })}

          {nodes.map((node) => {
            const theme = NODE_THEME[node.kind];
            const status = STATUS_META[node.status];
            const isSelected = selectedNode?.id === node.id;

            return (
              <g key={node.id} onClick={() => setSelectedNodeId(node.id)} className="cursor-pointer">
                <rect
                  x={node.x - 74}
                  y={node.y - 28}
                  width="148"
                  height="56"
                  rx="16"
                  fill={theme.fill}
                  stroke={isSelected ? "#67e8f9" : theme.stroke}
                  strokeWidth={isSelected ? "1.8" : "1.2"}
                />
                <circle cx={node.x - 51} cy={node.y} r="12" fill={theme.iconBg} />
                <foreignObject x={node.x - 60} y={node.y - 9} width="18" height="18">
                  <div className="flex h-full w-full items-center justify-center" style={{ color: theme.iconFg }}>
                    {nodeIcon(node.kind)}
                  </div>
                </foreignObject>
                <text x={node.x - 30} y={node.y - 2} fill="#e2e8f0" fontSize="12" fontWeight="600">
                  {node.label}
                </text>
                <text x={node.x - 30} y={node.y + 13} fill="#64748b" fontSize="9">
                  {node.osLabel}
                </text>
                <circle cx={node.x + 53} cy={node.y - 13} r="4" fill={status.dot} />
              </g>
            );
          })}
        </svg>
      </div>

      <aside className="border-l border-white/10 bg-[#070e1a]">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Properties</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-100">
            {selectedNode?.label ?? "No system selected"}
          </p>
        </div>

        <div className="space-y-3 p-4 text-xs">
          {selectedNode ? (
            <>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">System</p>
                <dl className="mt-3 space-y-2">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Name</dt>
                    <dd className="truncate text-slate-200">{selectedNode.id}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Type</dt>
                    <dd className="text-slate-200">{selectedNode.kind === "host" ? "Computer" : "Switch"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Status</dt>
                    <dd style={{ color: STATUS_META[selectedNode.status].dot }}>
                      {STATUS_META[selectedNode.status].label}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Rail</dt>
                    <dd className="text-slate-200">{selectedNode.railId ?? "N/A"}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Links</p>
                <div className="mt-3 space-y-2">
                  {selectedLinks.length > 0 ? (
                    selectedLinks.map((link) => {
                      const peerId =
                        link.fromNodeId === selectedNode.id ? link.toNodeId : link.fromNodeId;
                      const localPort =
                        link.fromNodeId === selectedNode.id ? link.fromPort : link.toPort;
                      const remotePort =
                        link.fromNodeId === selectedNode.id ? link.toPort : link.fromPort;

                      return (
                        <div key={link.id} className="rounded-xl border border-white/8 bg-slate-950/40 p-3">
                          <p className="truncate text-slate-200">{peerId}</p>
                          <p className="mt-2 text-[11px] text-slate-500">
                            {localPort}
                            {" -> "}
                            {remotePort}
                          </p>
                          <p className="mt-1 text-[11px]" style={{ color: link.status === "Active" ? "#5eead4" : "#fb7185" }}>
                            {link.status} / {link.physicalState}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-slate-500">No discovered peer links for this node.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-slate-500">No fabric elements available for this lab.</p>
          )}
        </div>
      </aside>
    </section>
  );
}

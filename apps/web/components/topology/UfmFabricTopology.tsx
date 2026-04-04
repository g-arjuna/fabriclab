"use client";

import { useEffect, useMemo, useState } from "react";

import { buildUfmFabricModel } from "@/lib/ufmFabricModel";
import type { LabDevice, TopologyState } from "@/types";

const NODE_VISUAL = {
  Host: {
    fill: "#7ac142",
    stroke: "#4e8f1f",
    icon: "M5 16h14M8 16V8h8v8",
  },
  Switch: {
    fill: "#ef6a64",
    stroke: "#b94b46",
    icon: "M6 8h12M6 12h12M6 16h12M8 6v12M16 6v12",
  },
} as const;

const STATUS_VISUAL = {
  up: { label: "Info", color: "#7ac142", line: "#111111" },
  degraded: { label: "Warning", color: "#f3b640", line: "#d48d10" },
  "admin-down": { label: "Warning", color: "#f3b640", line: "#d48d10" },
  "error-disabled": { label: "Critical", color: "#d9534f", line: "#d9534f" },
  down: { label: "Critical", color: "#d9534f", line: "#d9534f" },
} as const;

function UfmToolbarButton({ children }: { children: string }) {
  return (
    <button
      type="button"
      className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-sm text-zinc-600 shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
    >
      {children}
    </button>
  );
}

function UfmNodeGlyph({
  isSelected,
  node,
  onSelect,
}: {
  isSelected: boolean;
  node: ReturnType<typeof buildUfmFabricModel>["nodes"][number];
  onSelect: () => void;
}) {
  const visual = NODE_VISUAL[node.typeLabel];
  const statusColor = STATUS_VISUAL[node.status].color;

  return (
    <g onClick={onSelect} className="cursor-pointer">
      <rect
        x={node.x - 14}
        y={node.y - 14}
        width="28"
        height="28"
        rx={node.typeLabel === "Host" ? 2 : 4}
        fill={visual.fill}
        stroke={isSelected ? "#23527c" : visual.stroke}
        strokeWidth={isSelected ? "2.2" : "1.4"}
      />
      <path d={visual.icon} stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <circle cx={node.x + 13} cy={node.y - 13} r="4" fill={statusColor} stroke="#ffffff" strokeWidth="1" />
      <text x={node.x + 18} y={node.y + 2} fontSize="10" fill="#7ac142" fontFamily="Arial, sans-serif">
        {node.id}
      </text>
    </g>
  );
}

function ToggleRow({ defaultOn = true, icon, label }: { defaultOn?: boolean; icon: string; label: string }) {
  const [enabled, setEnabled] = useState(defaultOn);

  return (
    <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-2.5 first:border-t-0">
      <div className="flex items-center gap-2 text-[13px] text-zinc-700">
        <span className="text-base text-[#7ac142]">{icon}</span>
        <span>{label}</span>
      </div>
      <button
        type="button"
        onClick={() => setEnabled((current) => !current)}
        className={`relative h-[22px] w-[44px] rounded-full border transition ${
          enabled ? "border-[#6ca82f] bg-[#79b83f]" : "border-zinc-300 bg-zinc-100"
        }`}
      >
        <span
          className={`absolute top-[2px] h-4 w-4 rounded-full bg-white shadow-sm transition ${
            enabled ? "left-[24px]" : "left-[2px]"
          }`}
        />
      </button>
    </div>
  );
}

function SideSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-[4px] border border-zinc-200 bg-[#f7f7f7]">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-[#f1f1f1] px-3 py-2 text-[12px] text-zinc-700">
        <span>{title}</span>
        <span className="text-zinc-500">⌄</span>
      </div>
      {children}
    </section>
  );
}

export function UfmFabricTopology({
  devices,
  topologyState,
}: {
  devices: LabDevice[];
  topologyState: TopologyState;
}) {
  const fabricModel = useMemo(
    () => buildUfmFabricModel(devices, topologyState),
    [devices, topologyState],
  );
  const { links, nodes } = fabricModel;
  const [selectedNodeId, setSelectedNodeId] = useState(nodes[0]?.id ?? null);

  useEffect(() => {
    setSelectedNodeId(nodes[0]?.id ?? null);
  }, [nodes]);

  const selectedNode =
    nodes.find((node) => node.id === selectedNodeId) ?? nodes[0] ?? null;
  const selectedLinks = selectedNode
    ? links.filter(
        (link) => link.fromNodeId === selectedNode.id || link.toNodeId === selectedNode.id,
      )
    : [];

  return (
    <section className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_360px] overflow-hidden rounded-[8px] border border-zinc-300 bg-white text-zinc-800">
      <div className="min-h-0 border-r border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3">
          <select className="w-full rounded-[3px] border border-zinc-300 bg-white px-3 py-2 text-[13px] text-zinc-700">
            <option>Zoom In tab</option>
          </select>
        </div>

        <div className="flex items-center gap-2 px-6 py-3">
          <UfmToolbarButton>↓</UfmToolbarButton>
          <UfmToolbarButton>↔</UfmToolbarButton>
          <UfmToolbarButton>⛶</UfmToolbarButton>
          <UfmToolbarButton>▭</UfmToolbarButton>
          <UfmToolbarButton>✦</UfmToolbarButton>
          <div className="ml-1 flex flex-1 items-center gap-2">
            <span className="h-4 w-4 rounded-full bg-zinc-900" />
            <div className="h-[6px] flex-1 rounded-full bg-zinc-200" />
          </div>
        </div>

        <div className="h-[calc(100%-109px)] overflow-hidden bg-white">
          <svg viewBox="0 0 720 420" className="h-full w-full">
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
                  stroke={link.status === "Active" ? "#111111" : "#d9534f"}
                  strokeWidth="2.2"
                />
              );
            })}

            {nodes.map((node) => (
              <UfmNodeGlyph
                key={node.id}
                isSelected={selectedNode?.id === node.id}
                node={node}
                onSelect={() => setSelectedNodeId(node.id)}
              />
            ))}
          </svg>
        </div>
      </div>

      <aside className="min-h-0 overflow-y-auto bg-white">
        <div className="flex border-b border-zinc-200">
          <button
            type="button"
            className="border-r border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600"
          >
            View
          </button>
          <button type="button" className="px-4 py-3 text-sm text-zinc-500">
            Properties
          </button>
        </div>

        <div className="space-y-3 p-3">
          <div className="flex items-center justify-between px-1 py-2 text-[13px] text-zinc-700">
            <span>Display Label</span>
            <select className="rounded-[3px] border border-zinc-300 px-3 py-2 text-[13px] text-zinc-700">
              <option>System Name</option>
            </select>
          </div>

          <SideSection title="Type">
            <ToggleRow icon="▣" label="Rack" />
            <ToggleRow icon="▭" label="Host" />
            <ToggleRow icon="⤧" label="Gateway" />
            <ToggleRow icon="↔" label="Switch" />
            <ToggleRow icon="◈" label="Router" />
          </SideSection>

          <SideSection title="Severity">
            <ToggleRow icon="✓" label="Info" />
            <ToggleRow icon="?" label="Warning" />
            <ToggleRow icon="!" label="Minor" />
            <ToggleRow icon="▲" label="Critical" />
          </SideSection>

          <SideSection title="Network Analysis">
            <ToggleRow defaultOn={false} icon="◔" label="Link Analysis" />
          </SideSection>

          <SideSection title="Network Compare">
            <ToggleRow defaultOn={false} icon="◫" label="Topology Compare" />
          </SideSection>

          <SideSection title="Selected Object">
            <div className="space-y-2 px-4 py-3 text-[12px] text-zinc-700">
              <div className="font-semibold text-zinc-900">
                {selectedNode?.id ?? "No object selected"}
              </div>
              <div>Type: {selectedNode?.typeLabel ?? "N/A"}</div>
              <div>
                Severity:{" "}
                {selectedNode ? STATUS_VISUAL[selectedNode.status].label : "N/A"}
              </div>
              <div>Rail: {selectedNode?.railId ?? "N/A"}</div>
              <div>Port: {selectedNode?.portName ?? "N/A"}</div>
              {selectedLinks.map((link) => (
                <div key={link.id} className="rounded border border-zinc-200 bg-white px-2 py-1">
                  {link.fromNodeId} {link.fromPort} {"->"} {link.toNodeId} {link.toPort}
                </div>
              ))}
            </div>
          </SideSection>
        </div>
      </aside>
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { AuthControls } from "@/components/auth/AuthControls";
import { CommunityThread } from "@/components/community/CommunityThread";
import { KnowledgePanel } from "@/components/knowledge/KnowledgePanel";
import { LabResult } from "@/components/lab/LabResult";
import { SolutionModal } from "@/components/lab/SolutionModal";
import { MultiDeviceTerminal } from "@/components/terminal/MultiDeviceTerminal";
import { TopologyView } from "@/components/topology/TopologyView";
import { UfmFabricTopology } from "@/components/topology/UfmFabricTopology";
import { lab0a, lab0aDevices } from "@/data/labs/lab0a-fabric-cli-orientation";
import { lab0b, lab0bDevices } from "@/data/labs/lab0b-roce-counter-reading";
import { lab0, lab0Devices } from "@/data/labs/lab0-failed-rail";
import { lab1, lab1Devices } from "@/data/labs/lab1-pfc-fix";
import { lab2, lab2Devices } from "@/data/labs/lab2-congestion";
import { lab3, lab3Devices } from "@/data/labs/lab3-uneven-spine";
import { lab4, lab4Devices } from "@/data/labs/lab4-topology-sizing";
import { lab5, lab5Devices } from "@/data/labs/lab5-nccl-diagnosis";
import { lab6, lab6Devices } from "@/data/labs/lab6-alert-triage";
import { lab7, lab7Devices } from "@/data/labs/lab7-pause-storm";
import { lab8, lab8Devices } from "@/data/labs/lab8-pfc-priority-mismatch";
import { lab9, lab9Devices } from "@/data/labs/lab9-errdisable-recovery";
import { lab10, lab10Devices } from "@/data/labs/lab10-ecmp-hotspot";
import { lab11, lab11Devices } from "@/data/labs/lab11-bgp-path-failure";
import { lab14, lab14Devices } from "@/data/labs/lab14-srv6-te-path-steering";
import { lab15, lab15Devices } from "@/data/labs/lab15-rdma-rkey-exposure";
import { lab16, lab16Devices } from "@/data/labs/lab16-spectrum-x-platform-audit";
import { lab17, lab17Devices } from "@/data/labs/lab17-roce-day-zero-config";
import { lab18, lab18Devices } from "@/data/labs/lab18-ecn-threshold-tuning";
import { isComplete } from "@/lib/labEngine";
import { formatConditionLabel } from "@/lib/formatters";
import { useLabStore } from "@/store/labStore";
import { useProgressStore } from "@/store/progressStore";
import type { LabDevice, RailState, TopologyState } from "@/types";

const LABS = {
  [lab0a.id]: lab0a,
  [lab0b.id]: lab0b,
  [lab0.id]: lab0,
  [lab1.id]: lab1,
  [lab2.id]: lab2,
  [lab3.id]: lab3,
  [lab4.id]: lab4,
  [lab5.id]: lab5,
  [lab6.id]: lab6,
  [lab7.id]: lab7,
  [lab8.id]: lab8,
  [lab9.id]: lab9,
  [lab10.id]: lab10,
  [lab11.id]: lab11,
  [lab14.id]: lab14,
  [lab15.id]: lab15,
  [lab16.id]: lab16,
  [lab17.id]: lab17,
  [lab18.id]: lab18,
};

const LAB_DEVICES = {
  [lab0a.id]: lab0aDevices,
  [lab0b.id]: lab0bDevices,
  [lab0.id]: lab0Devices,
  [lab1.id]: lab1Devices,
  [lab2.id]: lab2Devices,
  [lab3.id]: lab3Devices,
  [lab4.id]: lab4Devices,
  [lab5.id]: lab5Devices,
  [lab6.id]: lab6Devices,
  [lab7.id]: lab7Devices,
  [lab8.id]: lab8Devices,
  [lab9.id]: lab9Devices,
  [lab10.id]: lab10Devices,
  [lab11.id]: lab11Devices,
  [lab14.id]: lab14Devices,
  [lab15.id]: lab15Devices,
  [lab16.id]: lab16Devices,
  [lab17.id]: lab17Devices,
  [lab18.id]: lab18Devices,
};

const LAB_SOURCE_CHAPTERS: Record<string, { slug: string; label: string }> = {
  [lab0a.id]: { slug: "ch3-the-cli", label: "Chapter 3: The CLI" },
  [lab0b.id]: { slug: "ch5-pfc-ecn-congestion", label: "Chapter 5: PFC & ECN" },
  [lab0.id]: { slug: "ch3-the-cli", label: "Chapter 3: The CLI" },
  [lab1.id]: { slug: "ch5-pfc-ecn-congestion", label: "Chapter 5: PFC & ECN" },
  [lab2.id]: { slug: "ch5-pfc-ecn-congestion", label: "Chapter 5: PFC & ECN" },
  [lab3.id]: { slug: "ch6-efficient-load-balancing", label: "Chapter 6: Efficient Load Balancing" },
  [lab4.id]: { slug: "ch7-topology-design", label: "Chapter 7: Topology Design" },
  [lab5.id]: { slug: "ch8-nccl-performance", label: "Chapter 8: NCCL" },
  [lab6.id]: { slug: "ch11-monitoring-telemetry", label: "Chapter 11: Monitoring & Telemetry" },
  [lab7.id]: { slug: "ch5-pfc-ecn-congestion", label: "Chapter 5: PFC & ECN" },
  [lab8.id]: { slug: "ch5-pfc-ecn-congestion", label: "Chapter 5: PFC & ECN" },
  [lab9.id]: { slug: "ch9-optics-cabling", label: "Chapter 9: Optics & Cabling" },
  [lab10.id]: { slug: "ch15-ip-routing-ai-fabrics", label: "Chapter 15: IP Routing for AI/ML Fabrics" },
  [lab11.id]: { slug: "ch15-ip-routing-ai-fabrics", label: "Chapter 15: IP Routing for AI/ML Fabrics" },
  [lab14.id]: { slug: "ch22-segment-routing-ai", label: "Chapter 22: Segment Routing for AI Fabrics" },
  [lab15.id]: { slug: "ch23-ai-networking-security", label: "Chapter 23: AI Networking Security" },
  [lab16.id]: {
    slug: "ch24-spectrum-x-architecture",
    label: "Chapter 24: Spectrum-X Architecture and the AI Factory Platform",
  },
  [lab17.id]: {
    slug: "ch25-roce-configuration-operations",
    label: "Chapter 25: RoCE Configuration and Operations on Spectrum-X",
  },
  [lab18.id]: {
    slug: "ch25-roce-configuration-operations",
    label: "Chapter 25: RoCE Configuration and Operations on Spectrum-X",
  },
};

type LabId = keyof typeof LABS;

function DesktopRecommendationPrompt({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-900/95 p-6 shadow-2xl shadow-slate-950/50">
        <p className="text-xs uppercase tracking-[0.28em] text-amber-300">Desktop recommended</p>
        <h2 className="mt-4 text-2xl font-semibold text-white">Use FabricLab labs on a desktop if you can</h2>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          Labs combine topology, multi-device terminal sessions, and reference tooling in one
          workspace. The experience is much better on a laptop or desktop display.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/lab"
            className="inline-flex flex-1 items-center justify-center rounded-full border border-white/10 px-5 py-3 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            Back to labs
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  );
}

function formatElapsed(startTime: number | null, now: number): string {
  const elapsedSeconds = startTime ? Math.max(0, Math.floor((now - startTime) / 1000)) : 0;
  return `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`;
}

function inferLeafPortName(devices: LabDevice[], railId: number, fallbackPort: string): string {
  const leafDevice = devices.find(
    (device) => device.type === "leaf-switch" && device.railId === railId,
  );
  const commandPort = leafDevice?.allowedCommands
    .map((command) => /\b(swp\d+)\b/.exec(command)?.[1])
    .find((portName): portName is string => Boolean(portName));

  return commandPort ?? fallbackPort;
}

function formatUfmPortRecord({
  description,
  dname,
  guid,
  highBerSeverity = "N/A",
  lid,
  logicalState,
  path,
  peerGuid,
  peerNodeDescription,
  peerNodeName,
  peerPortDname,
  physicalState,
  severity,
  systemIp,
  systemName,
}: {
  description: "Computer IB Port" | "Switch IB Port";
  dname: string;
  guid: string;
  highBerSeverity?: "N/A" | "Warning";
  lid: number;
  logicalState: "Active" | "Down";
  path: string;
  peerGuid: string;
  peerNodeDescription: string;
  peerNodeName: string;
  peerPortDname: string;
  physicalState: "Link Up" | "Polling";
  severity: "Info" | "Warning" | "Critical";
  systemIp: string;
  systemName: string;
}) {
  return {
    description,
    number: Number.parseInt(dname.replace(/\D/g, ""), 10) || 1,
    external_number: Number.parseInt(dname.replace(/\D/g, ""), 10) || 1,
    physical_state: physicalState,
    path,
    tier: description === "Switch IB Port" ? 3 : 1,
    high_ber_severity: highBerSeverity,
    lid,
    mirror: "disable",
    logical_state: logicalState,
    capabilities:
      description === "Switch IB Port"
        ? ["reset", "healthy_operations", "disable", "get_cables_info"]
        : ["reset", "healthy_operations", "disable"],
    mtu: 4096,
    peer_port_dname: peerPortDname,
    severity,
    active_speed: logicalState === "Active" ? "NDR" : null,
    enabled_speed: logicalState === "Active" ? ["SDR", "DDR", "QDR", "FDR", "EDR", "HDR", "NDR"] : [],
    supported_speed: ["SDR", "DDR", "QDR", "FDR", "EDR", "HDR", "NDR"],
    active_width: logicalState === "Active" ? "4x" : null,
    enabled_width: logicalState === "Active" ? ["1x", "4x"] : [],
    supported_width: ["1x", "4x"],
    dname,
    peer_node_name: peerNodeName,
    peer: peerPortDname === "N/A" ? "N/A" : `${peerGuid}_${peerPortDname.replace(/\D/g, "") || "1"}`,
    peer_node_guid: peerGuid,
    systemID: guid.replace(/^0x/, ""),
    node_description: `${systemName}:${dname}`,
    label: dname,
    name: `${guid.replace(/^0x/, "")}_${dname.replace(/\D/g, "") || "1"}`,
    module: "N/A",
    peer_lid: peerPortDname === "N/A" ? "N/A" : `${lid + 100}`,
    peer_guid: peerGuid,
    peer_node_description: peerNodeDescription,
    guid,
    system_name: systemName,
    system_ip: systemIp,
    peer_ip: peerPortDname === "N/A" ? "N/A" : "10.209.36.20",
    system_capabilities:
      description === "Switch IB Port"
        ? ["ssh", "sysinfo", "reboot", "mark_device_unhealthy", "collect_system_dump", "sw_upgrade"]
        : ["mark_device_unhealthy"],
    system_mirroring_template: false,
    hw_technology: null,
  };
}

function buildUfmPortsPayload(
  activeLabId: string,
  activeDevices: LabDevice[],
  topologyState: TopologyState,
) {
  const rails = topologyState.rails ?? [];

  if (activeLabId === "lab6-alert-triage") {
    const isRemediated = topologyState.opticReplaced === true;

    return {
      endpoint: "GET /ufmRest/resources/ports?system=leaf-rail5&active=true",
      note:
        "Documented UFM ports-resource response shape, populated from FabricLab's current lab state. Values are simulator-derived, not queried from a live UFM server.",
      payload: {
        total_resources: 8,
        filtered_resources: 8,
        num_of_pages: 1,
        first_index: 1,
        last_index: 8,
        data: Array.from({ length: 8 }, (_, index) => {
          const portNumber = index + 1;
          const isFaultyPort = portNumber === 7;
          const peerNodeName =
            portNumber === 7 ? "DGX-Node-A" : `DGX-Node-${String.fromCharCode(64 + portNumber)}`;

          return formatUfmPortRecord({
            description: "Switch IB Port",
            dname: `swp${portNumber}`,
            guid: "0x9c0591030085abc0",
            highBerSeverity: isFaultyPort && !isRemediated ? "Warning" : "N/A",
            lid: 40 + portNumber,
            logicalState: "Active",
            path: `default(1) / Switch: leaf-rail5 / swp${portNumber}`,
            peerGuid: `0x506b4b0300a1b20${portNumber}`,
            peerNodeDescription: `${peerNodeName}:mlx5_5`,
            peerNodeName,
            peerPortDname: "mlx5_5",
            physicalState: "Link Up",
            severity: isFaultyPort && !isRemediated ? "Warning" : "Info",
            systemIp: "10.209.36.15",
            systemName: "leaf-rail5",
          });
        }),
      },
    };
  }

  if (rails.length > 0) {
    const peerNodeName = activeLabId === "lab0a-fabric-cli-orientation" ? "dgx-node-01" : "dgx-node-a";

    return {
      endpoint: "GET /ufmRest/resources/ports?active=true",
      note:
        "Documented UFM ports-resource response shape, synthesized from this lab's rail state and endpoint mapping.",
      payload: {
        total_resources: rails.length,
        filtered_resources: rails.length,
        num_of_pages: 1,
        first_index: rails.length > 0 ? 1 : 0,
        last_index: rails.length,
        data: rails.map((rail) => {
          const switchPort = inferLeafPortName(
            activeDevices,
            rail.id,
            `swp${activeLabId === "lab0-failed-rail" ? rail.id + 2 : rail.id + 1}`,
          );
          const linkUp = rail.switchPort === "up";
          const peerGuid = rail.guid.replace(/^0x/, "");

          return formatUfmPortRecord({
            description: "Switch IB Port",
            dname: switchPort,
            guid: `0x9c0591030085ab${String(rail.id).padStart(2, "0")}`,
            lid: 100 + rail.id,
            logicalState: linkUp ? "Active" : "Down",
            path: `default(1) / Switch: leaf-rail${rail.id} / ${switchPort}`,
            peerGuid: `0x${peerGuid}`,
            peerNodeDescription: `${peerNodeName}:${rail.nicName}`,
            peerNodeName,
            peerPortDname: rail.nicName,
            physicalState: linkUp ? "Link Up" : "Polling",
            severity: rail.switchPort === "up" ? "Info" : "Warning",
            systemIp: `10.209.36.${20 + rail.id}`,
            systemName: `leaf-rail${rail.id}`,
          });
        }),
      },
    };
  }

  return {
    endpoint: "GET /ufmRest/resources/ports?active=true",
    note:
      "REST-shaped example generated from this lab's current device list. The topology card is still the source of truth for visual layout.",
    payload: {
      total_resources: activeDevices.filter((device) => device.type !== "ufm-server").length,
      filtered_resources: activeDevices.filter((device) => device.type !== "ufm-server").length,
      num_of_pages: 1,
      first_index: 1,
      last_index: activeDevices.filter((device) => device.type !== "ufm-server").length,
      data: activeDevices
        .filter((device) => device.type !== "ufm-server")
        .map((device, index) =>
          formatUfmPortRecord({
            description: device.type === "dgx" ? "Computer IB Port" : "Switch IB Port",
            dname: inferLeafPortName([device], device.railId ?? 0, inferLeafPortName([device], 0, "1")),
            guid: `0x506b4b0300a1b3${String(index).padStart(2, "0")}`,
            lid: 200 + index,
            logicalState: device.status === "up" ? "Active" : "Down",
            path: `default(1) / ${device.type === "dgx" ? "Computer" : "Switch"}: ${device.id} / ${device.label}`,
            peerGuid: "N/A",
            peerNodeDescription: "N/A",
            peerNodeName: "N/A",
            peerPortDname: "N/A",
            physicalState: device.status === "up" ? "Link Up" : "Polling",
            severity: device.status === "up" ? "Info" : "Warning",
            systemIp: `10.209.36.${100 + index}`,
            systemName: device.id,
          }),
        ),
    },
  };
}

function buildUfmApiExample(
  activeLabId: string,
  activeDevices: LabDevice[],
  topologyState: TopologyState,
  labConditions: Record<string, boolean>,
) {
  if (activeLabId === "lab15-rdma-rkey-exposure") {
    const isolationVerified = labConditions.pkeyIsolationVerified === true;

    return {
      endpoint: "GET /ufmRest/resources/pkeys/{pkey}",
      note:
        "Documented /ufmRest/resources/pkeys/<pkey>?guids_data=true shape, rendered from the lab's current PKey isolation state.",
      payload: isolationVerified
        ? {
            pkeys: [
              {
                partition: "TenantA_0x8001",
                ip_over_ib: true,
                guids: [
                  { membership: "full", guid: "506b4b0300a1b200", index0: false },
                  { membership: "limited", guid: "506b4b0300a1b210", index0: false },
                ],
              },
              {
                partition: "TenantB_0x8002",
                ip_over_ib: true,
                guids: [
                  { membership: "full", guid: "506b4b0300a1b202", index0: false },
                  { membership: "limited", guid: "506b4b0300a1b210", index0: false },
                ],
              },
            ],
          }
        : {
            warning: "Pre-verification state in this lab. Run the UFM PKey curl reads after hardening.",
            pkeys: [
              {
                partition: "TenantA_0x8001",
                ip_over_ib: true,
                guids: [
                  { membership: "full", guid: "506b4b0300a1b200", index0: false },
                  { membership: "full", guid: "506b4b0300a1b202", index0: false },
                ],
              },
            ],
          },
    };
  }

  return buildUfmPortsPayload(activeLabId, activeDevices, topologyState);
}

function KnowledgePanelDrawer() {
  const activeConceptId = useLabStore((state) => state.activeConceptId);
  const [isOpen, setIsOpen] = useState(false);
  const [wasAutoOpened, setWasAutoOpened] = useState(false);

  useEffect(() => {
    if (activeConceptId) {
      setIsOpen(true);
      setWasAutoOpened(true);
    }
  }, [activeConceptId]);

  useEffect(() => {
    if (!wasAutoOpened || !isOpen) return;
    const timer = window.setTimeout(() => {
      setIsOpen(false);
      setWasAutoOpened(false);
    }, 30000);
    return () => window.clearTimeout(timer);
  }, [wasAutoOpened, isOpen, activeConceptId]);

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setWasAutoOpened(false);
        }}
        className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1 rounded-l-xl border border-r-0 border-white/10 bg-slate-900 px-2 py-4 text-slate-400 shadow-xl transition hover:bg-slate-800 hover:text-white"
        title={isOpen ? "Close reference panel" : "Open reference panel"}
      >
        <span className="text-[9px] uppercase tracking-widest" style={{ writingMode: "vertical-rl" }}>
          {isOpen ? "Close" : "Reference"}
        </span>
        <span className="text-xs">{isOpen ? "\u2192" : "\u2190"}</span>
      </button>

      {isOpen && (
        <div className="fixed right-0 top-0 z-30 h-full w-[380px] overflow-y-auto border-l border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <span className="text-xs uppercase tracking-widest text-slate-400">Reference</span>
            <button
              onClick={() => {
                setIsOpen(false);
                setWasAutoOpened(false);
              }}
              className="text-slate-500 transition hover:text-white"
            >
              {"\u2715"}
            </button>
          </div>
          <div className="p-4">
            <KnowledgePanel />
          </div>
        </div>
      )}
    </>
  );
}

function DiscussionPulseButton({
  label,
  onClick,
  className = "",
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-slate-300 transition hover:border-cyan-300/20 hover:bg-cyan-300/[0.06] hover:text-slate-100 ${className}`}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-900/60 text-cyan-200 transition group-hover:border-cyan-300/20 group-hover:text-cyan-100">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path d="M7.5 18.5 4 20l1-3.6A7.2 7.2 0 0 1 3.5 12C3.5 7.86 7.31 4.5 12 4.5S20.5 7.86 20.5 12 16.69 19.5 12 19.5c-1.58 0-3.06-.38-4.5-1Z" />
            <path d="M8.5 11.8h7" />
            <path d="M8.5 14.5h4.2" />
          </svg>
        </span>
        <span>{label}</span>
      </span>
      <span className="text-sm text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-cyan-200">
        {"\u2192"}
      </span>
    </button>
  );
}

function LabDiscussionModal({
  activeLabId,
  activeLabTitle,
  onClose,
}: {
  activeLabId: string;
  activeLabTitle: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#060d18] shadow-2xl shadow-slate-950/40"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-amber-300">
              Report / Issue / Discuss
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
              Community discussion
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-slate-300 transition hover:text-white"
          >
            {"\u2715 Close"}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <CommunityThread
            contentKind="lab"
            contentSlug={activeLabId}
            standaloneSpacing={false}
            title={activeLabTitle}
          />
        </div>
      </div>
    </div>
  );
}

function UfmTopologyModal({
  activeDevices,
  activeLabTitle,
  onClose,
  topologyState,
}: {
  activeDevices: LabDevice[];
  activeLabTitle: string;
  onClose: () => void;
  topologyState: TopologyState;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#060d18] shadow-2xl shadow-slate-950/40"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.28em] text-amber-200/80">
              UFM fabric topology
            </p>
            <h2 className="mt-2 truncate text-xl font-semibold text-white sm:text-2xl">
              {activeLabTitle}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Live view rendered from the current simulator topology state, so link and rail status
              mirrors what the UFM commands report in this lab.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-slate-300 transition hover:text-white"
          >
            {"\u2715 Close"}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-4 sm:p-6">
          <div className="h-[72vh] min-h-[520px]">
            <UfmFabricTopology devices={activeDevices} topologyState={topologyState} />
          </div>
        </div>
      </div>
    </div>
  );
}

function UfmApiModal({
  activeDevices,
  activeLabId,
  labConditions,
  onClose,
  topologyState,
}: {
  activeDevices: LabDevice[];
  activeLabId: string;
  labConditions: Record<string, boolean>;
  onClose: () => void;
  topologyState: TopologyState;
}) {
  const apiExample = useMemo(
    () => buildUfmApiExample(activeLabId, activeDevices, topologyState, labConditions),
    [activeDevices, activeLabId, labConditions, topologyState],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#060d18] shadow-2xl shadow-slate-950/40"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/80">
              UFM REST API example
            </p>
            <h2 className="mt-2 truncate font-mono text-sm text-cyan-100 sm:text-base">
              {apiExample.endpoint}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              {apiExample.note}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-slate-300 transition hover:text-white"
          >
            {"\u2715 Close"}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
          <pre className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 font-mono text-xs leading-6 text-slate-200">
            {JSON.stringify(apiExample.payload, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

export function LabExperience({ labId }: { labId: string }) {
  const loadLab = useLabStore((state) => state.loadLab);
  const resetLab = useLabStore((state) => state.resetLab);
  const completeLab = useLabStore((state) => state.completeLab);
  const setActiveDevice = useLabStore((state) => state.setActiveDevice);
  const openDeviceSession = useLabStore((state) => state.openDeviceSession);
  const labState = useLabStore((state) => state.lab);
  const markLabComplete = useProgressStore((state) => state.markLabComplete);
  const [topologyExpanded, setTopologyExpanded] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [ufmApiOpen, setUfmApiOpen] = useState(false);
  const [ufmMapOpen, setUfmMapOpen] = useState(false);
  const [showDesktopPrompt, setShowDesktopPrompt] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [workspaceFocus, setWorkspaceFocus] = useState<"topology" | "terminal">("topology");

  const activeLab = useMemo(() => LABS[labId as LabId] ?? lab1, [labId]);
  const activeDevices = useMemo(() => LAB_DEVICES[activeLab.id] ?? [], [activeLab.id]);
  const sourceChapter = LAB_SOURCE_CHAPTERS[activeLab.id];
  const isLabComplete = useLabStore((state) => isComplete(state.lab, activeLab));
  const topologyState = useLabStore((state) => state.topology);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setShowDesktopPrompt(true);
    }
  }, [activeLab.id]);

  useEffect(() => {
    setWorkspaceFocus("topology");
    setTopologyExpanded(false);
  }, [activeLab.id]);

  useEffect(() => {
    loadLab(activeLab);
  }, [activeLab, loadLab]);

  useEffect(() => {
    if (activeLab.id === "lab4-topology-sizing") {
      openDeviceSession("workstation");
      setActiveDevice("workstation");
    }
  }, [activeLab.id, openDeviceSession, setActiveDevice]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ deviceId: string }>;
      openDeviceSession(customEvent.detail.deviceId);
      setActiveDevice(customEvent.detail.deviceId);
      setWorkspaceFocus("terminal");
    };
    window.addEventListener("device-selected", handler as EventListener);
    return () => window.removeEventListener("device-selected", handler as EventListener);
  }, [openDeviceSession, setActiveDevice]);

  useEffect(() => {
    if (isLabComplete && !labState.isComplete) {
      completeLab();
    }
  }, [completeLab, isLabComplete, labState.isComplete]);

  useEffect(() => {
    if (labState.isComplete && labState.score !== null) {
      markLabComplete(activeLab.id, labState.score);
    }
  }, [activeLab.id, labState.isComplete, labState.score, markLabComplete]);

  const latestHint = useMemo(() => {
    if (labState.shownHintLevels.size === 0) return null;
    const highest = Math.max(...Array.from(labState.shownHintLevels));
    return activeLab.hints.find((hint) => hint.level === highest) ?? null;
  }, [activeLab.hints, labState.shownHintLevels]);

  const handleReset = () => {
    resetLab();
    loadLab(activeLab);
  };

  useEffect(() => {
    setSolutionOpen(false);
    setDiscussionOpen(false);
    setUfmApiOpen(false);
    setUfmMapOpen(false);
  }, [activeLab.id]);

  return (
    <>
      <main className="flex h-screen flex-col overflow-hidden bg-[#07111f]">
        <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-white/8 bg-[#07111f] px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/lab"
              className="flex-shrink-0 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400 transition hover:text-slate-200"
            >
              {"\u2190 Labs"}
            </Link>
            {sourceChapter && (
              <Link
                href={`/learn/${sourceChapter.slug}`}
                className="flex-shrink-0 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400 transition hover:text-slate-200"
              >
                {`\u2190 ${sourceChapter.label}`}
              </Link>
            )}
            <span className="ml-2 hidden truncate text-sm font-semibold text-white sm:block">
              {activeLab.title}
            </span>
          </div>

          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-200 lg:inline-flex">
              Desktop recommended
            </span>
            <DiscussionPulseButton
              label="Report / Issue / Discuss"
              onClick={() => setDiscussionOpen(true)}
              className="hidden rounded-full px-4 py-2 text-[10px] lg:inline-flex"
            />
            <AuthControls compact />
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <aside className="flex w-[280px] flex-shrink-0 flex-col overflow-y-auto border-r border-white/8 bg-[#060d18] p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold leading-tight text-white">{activeLab.title}</h2>
              <span
                className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                  activeLab.difficulty === "beginner"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : activeLab.difficulty === "intermediate"
                    ? "bg-sky-500/15 text-sky-300"
                    : "bg-amber-500/15 text-amber-300"
                }`}
              >
                {activeLab.difficulty}
              </span>
            </div>

            <div className="mt-3 rounded-xl border border-white/8 bg-slate-900/60 px-4 py-2">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Elapsed</p>
              <p className="mt-0.5 font-mono text-2xl font-semibold text-cyan-300">
                {formatElapsed(labState.startTime, now)}
              </p>
            </div>

            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Scenario</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">
                {activeLab.scenario}
              </p>
              <DiscussionPulseButton
                label="Discuss this lab"
                onClick={() => setDiscussionOpen(true)}
                className="mt-4 w-full"
              />
            </div>

            <div className="mt-5">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Conditions</p>
              <ul className="mt-3 space-y-2">
                {activeLab.requiredConditions.map((condition) => {
                  const isMet = labState.conditions[condition] === true;
                  const isVerified = labState.verifiedConditions.has(condition);

                  return (
                    <li
                      key={condition}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition ${
                        isMet && isVerified
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : isMet
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                          : "border-white/8 bg-slate-900/50 text-slate-400"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                          isMet && isVerified
                            ? "bg-emerald-500 text-slate-950"
                            : isMet
                            ? "bg-amber-400 text-slate-950"
                            : "border border-slate-600"
                        }`}
                      >
                        {isMet && isVerified ? "\u2713" : ""}
                      </span>
                      {formatConditionLabel(condition)}
                    </li>
                  );
                })}
              </ul>
            </div>

            {latestHint && (
              <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-xs text-cyan-200">
                <span className="font-semibold">Hint: </span>
                {latestHint.text}
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-white/8 bg-slate-900/60 p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Need Help?</p>
              <p className="mt-2 text-xs leading-6 text-slate-400">
                Open the step-by-step command guide for this lab.
              </p>
              <button
                type="button"
                onClick={() => setSolutionOpen(true)}
                className="mt-3 w-full rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-200 transition hover:border-cyan-300/30 hover:bg-cyan-400/15 hover:text-white"
              >
                Show Solution
              </button>
            </div>

          </aside>

          <div
            className="grid flex-1 overflow-hidden"
            style={{
              gridTemplateRows:
                workspaceFocus === "topology"
                  ? "minmax(280px, 1.25fr) minmax(220px, 0.9fr)"
                  : "220px minmax(0, 1fr)",
            }}
          >
            <div
              className="relative min-h-0 transition-[height] duration-300 ease-out"
            >
              <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 p-1.5 shadow-lg backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() =>
                    setWorkspaceFocus((current) =>
                      current === "topology" ? "terminal" : "topology",
                    )
                  }
                  className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                    workspaceFocus === "topology"
                      ? "bg-slate-800 text-white hover:bg-slate-700"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {workspaceFocus === "topology" ? "Start lab" : "Review topology"}
                </button>
                <button
                  type="button"
                  onClick={() => setTopologyExpanded(true)}
                  className="flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-xs font-medium text-cyan-200 transition hover:border-cyan-300/35 hover:bg-cyan-400/15 hover:text-white"
                  title="Open enlarged topology"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M1 1h4M1 1v4M11 1h-4M11 1v4M1 11h4M1 11v-4M11 11h-4M11 11v-4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  Zoom
                </button>
              </div>

              <div className="h-full">
                <TopologyView compact={workspaceFocus !== "topology"} />
              </div>
            </div>

            <div className="min-h-0 overflow-hidden">
              <MultiDeviceTerminal
                devices={activeDevices}
                labTitle={activeLab.title}
                onOpenUfmApi={() => setUfmApiOpen(true)}
                onOpenUfmMap={() => setUfmMapOpen(true)}
              />
            </div>
          </div>
        </div>
      </main>

      {topologyExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm"
          onClick={() => setTopologyExpanded(false)}
        >
          <div
            className="relative flex h-[85vh] w-[85vw] max-w-[1200px] flex-col rounded-3xl border border-white/10 bg-[#060d18] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">Topology / {activeLab.title}</p>
                <p className="mt-0.5 text-sm text-slate-400">Reference view / use the device tabs below the topology to switch CLIs</p>
              </div>
              <button
                onClick={() => setTopologyExpanded(false)}
                className="rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:text-white"
              >
                {"\u2715 Close"}
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-6">
              <TopologyView />
            </div>
          </div>
        </div>
      )}

      <KnowledgePanelDrawer />

      <SolutionModal
        isOpen={solutionOpen}
        onClose={() => setSolutionOpen(false)}
        labId={activeLab.id}
        title={activeLab.title}
      />

      {discussionOpen ? (
        <LabDiscussionModal
          activeLabId={activeLab.id}
          activeLabTitle={activeLab.title}
          onClose={() => setDiscussionOpen(false)}
        />
      ) : null}

      {ufmMapOpen ? (
        <UfmTopologyModal
          activeDevices={activeDevices}
          activeLabTitle={activeLab.title}
          onClose={() => setUfmMapOpen(false)}
          topologyState={topologyState}
        />
      ) : null}

      {ufmApiOpen ? (
        <UfmApiModal
          activeDevices={activeDevices}
          activeLabId={activeLab.id}
          labConditions={labState.conditions}
          onClose={() => setUfmApiOpen(false)}
          topologyState={topologyState}
        />
      ) : null}

      {showDesktopPrompt ? (
        <DesktopRecommendationPrompt onDismiss={() => setShowDesktopPrompt(false)} />
      ) : null}

      {labState.isComplete && labState.score !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-6 backdrop-blur-sm">
          <LabResult score={labState.score} onReset={handleReset} labId={activeLab.id} />
        </div>
      )}
    </>
  );
}

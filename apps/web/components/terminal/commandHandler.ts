import { lab0, lab0Devices } from "@/data/labs/lab0-failed-rail";
import { lab1, lab1Devices } from "@/data/labs/lab1-pfc-fix";
import { lab2, lab2Devices } from "@/data/labs/lab2-congestion";
import { lab3, lab3Devices } from "@/data/labs/lab3-uneven-spine";
import { lab4, lab4Devices } from "@/data/labs/lab4-topology-sizing";
import { lab5, lab5Devices } from "@/data/labs/lab5-nccl-diagnosis";
import { calculateOversubscriptionA, calculateOversubscriptionB } from "@/lib/commands/calculateOversubscription";
import { compareProposals } from "@/lib/commands/compareProposals";
import { ibstat } from "@/lib/commands/ibstat";
import { ethtoolStats, ethtoolStatsEth3 } from "@/lib/commands/ethtoolStats";
import { ncclDebugTransport } from "@/lib/commands/ncclDebugTransport";
import { recommendProposalA, recommendProposalB } from "@/lib/commands/recommendProposal";
import { runMutation } from "@/lib/commands/mutations";
import { rdmaLinkShow } from "@/lib/commands/rdmaLinkShow";
import { showDcbLoadBalance } from "@/lib/commands/showDcbLoadBalance";
import { showNcclEnv } from "@/lib/commands/showNcclEnv";
import { showProposalA, showProposalB } from "@/lib/commands/showProposal";
import { showRdmaLinks } from "@/lib/commands/showRdmaLinks";
import { showSpineCounters } from "@/lib/commands/showSpineCounters";
import { showSwitchPort } from "@/lib/commands/showSwitchPort";
import { showDcbEts } from "@/lib/commands/showDcbEts";
import { showDcbPfc } from "@/lib/commands/showDcbPfc";
import { showInterfaceCounters } from "@/lib/commands/showInterfaceCounters";
import { showTopology } from "@/lib/commands/showTopology";
import { showRoce } from "@/lib/commands/showRoce";
import { runNcclTests } from "@/lib/commands/runNcclTests";
import { ETHTOOL_STATS_COMMAND, ETHTOOL_STATS_ETH3_COMMAND } from "@/lib/commandCatalog";
import { classifyCommand } from "@/lib/commandClassifier";
import { DEVICE_COMMANDS, isCommandAllowedOnDevice } from "@/lib/deviceCommandSets";
import { getCurrentHint } from "@/lib/labEngine";
import type { CommandResult, DeviceType, LabConfig, LabDevice } from "@/types";
import { useLabStore } from "@/store/labStore";

const LAB_CONFIGS: Record<string, LabConfig> = {
  [lab0.id]: lab0,
  [lab1.id]: lab1,
  [lab2.id]: lab2,
  [lab3.id]: lab3,
  [lab4.id]: lab4,
  [lab5.id]: lab5,
};

const LAB_DEVICES: Record<string, LabDevice[]> = {
  [lab0.id]: lab0Devices,
  [lab1.id]: lab1Devices,
  [lab2.id]: lab2Devices,
  [lab3.id]: lab3Devices,
  [lab4.id]: lab4Devices,
  [lab5.id]: lab5Devices,
};

const LAB_DEVICE_TYPES: Record<string, DeviceType[]> = {
  [lab0.id]: [...new Set(lab0Devices.map((device) => device.type))],
  [lab1.id]: [...new Set(lab1Devices.map((device) => device.type))],
  [lab2.id]: [...new Set(lab2Devices.map((device) => device.type))],
  [lab3.id]: [...new Set(lab3Devices.map((device) => device.type))],
  [lab4.id]: [...new Set(lab4Devices.map((device) => device.type))],
  [lab5.id]: [...new Set(lab5Devices.map((device) => device.type))],
};

function showActiveLeafSwitchPort(): CommandResult {
  const activeId = useLabStore.getState().activeDeviceId ?? "";
  const railId = activeId.startsWith("leaf-rail") ? activeId.replace("leaf-rail", "") : "0";
  return showSwitchPort(`rail${railId}`);
}

const EXACT_HANDLERS: Record<string, () => CommandResult> = {
  ibstat: ibstat,
  "show proposal a": showProposalA,
  "show proposal b": showProposalB,
  "show topology": showTopology,
  "show rdma links": showRdmaLinks,
  "show switch port rail0": () => showSwitchPort("rail0"),
  "show switch port rail1": () => showSwitchPort("rail1"),
  "show switch port rail2": () => showSwitchPort("rail2"),
  "show switch port rail3": () => showSwitchPort("rail3"),
  "show switch port rail4": () => showSwitchPort("rail4"),
  "show switch port rail5": () => showSwitchPort("rail5"),
  "show switch port rail6": () => showSwitchPort("rail6"),
  "show switch port rail7": () => showSwitchPort("rail7"),
  "show interface swp1": showActiveLeafSwitchPort,
  "show interface swp2": showActiveLeafSwitchPort,
  "show interface swp3": showActiveLeafSwitchPort,
  "show interface swp4": showActiveLeafSwitchPort,
  "show interface swp5": showActiveLeafSwitchPort,
  "show interface swp6": showActiveLeafSwitchPort,
  "show interface swp7": showActiveLeafSwitchPort,
  "show interface swp8": showActiveLeafSwitchPort,
  "show interface swp9": showActiveLeafSwitchPort,
  "show dcb pfc": showDcbPfc,
  "show dcb ets": showDcbEts,
  "show dcb load-balance": showDcbLoadBalance,
  "show ecmp load-balance": showDcbLoadBalance,
  "show interfaces ib status": () => ({
    output: `ERROR: 'show interfaces ib status' is an InfiniBand ONYX command.
This switch runs Cumulus Linux on a Spectrum-X SN5600 (Ethernet).

For Ethernet interface status on this switch, use:
  show interface counters    ← RoCEv2 fabric: packet counts, drops, PFC frames
  show switch port rail3     ← Per-port detail for a specific DGX connection

The 'show interfaces ib status' command runs on ONYX InfiniBand switches
(QM9700, QM8700) — not on Spectrum-X Ethernet switches.`,
    type: "error" as const,
  }),
  "show ib counters": () => ({
    output: `ERROR: 'show ib counters' is an InfiniBand ONYX command.
This switch runs Cumulus Linux on a Spectrum-X SN5600 (Ethernet).

For per-port counters on this switch, use:
  show interface counters    ← input/output packets, drops, buffer utilisation
  show switch port rail3     ← per-port link state and error detail`,
    type: "error" as const,
  }),
  "show nccl env": showNcclEnv,
  "show spine counters": showSpineCounters,
  "show interface counters": showInterfaceCounters,
  [ETHTOOL_STATS_COMMAND]: ethtoolStats,
  [ETHTOOL_STATS_ETH3_COMMAND]: ethtoolStatsEth3,
  "nccl-debug --transport": ncclDebugTransport,
  "rdma link show": rdmaLinkShow,
  "run nccl-tests": runNcclTests,
  "calculate oversubscription a": calculateOversubscriptionA,
  "calculate oversubscription b": calculateOversubscriptionB,
  "compare proposals": compareProposals,
  "recommend proposal a": recommendProposalA,
  "recommend proposal b": recommendProposalB,
  "recommend proposal": () => ({
    output: "Specify which proposal: 'recommend proposal a' or 'recommend proposal b'",
    type: "info" as const,
  }),
  "show roce": showRoce,
  "disable pfc": () => runMutation("disable pfc"),
  "enable pfc": () => runMutation("enable pfc"),
  "enable ecn": () => runMutation("enable ecn"),
  "enable load-balance per-packet": () => runMutation("enable load-balance per-packet"),
  "disable ecn": () => runMutation("disable ecn"),
  "set nccl ib-hca": () => runMutation("set nccl ib-hca"),
  "set nccl ib-hca mlx5_0,mlx5_1,mlx5_2,mlx5_3,mlx5_4,mlx5_5,mlx5_6,mlx5_7": () =>
    runMutation("set nccl ib-hca mlx5_0,mlx5_1,mlx5_2,mlx5_3,mlx5_4,mlx5_5,mlx5_6,mlx5_7"),
  "set nccl socket-ifname": () => runMutation("set nccl socket-ifname"),
  "set nccl socket-ifname eno1": () => runMutation("set nccl socket-ifname eno1"),
  "clear counters": () => runMutation("clear counters"),
  ping: () => ({
    output: `ping: ICMP reachability is not the diagnostic tool here.

RDMA performance depends on the fabric-layer protocol stack, not ICMP.
A healthy ping tells you Layer 3 routing works. It tells you nothing about:
  - Whether RDMA QPs are establishing correctly
  - Whether PFC is protecting against packet drops
  - Whether NCCL is using RDMA or TCP socket transport

Useful commands on this device: type 'help' to see what's available.`,
    type: "info" as const,
  }),
  "ip a": () => ({
    output: `ip a    ← use 'rdma link show' for RDMA interface state

For RDMA diagnostics, the relevant commands are:
  rdma link show    — shows mlx5_0 through mlx5_7 state and RoCEv2 mode
  ibstat            — shows per-NIC state, GUID, link layer
  ethtool -S eth0   — shows per-NIC statistics (PFC pauses, ECN marks, drops)

'ip a' shows kernel network interfaces, but RDMA state is tracked separately
by the RDMA subsystem. A NIC can show 'UP' in ip link output while its
RDMA queue pairs are in error state.`,
    type: "info" as const,
  }),
  "ip addr": () => ({
    output: `ip addr    ← use 'rdma link show' for RDMA interface state

For RDMA diagnostics, the relevant commands are:
  rdma link show    — shows mlx5_0 through mlx5_7 state and RoCEv2 mode
  ibstat            — shows per-NIC state, GUID, link layer
  ethtool -S eth0   — shows per-NIC statistics (PFC pauses, ECN marks, drops)

'ip addr' shows kernel network interfaces, but RDMA state is tracked separately
by the RDMA subsystem. A NIC can show 'UP' in ip addr output while its
RDMA queue pairs are in error state.`,
    type: "info" as const,
  }),
  "ip link": () => ({
    output: `ip link    ← use 'rdma link show' for RDMA interface state

eth0 through eth7: ConnectX-7 RoCEv2 interfaces (one per GPU rail)
eno1:              Management ethernet (1GbE, for SSH access)

For fabric diagnostics, use RDMA-aware tools:
  rdma link show    — RDMA subsystem state per interface
  ibstat            — per-NIC hardware state
  ethtool -S eth0   — NIC driver statistics`,
    type: "info" as const,
  }),
  "ip link show": () => ({
    output: `ip link    ← use 'rdma link show' for RDMA interface state

eth0 through eth7: ConnectX-7 RoCEv2 interfaces (one per GPU rail)
eno1:              Management ethernet (1GbE, for SSH access)

For fabric diagnostics, use RDMA-aware tools:
  rdma link show    — RDMA subsystem state per interface
  ibstat            — per-NIC hardware state
  ethtool -S eth0   — NIC driver statistics`,
    type: "info" as const,
  }),
  export: () => ({
    output: `export: environment variables are set in the job launcher, not the CLI.

In this simulator, NCCL environment variables are inspected and changed
using simulator commands:
  show nccl env                      — view current NCCL env vars
  set nccl ib-hca <devices>          — set NCCL_IB_HCA
  set nccl socket-ifname <iface>     — set NCCL_SOCKET_IFNAME

In production, you would use:
  export NCCL_IB_HCA=mlx5_0:1,mlx5_1:1,...
  export NCCL_SOCKET_IFNAME=eno1
before relaunching your training job or Slurm submission script.`,
    type: "info" as const,
  }),
  hint: () => runMutation("hint"),
};

export function handleCommand(
  input: string,
  deviceId?: string,
  deviceType?: DeviceType,
): string {
  void deviceId;
  const effectiveDeviceType = deviceType ?? "leaf-switch";
  const normalizedInput = input.trim().toLowerCase();
  if (!isCommandAllowedOnDevice(normalizedInput, effectiveDeviceType)) {
    const activeLabId = useLabStore.getState().lab.labId;
    const candidateDeviceTypes = activeLabId
      ? LAB_DEVICE_TYPES[activeLabId] ?? []
      : (["dgx", "leaf-switch", "spine-switch", "ufm-server"] as DeviceType[]);
    const availableOn = candidateDeviceTypes.filter(
      (type) =>
        type !== effectiveDeviceType
        && isCommandAllowedOnDevice(normalizedInput, type),
    );
    if (availableOn.length > 0) {
      const deviceLabel: Record<DeviceType, string> = {
        dgx: "DGX host",
        "leaf-switch": "Leaf switch",
        "spine-switch": "Spine switch",
        "ufm-server": "UFM server",
      };
      return (
        `Command not available on this device (${deviceLabel[effectiveDeviceType]}).\n`
        + `Try: ${availableOn.map((type) => deviceLabel[type]).join(" or ")}`
      );
    }
  }

  const classification = classifyCommand(input);
  const store = useLabStore.getState();

  switch (classification.type) {
    case "near-miss":
      store.incrementNearMiss();
      return `Unknown command. Did you mean: ${classification.suggestion}?`;
    case "exploratory":
      return "Unknown arguments. Type 'help' to see available commands.";
    case "gibberish":
      store.incrementMistake();
      return `Command not found: ${input}`;
    case "exact":
      break;
  }

  if (classification.handler === "help") {
    const activeLabId = useLabStore.getState().lab.labId;
    const labDevices = activeLabId ? LAB_DEVICES[activeLabId] ?? [] : [];
    const currentDevice = deviceId
      ? labDevices.find((device) => device.id === deviceId)
      : undefined;
    const deviceCmds = currentDevice?.allowedCommands ?? DEVICE_COMMANDS[effectiveDeviceType] ?? [];

    return [
      "Available commands on this device:",
      ...deviceCmds.map((command) => `  ${command}`),
    ].join("\n");
  }

  const handler = classification.handler === "show interface counters" && effectiveDeviceType === "spine-switch"
    ? showSpineCounters
    : classification.handler
      ? EXACT_HANDLERS[classification.handler]
      : undefined;

  if (!handler) {
    return `Command not found: ${input}`;
  }

  const result = handler();
  const updatedStore = useLabStore.getState();

  if (result.conceptId) {
    updatedStore.setActiveConceptId(result.conceptId);
  }

  const activeLab = updatedStore.lab.labId
    ? LAB_CONFIGS[updatedStore.lab.labId]
    : undefined;

  let finalOutput = result.output;

  if (activeLab && normalizedInput !== "hint") {
    const hint = getCurrentHint(useLabStore.getState().lab, activeLab);

    if (hint) {
      useLabStore.getState().useHint(hint.level);
      finalOutput = `${finalOutput}\n[HINT] ${hint.text}`;
    }
  }

  return finalOutput;
}

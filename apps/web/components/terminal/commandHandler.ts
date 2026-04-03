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
import { calculateOversubscriptionA, calculateOversubscriptionB } from "@/lib/commands/calculateOversubscription";
import { compareProposals } from "@/lib/commands/compareProposals";
import { ibstat } from "@/lib/commands/ibstat";
import { ethtoolStats, ethtoolStatsEth3 } from "@/lib/commands/ethtoolStats";
import { ethtoolStatsPauseStorm, showInterfaceCountersPauseStorm } from "@/lib/commands/lab7Handlers";
import {
  ethtoolStatsPriorityMismatch,
  showDcbPfcWithPriority,
  showRocePriorityMismatch,
} from "@/lib/commands/lab8Handlers";
import { ethtoolStatsEth2, noShutdown, replaceOpticRail2 } from "@/lib/commands/lab9Handlers";
import {
  ping6Spine02,
  ping6Spine03,
  ping6StorageSid,
  showInterfaceCountersSpine01,
  showIpPolicy,
  showIpRouteVrfStorage,
  showIsisNeighbor,
  showIsisSrv6Node,
  showMtu,
  showRouteMapSteerCheckpoint,
  showSegmentRoutingSrv6Sid,
  showSegmentRoutingSrv6SidStorage,
  showSrtePolicy,
  showSrteSegmentList,
  showSrv6PacketsSpine01,
  showTopologyLab14,
  tcpdumpSrhSwp1Spine01,
  tcpdumpSrhSwp1Spine02,
  traceroute6CheckpointDscp10,
  traceroute6NcclDscp26,
} from "@/lib/commands/lab14Handlers";
import {
  ibvDevInfoGid,
  ibvDevInfoTenantB,
  ibvRcPingpong,
  nvShowInterfaceSwp1Qos,
  setPkeyTenantA,
  setPkeyTenantB,
  showGidFilter,
  showGvmiTable,
  showMrInfo,
  showMrInfoAfter,
  showQosTrustDscpMap,
  showUfmEvents as showUfmEventsLab15,
  showUfmPkeyTable,
} from "@/lib/commands/lab15Handlers";
import {
  handleClNetstat,
  handleClPlatformInfo,
  handleDecodeSyseepromLeaf01,
  handleDecodeSyseepromStorage,
  handleIpLinkShowMtuLeaf01,
  handleNvShowInterfaceLeaf01,
  handleNvShowInterfaceLeaf02,
  handleNvShowInterfaceStorage,
  handleNvShowRouterBgp,
  handleNvVersion,
  handleSubmitAuditReport,
} from "@/lib/commands/lab16Handlers";
import {
  handleClResourceQuery,
  handleEthtoolMlx5Grep,
  handleEthtoolSwp1Ecn,
  handleIbvDevinfo,
  handleIbvRcPingpong,
  handleIbWriteBw,
  handleIbWriteLat,
  handleIpLinkShow,
  handleNvConfigApply,
  handleNvConfigSave,
  handleNvSetRoce,
  handleNvShowInterfaceCountersPfc,
  handleNvShowInterfaceQos,
  handleNvShowQosEcnProfile,
  handleNvShowQosPfc,
  handleNvShowQosRoce,
  handleNvShowQosScheduler,
  handleNvShowQosTrustDscpMap,
} from "@/lib/commands/lab17Handlers";
import {
  handleLab18ClResourceQuery,
  handleLab18ConfigApply,
  handleLab18EthtoolSwp1Ecn,
  handleLab18IbWriteBwMulti,
  handleLab18SetEcnMax,
  handleLab18SetEcnMin,
  handleLab18ShowEcnProfile,
  handleLab18ShowInterfaceCounters,
} from "@/lib/commands/lab18Handlers";
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
import {
  ETHTOOL_STATS_COMMAND,
  ETHTOOL_STATS_ETH2_COMMAND,
  ETHTOOL_STATS_ETH3_COMMAND,
  ETHTOOL_STATS_ETH5_COMMAND,
} from "@/lib/commandCatalog";
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

const LAB_DEVICES: Record<string, LabDevice[]> = {
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

const LAB_DEVICE_TYPES: Record<string, DeviceType[]> = {
  [lab0.id]: [...new Set(lab0Devices.map((device) => device.type))],
  [lab1.id]: [...new Set(lab1Devices.map((device) => device.type))],
  [lab2.id]: [...new Set(lab2Devices.map((device) => device.type))],
  [lab3.id]: [...new Set(lab3Devices.map((device) => device.type))],
  [lab4.id]: [...new Set(lab4Devices.map((device) => device.type))],
  [lab5.id]: [...new Set(lab5Devices.map((device) => device.type))],
  [lab6.id]: ["dgx", "leaf-switch", "ufm-server"],
  [lab7.id]: [...new Set(lab7Devices.map((device) => device.type))],
  [lab8.id]: [...new Set(lab8Devices.map((device) => device.type))],
  [lab9.id]: [...new Set(lab9Devices.map((device) => device.type))],
  [lab10.id]: [...new Set(lab10Devices.map((device) => device.type))],
  [lab11.id]: [...new Set(lab11Devices.map((device) => device.type))],
  [lab14.id]: [...new Set(lab14Devices.map((device) => device.type))],
  [lab15.id]: [...new Set(lab15Devices.map((device) => device.type))],
  [lab16.id]: [...new Set(lab16Devices.map((device) => device.type))],
  [lab17.id]: [...new Set(lab17Devices.map((device) => device.type))],
  [lab18.id]: [...new Set(lab18Devices.map((device) => device.type))],
};

const LAB_CHAPTER_LINKS: Record<string, { slug: string; label: string }> = {
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
  [lab17.id]: { slug: "ch25-roce-configuration-operations", label: "Chapter 25: RoCE Configuration and Operations on Spectrum-X" },
  [lab18.id]: { slug: "ch25-roce-configuration-operations", label: "Chapter 25: RoCE Configuration and Operations on Spectrum-X" },
};

function showActiveLeafSwitchPort(): CommandResult {
  const activeId = useLabStore.getState().activeDeviceId ?? "";
  const railId = activeId.startsWith("leaf-rail") ? activeId.replace("leaf-rail", "") : "0";
  return showSwitchPort(`rail${railId}`);
}

function showDcbPfcByLab(): CommandResult {
  const labId = useLabStore.getState().lab.labId;
  if (labId === lab8.id) {
    return showDcbPfcWithPriority();
  }
  return showDcbPfc();
}

function showRoceByLab(): CommandResult {
  const labId = useLabStore.getState().lab.labId;
  if (labId === lab8.id) {
    return showRocePriorityMismatch();
  }
  return showRoce();
}

function showSegmentRoutingSrv6SidByDevice(): CommandResult {
  const activeDeviceId = useLabStore.getState().activeDeviceId;
  return activeDeviceId === "leaf-storage"
    ? showSegmentRoutingSrv6SidStorage()
    : showSegmentRoutingSrv6Sid();
}

function showSrv6PacketsByDevice(): CommandResult {
  return showSrv6PacketsSpine01();
}

function tcpdumpSrhByDevice(): CommandResult {
  const activeDeviceId = useLabStore.getState().activeDeviceId;
  return activeDeviceId === "spine-02"
    ? tcpdumpSrhSwp1Spine02()
    : tcpdumpSrhSwp1Spine01();
}

function showUfmEventsByLab(): CommandResult {
  return useLabStore.getState().lab.labId === lab15.id
    ? showUfmEventsLab15()
    : showUfmEvents();
}

function showQosEcnProfileByLab(): CommandResult {
  return useLabStore.getState().lab.labId === lab18.id
    ? handleLab18ShowEcnProfile()
    : handleNvShowQosEcnProfile();
}

function showClResourceQueryByLab(): CommandResult {
  return useLabStore.getState().lab.labId === lab18.id
    ? handleLab18ClResourceQuery()
    : handleClResourceQuery();
}

function showEthtoolSwp1EcnByLab(): CommandResult {
  return useLabStore.getState().lab.labId === lab18.id
    ? handleLab18EthtoolSwp1Ecn()
    : handleEthtoolSwp1Ecn();
}

function showNvInterfaceByDevice(): CommandResult {
  const activeDeviceId = useLabStore.getState().activeDeviceId;
  if (activeDeviceId === "leaf-02") {
    return handleNvShowInterfaceLeaf02();
  }
  if (activeDeviceId === "storage-01") {
    return handleNvShowInterfaceStorage();
  }
  return handleNvShowInterfaceLeaf01();
}

function decodeSyseepromByDevice(): CommandResult {
  return useLabStore.getState().activeDeviceId === "storage-01"
    ? handleDecodeSyseepromStorage()
    : handleDecodeSyseepromLeaf01();
}

function showIpLinkByLabAndDevice(): CommandResult {
  const store = useLabStore.getState();
  if (store.lab.labId === lab16.id && store.activeDeviceId === "leaf-01") {
    return handleIpLinkShowMtuLeaf01();
  }

  return {
    output: `ip link    ← use 'rdma link show' for RDMA interface state

eth0 through eth7: ConnectX-7 RoCEv2 interfaces (one per GPU rail)
eno1:              Management ethernet (1GbE, for SSH access)

For fabric diagnostics, use RDMA-aware tools:
  rdma link show    — RDMA subsystem state per interface
  ibstat            — per-NIC hardware state
  ethtool -S eth0   — NIC driver statistics`,
    type: "info" as const,
  };
}

function ethtoolStatsByLab(): CommandResult {
  const store = useLabStore.getState();
  const labId = store.lab.labId;
  const pauseStorm = (store.topology as any).pauseStorm;

  if (labId === lab7.id || pauseStorm) {
    return ethtoolStatsPauseStorm();
  }
  if (labId === lab8.id) {
    return ethtoolStatsPriorityMismatch();
  }
  return ethtoolStats();
}

export function showUfmPorts(): CommandResult {
  useLabStore.getState().setCondition("ufmPortsChecked", true);
  useLabStore.getState().verifyCondition("ufmPortsChecked");

  return {
    output: `UFM Port Counter Summary — all cluster ports  (polled at 14:22:07 UTC)

LEGEND: SER = SymbolErrorRate (errors/sec),  PFC = PFC pause frames rx,  LFR = LinkFlap

Rail  Port        Device A          SER-A    Rail  Port        Device B          SER-B    PFC-A   PFC-B   LFR
----  ----------  ----------------  -------  ----  ----------  ----------------  -------  ------  ------  ---
0     swp2        leaf-rail0        0        0     mlx5_0      DGX-Node-A        0        0       0       0
1     swp2        leaf-rail1        0        1     mlx5_1      DGX-Node-A        0        0       0       0
2     swp2        leaf-rail2        0        2     mlx5_2      DGX-Node-A        0        0       0       0
3     swp2        leaf-rail3        0        3     mlx5_3      DGX-Node-A        0        0       0       0
4     swp2        leaf-rail4        0        4     mlx5_4      DGX-Node-A        0        0       0       0
5     swp7        leaf-rail5        1,847 ▲  5     mlx5_5      DGX-Node-A        1,831 ▲  14      11      0
6     swp2        leaf-rail6        0        6     mlx5_6      DGX-Node-A        0        0       0       0
7     swp2        leaf-rail7        0        7     mlx5_7      DGX-Node-A        0        0       0       0

▲ = trending up over last 15 minutes (3 consecutive samples)

Summary: 1 port pair with non-zero SymbolErrorRate — Rail 5 (leaf-rail5 swp7 ↔ DGX mlx5_5).
         No ports Err-Disabled. No LFR events. Port state: Active on both ends.`,
    type: "success",
    conceptId: "ufm-port-counters",
  };
}

export function showUfmAlarms(): CommandResult {
  return {
    output: `UFM Active Alarms  (14:22:11 UTC)

Severity  Time          Port              Alarm
--------  ------------  ----------------  ----------------------------------------
WARNING   14:07:33 UTC  leaf-rail5 swp7   SymbolErrorRate > 500/sec threshold
WARNING   14:07:34 UTC  DGX mlx5_5 p1    SymbolErrorRate > 500/sec threshold

No CRITICAL alarms. No port down events.

Note: Threshold for WARNING is 500 errors/sec.
      Threshold for link-down/Err-Disable is not reached (port remains Active).
      Both ends of the same physical link are reporting — consistent with
      a physical layer issue between the two endpoints.`,
    type: "success",
    conceptId: "ufm-port-counters",
  };
}

export function showUfmEvents(): CommandResult {
  return {
    output: `UFM Event Log  (last 30 minutes, filtered to WARNING+)

14:07:33  WARNING  leaf-rail5 swp7   SymbolErrorRate rising — 847/sec
14:07:34  WARNING  DGX mlx5_5 p1    SymbolErrorRate rising — 831/sec
14:09:02  WARNING  leaf-rail5 swp7   SymbolErrorRate — 1,204/sec
14:09:03  WARNING  DGX mlx5_5 p1    SymbolErrorRate — 1,188/sec
14:15:44  WARNING  leaf-rail5 swp7   SymbolErrorRate — 1,612/sec
14:15:45  WARNING  DGX mlx5_5 p1    SymbolErrorRate — 1,599/sec
14:22:07  WARNING  leaf-rail5 swp7   SymbolErrorRate — 1,847/sec (latest poll)
14:22:08  WARNING  DGX mlx5_5 p1    SymbolErrorRate — 1,831/sec (latest poll)

Pattern: both ends of the same link, rising monotonically, both sides diverge by <1%.
No link-down events. No LID reassignment. Subnet Manager reports topology unchanged.

Onset: ~14:07 UTC. ML engineer reported slowness at ~14:10 UTC (3 min lag).`,
    type: "success",
    conceptId: "ufm-port-counters",
  };
}

export function showUfmPortDetail(): CommandResult {
  useLabStore.getState().setCondition("offendingPortIdentified", true);
  useLabStore.getState().verifyCondition("offendingPortIdentified");

  return {
    output: `UFM Port Detail — leaf-rail5 swp7  (14:22:15 UTC)

Physical link:    leaf-rail5 swp7  ↔  DGX-Node-A mlx5_5 port 1
Cable type:       DAC (Direct Attach Copper) 1m
Link speed:       400G / NDR
Link state:       Active (both ends)
FEC mode:         RS-FEC (enabled)

Counter snapshots (polled every 60s):
  Timestamp       SymbolErrors  Pre-FEC BER      Post-FEC BER   rx_pfc_pause
  13:52:07        0             1.2e-15           0              0
  13:52:07        0             1.1e-15           0              0
  14:07:33        847           3.4e-12  ▲        0 (FEC hiding) 2
  14:09:02        1,204         5.1e-12  ▲        0 (FEC hiding) 6
  14:15:44        1,612         7.3e-12  ▲        0 (FEC hiding) 11
  14:22:07        1,847         8.9e-12  ▲        0 (FEC hiding) 14

Diagnosis cues:
  - Pre-FEC BER rising 4 orders of magnitude from baseline
  - Post-FEC BER still 0 — RS-FEC is correcting errors, hiding them from RDMA layer
  - BUT: FEC correction adds latency jitter (~100–200ns per hop with high BER)
  - PFC pause frames appearing: NIC is pausing transmission to avoid drops
  - Result: intermittent AllReduce barrier elongation without visible drops
  - Consistent with: marginal connector / dirty fibre / bad DAC end

UFM recommendation: inspect physical connector at leaf-rail5 swp7.`,
    type: "success",
    conceptId: "ufm-port-counters",
  };
}

export function showUfmTopology(): CommandResult {
  return {
    output: `UFM Fabric Topology  (14:22:20 UTC)

Nodes: 16 DGX H100 nodes, 8 leaf switches (Rail 0–7), 32 spine switches
Links: 128 DGX↔leaf links, 256 leaf↔spine uplinks
State: 383/384 links Active, 1 link Degraded (SymbolErrors)

Degraded link:  leaf-rail5 swp7 ↔ DGX-Node-A mlx5_5
                Port Active, errors rising — see 'show ufm port leaf-rail5 swp7'`,
    type: "info",
  };
}

export function showDcgmGpu5(): CommandResult {
  useLabStore.getState().setCondition("dcgmCorrelated", true);
  useLabStore.getState().verifyCondition("dcgmCorrelated");

  return {
    output: `DCGM GPU-5 Metrics  (DGX-Node-A · mlx5_5 rail · 14:22:19 UTC)

GPU:                    GPU-5 (H100 SXM5, slot 5)
NIC rail:               mlx5_5 — Rail 5

Compute metrics:
  GPU utilisation:      91%  (baseline: 97%)  ← 6% below baseline
  SM active:            89%
  HBM bandwidth:        2.8 TB/s  (normal for this model)
  Power draw:           680 W  (normal)
  Temperature:          71°C  (normal)
  ECC errors:           0

AllReduce / communication metrics:
  AllReduce barrier duration (p99):  11.3 ms  ← baseline was 7.8 ms (+45%)
  NVLink bandwidth utilisation:      62%  (normal — intra-node)
  RDMA tx bandwidth (eth5):         28.4 GB/s
  RDMA rx bandwidth (eth5):         21.7 GB/s  ← lower than peers (avg 31 GB/s)

NIC-side (mlx5_5):
  rx_pfc_pause_frames:      14 in last 60s  ← non-zero, rising
  tx_pfc_pause_frames:      0
  symbol_errors:            1,831 (matches UFM counter)

Observation: GPU-5 compute utilisation drop + AllReduce barrier elongation
             align with onset of SymbolErrors at 14:07 UTC.
             GPU-5 is waiting at the AllReduce barrier more than its peers —
             it is the straggler dragging the whole job.`,
    type: "success",
    conceptId: "dcgm-metrics",
  };
}

export function showDcgmAll(): CommandResult {
  return {
    output: `DCGM All-GPU Summary  (DGX-Node-A · 14:22:22 UTC)

GPU   Util%  Barrier p99   rx_PFC_pauses   SymbolErrors(NIC)  Status
---   -----  -----------   -------------   -----------------  ------
0     97%    7.7 ms        0               0                  Normal
1     97%    7.8 ms        0               0                  Normal
2     97%    7.9 ms        0               0                  Normal
3     96%    8.0 ms        0               0                  Normal
4     97%    7.8 ms        0               0                  Normal
5     91%    11.3 ms  ▲    14  ▲           1,831  ▲           DEGRADED
6     97%    7.8 ms        0               0                  Normal
7     97%    7.7 ms        0               0                  Normal

GPU-5 is the straggler. All other GPUs waiting for GPU-5 at each AllReduce barrier.
With 8 GPUs per node, 1 straggler causes the whole node to run at ~91% efficiency.`,
    type: "success",
    conceptId: "dcgm-metrics",
  };
}

export function showPfcPauseStats(): CommandResult {
  useLabStore.getState().setCondition("timestampsCorrelated", true);
  useLabStore.getState().verifyCondition("timestampsCorrelated");

  return {
    output: `leaf-rail5 # show pfc pause-stats

Interface  Priority  rx_pause_frames  tx_pause_frames  last_pause_timestamp
---------  --------  ---------------  ---------------  --------------------
swp2       3         0                0                —
swp3       3         0                0                —
swp4       3         0                0                —
swp5       3         0                0                —
swp6       3         0                0                —
swp7       3         14               0                2026-03-26 14:22:06 UTC  ← active
swp8       3         0                0                —
...        ...       ...              ...              ...

swp7 is the only port receiving PFC pause frames (priority 3 = RoCEv2 traffic class).
Onset matches UFM alarm at 14:07:33 UTC.

PFC pause frames received = the DGX NIC is pausing the switch's transmission.
This is the expected response to rising BER — the NIC is trying to prevent drops.
But each pause adds ~microseconds of idle time to an otherwise active link.`,
    type: "success",
    conceptId: "pfc-mechanics",
  };
}

export function showInterfaceSwp7(): CommandResult {
  return {
    output: `leaf-rail5 # show interface swp7

Interface swp7
  Link: Active  Speed: 400G  MTU: 9216
  Connected to: DGX-Node-A eth5 (mlx5_5)

  RX:
    rx_bytes:             2,841,203,944,112
    rx_packets:           2,102,948,211
    rx_errors:            0               ← MAC-level errors: 0 (FEC correcting)
    rx_discards:          0
    rx_pfc_pause_frames:  14              ← non-zero: pause storms from DGX NIC

  TX:
    tx_bytes:             2,198,403,112,009
    tx_packets:           1,897,223,104
    tx_errors:            0
    tx_discards:          0

  FEC:
    fec_mode:             RS-FEC (enabled)
    pre_fec_ber:          8.9e-12         ← elevated 4 orders of magnitude
    post_fec_ber:         0.0             ← FEC correcting all errors
    corrected_symbols:    1,847           ← symbol errors being fixed by FEC

  Physical:
    transceiver_type:     DAC (1m)
    tx_power_dBm:         —  (DAC: passive, no optics)
    connector_status:     seated (self-reported — may not detect marginal contact)`,
    type: "success",
  };
}

export function ethtoolStatsEth5(): CommandResult {
  return {
    output: `dgx-node-a:~$ ethtool -S eth5

NIC Statistics for eth5 (mlx5_5):
     rx_packets: 1897223104
     tx_packets: 2102948211
     rx_bytes: 2198403112009
     tx_bytes: 2841203944112
     rx_prio3_pause: 14                  ← PFC pauses on RDMA priority class
     tx_prio3_pause: 0
     rx_pfc_duration_us: 1,247           ← total microseconds paused this session
     rx_symbol_errors: 1831              ← rising
     rx_corrected_bits: 14648            ← FEC active, fixing errors
     rx_ecn_marked_pkts: 0
     tx_discards_phy: 0
     rx_out_of_buffer: 0`,
    type: "success",
  };
}

export function reseatConnector(): CommandResult {
  useLabStore.getState().setCondition("rootCauseLayerIdentified", true);
  useLabStore.getState().verifyCondition("rootCauseLayerIdentified");
  useLabStore.getState().setCondition("remediationIssued", true);
  useLabStore.getState().verifyCondition("remediationIssued");

  return {
    output: `ufm-server $ reseat connector leaf-rail5 swp7

[SIM] Maintenance action recorded: reseat DAC connector on leaf-rail5 swp7.

In production:
  1. Notify ML team: brief link interruption (~2–5 seconds) on Rail 5
  2. Physically reseat the DAC cable at leaf-rail5 swp7 (and/or DGX end)
  3. Clean connector with IPA if contaminated
  4. Monitor UFM for 5 minutes: SymbolErrorRate should return to 0
  5. If errors persist after reseat → replace DAC cable

Post-reseat simulation (60s later):
  UFM leaf-rail5 swp7:  SymbolErrorRate = 0  ✓
  UFM DGX mlx5_5 p1:    SymbolErrorRate = 0  ✓
  DCGM GPU-5:           AllReduce barrier p99 = 7.9 ms  ✓ (restored)
  GPU-5 utilisation:    97%  ✓
  rx_pfc_pause_frames:  0  ✓

Root cause confirmed: marginal DAC connector contact causing BER elevation.
FEC was correcting all errors (post-FEC BER = 0) but at the cost of:
  - FEC latency jitter (~100–200 ns/hop)
  - Intermittent PFC pause frames
  - AllReduce barrier elongation (+45%)
  - 12% training throughput loss — with no hard errors visible anywhere.

Lab complete. This is the hardest class of fabric problem: the link is
"Active" at every layer, but degraded physics are visible only through
correlated multi-layer monitoring.`,
    type: "success",
  };
}

function markCondition(key: string): void {
  const store = useLabStore.getState();
  store.setCondition(key, true);
  store.verifyCondition(key);
}

function showTopologyByLab(): CommandResult {
  const store = useLabStore.getState();
  if (store.lab.labId === lab14.id) {
    return showTopologyLab14();
  }
  if (store.lab.labId === lab11.id && store.activeDeviceId === "workstation") {
    markCondition("failureScopeChecked");
    return {
      output: `Fabric topology - detected issues
====================================
Leaf1  <-> SpineA (ASN 65001): UP    400G
Leaf1  <-> SpineB (ASN 65002): UP    400G
SpineA <-> Leaf2:              DOWN  <- link failure (detected 22 min ago)
SpineB <-> Leaf2:              UP    400G  utilisation: 89%

NOTE: SpineA ASN = 65001, SpineB ASN = 65002
      Best practice: all spines should share one ASN (e.g. 65000)`,
      type: "success",
    };
  }
  return showTopology();
}

function showInterfaceCountersByLab(): CommandResult {
  const store = useLabStore.getState();
  const labId = store.lab.labId;
  const activeDeviceId = store.activeDeviceId;

  if (labId === lab14.id && activeDeviceId === "spine-01") {
    return showInterfaceCountersSpine01();
  }

  if (labId === lab7.id || (store.topology as any).pauseStorm) {
    return showInterfaceCountersPauseStorm();
  }

  if (labId === lab10.id && activeDeviceId === "spineB") {
    markCondition("ecmpImbalanceIdentified");
    return {
      output: `SpineB interface utilisation
Interface    Peer       Bandwidth  TX Util  RX Util  State
-----------  ---------  ---------  -------  -------  -----
eth0         Leaf1      400G       78.2%    61.3%    UP
eth1         Leaf2      400G       77.9%    60.8%    UP
eth2         Leaf3      400G       79.1%    61.5%    UP
eth4         Leaf4      400G       93.4%    89.2%    UP    <- near congestion
eth5         Leaf4      400G       94.1%    91.0%    UP    <- near congestion
eth6         Leaf4      400G       92.8%    88.6%    UP    <- near congestion
eth7         Leaf4      400G       DOWN     DOWN     DOWN  <- failed link

Total capacity to Leaf4: 3 x 400G = 1200G
Traffic arriving for Leaf4: 4 x 25% x line-rate ~= 100% of 1600G = 1600G
Overload: 1600G received, 1200G capacity -> 33% dropped or PFC-paused`,
      type: "success",
    };
  }

  if (lab11.id === labId && activeDeviceId === "spineB") {
    return {
      output: `SpineB interface utilisation
Interface    Peer       Bandwidth  TX Util  RX Util  State
-----------  ---------  ---------  -------  -------  -----
eth0         Leaf1      400G       58.2%    52.1%    UP
eth1         Leaf3      400G       57.8%    51.8%    UP
eth2         Leaf4      400G       59.1%    52.4%    UP
eth3         SpineA     400G       31.4%    29.8%    UP   <- cross-spine traffic
eth4         Leaf2      400G       88.9%    85.3%    UP   <- overloaded

SpineB -> Leaf2 is handling both:
  - Normal Leaf1 -> SpineB -> Leaf2 traffic (expected: ~44%)
  - Suboptimal Leaf1 -> SpineA -> SpineB -> Leaf2 traffic (extra: ~44%)
  Total: ~89% - congestion threshold approaching`,
      type: "success",
    };
  }

  return showInterfaceCounters();
}

function showFabricHealth(): CommandResult {
  markCondition("fabricHealthChecked");
  return {
    output: `Fabric health summary
=====================
Spines online:    4/4
Leaf links up:    48/48
Spine-leaf links: 127/128   <- 1 link DOWN
Congestion alerts: 1

ALERT: SpineB -> Leaf4 link utilisation: 112% (congested)
       ECMP mode: equal-weight (weighted ECMP not active)
       Recommend: check BGP Link Bandwidth Community configuration`,
    type: "success",
  };
}

function showBgpSummary(): CommandResult {
  return {
    output: `BGP router identifier 10.1.1.1, local AS 65001
Neighbor        V    AS      MsgRcvd  MsgSent  Up/Down   State/PfxRcd
10.0.0.1 SpineA  4  65000   28471    14230    5d02h     Active  128
10.0.0.2 SpineB  4  65000   28102    14108    5d02h     Active  128
10.0.0.3 SpineC  4  65000   28543    14251    5d02h     Active  128
10.0.0.4 SpineD  4  65000   28397    14189    5d02h     Active  128`,
    type: "success",
  };
}

function showBgpRouteLeaf4(): CommandResult {
  markCondition("ecmpImbalanceIdentified");
  return {
    output: `BGP routing table entry for 10.4.0.0/16 (Leaf4 subnet)
Paths: 4 available
  Path 1: via SpineA (10.0.0.1), weight 1  <- equal weight
  Path 2: via SpineB (10.0.0.2), weight 1  <- equal weight - but SpineB has only 3/4 links!
  Path 3: via SpineC (10.0.0.3), weight 1  <- equal weight
  Path 4: via SpineD (10.0.0.4), weight 1  <- equal weight

BGP Link Bandwidth Community: NOT PRESENT on any path
Weighted ECMP: DISABLED (no bandwidth community received)

ECMP bucket distribution: 25% / 25% / 25% / 25% (equal)
                          SpineB should be ~19% based on actual capacity`,
    type: "success",
  };
}

function showBgpRouteLeaf4Detail(): CommandResult {
  markCondition("weightedEcmpVerified");
  return {
    output: `BGP routing table entry for 10.4.0.0/16 (Leaf4 subnet)
Paths: 4 available

  Path 1: via SpineA (10.0.0.1)
    Link-Bandwidth Community: 1600 Mbps (4 links x 400G)
    Weight: 1600

  Path 2: via SpineB (10.0.0.2)
    Link-Bandwidth Community: 1200 Mbps (3 links x 400G - 1 link DOWN)
    Weight: 1200   <- reduced

  Path 3: via SpineC (10.0.0.3)
    Link-Bandwidth Community: 1600 Mbps (4 links x 400G)
    Weight: 1600

  Path 4: via SpineD (10.0.0.4)
    Link-Bandwidth Community: 1600 Mbps (4 links x 400G)
    Weight: 1600

Weighted ECMP: ENABLED
Total weight: 6000
ECMP distribution:
  SpineA: 1600/6000 = 26.7%
  SpineB: 1200/6000 = 20.0%  <- correctly reduced
  SpineC: 1600/6000 = 26.7%
  SpineD: 1600/6000 = 26.7%`,
    type: "success",
  };
}

function showIpRouteLeaf4(): CommandResult {
  return {
    output: `Routing entry for 10.4.0.0/16
  Known via "bgp", distance 20, metric 0
  Last update 5d02h ago
  * 10.0.0.1, via eth0 (SpineA), weight 1/4
  * 10.0.0.2, via eth1 (SpineB), weight 1/4   <- overloaded spine, equal weight
  * 10.0.0.3, via eth2 (SpineC), weight 1/4
  * 10.0.0.4, via eth3 (SpineD), weight 1/4`,
    type: "success",
  };
}

function showBgpNeighborSpineBToLeaf1(): CommandResult {
  markCondition("bandwidthCommunityGapConfirmed");
  return {
    output: `BGP neighbor 10.0.0.1 (Leaf1)
  Remote AS: 65001, Remote BGP ID: 10.1.1.1
  BGP state: Established
  Capabilities advertised:
    Route Refresh
    4-byte ASN
    Extended Next Hop Encoding
    ADD-PATH send: all paths

BGP Link Bandwidth Extended Community: NOT CONFIGURED
  <- SpineB is not advertising its capacity to Leaf1
  <- Leaf1 has no basis for weighted ECMP`,
    type: "success",
  };
}

function showBgpLinkBandwidth(): CommandResult {
  markCondition("bandwidthCommunityGapConfirmed");
  return {
    output: `BGP Link Bandwidth Extended Community: NOT CONFIGURED
  Current capacity to Leaf4: 3 x 400G = 1200G
  Expected capacity (all links up): 4 x 400G = 1600G
  Capacity ratio: 0.75 (should advertise 1200 in Link Bandwidth community)

  To enable: set policy-options link-bandwidth-community 1200
             apply to bgp export policy for Leaf4 prefix advertisements`,
    type: "success",
  };
}

function setBgpLinkBandwidthCommunity(): CommandResult {
  markCondition("bandwidthCommunityConfigured");
  return {
    output: `Configuring BGP Link Bandwidth Extended Community
  Value: 1200 Mbps (representing 3 x 400G active links to Leaf4)

  This will be attached to all prefixes reachable via SpineB -> Leaf4.
  Leaf1 will receive bandwidth community 1200 for SpineB paths
  versus the default (1600) for Spines A, C, D.

  Applying to export policy... done.
  BGP updates will be sent to all iBGP peers momentarily.`,
    type: "success",
  };
}

function showInterfaceCountersAfter(): CommandResult {
  return {
    output: `SpineB interface utilisation (after fix)
Interface    Peer       Bandwidth  TX Util  RX Util  State
-----------  ---------  ---------  -------  -------  -----
eth0         Leaf1      400G       58.4%    51.2%    UP
eth1         Leaf2      400G       57.9%    50.8%    UP
eth2         Leaf3      400G       59.1%    51.5%    UP
eth4         Leaf4      400G       71.3%    68.2%    UP   <- within capacity
eth5         Leaf4      400G       72.1%    69.0%    UP   <- within capacity
eth6         Leaf4      400G       70.8%    67.6%    UP   <- within capacity
eth7         Leaf4      400G       DOWN     DOWN     DOWN <- still failed

SpineB -> Leaf4 total: 3 x ~71% of 400G = ~852G utilised / 1200G capacity = 71%
PFC pause counters: clearing (congestion resolved)`,
    type: "success",
  };
}

function showBgpRouteLeaf2ByDevice(): CommandResult {
  const store = useLabStore.getState();

  if (store.activeDeviceId === "spineA") {
    markCondition("sameAsnPrincipleIdentified");
    return {
      output: `BGP routing table entry for 10.2.0.0/16
Local ASN: 65001

  Path 1 (via direct - DOWN):
    AS-PATH: 65004
    Next-hop: Leaf2 direct
    State: WITHDRAWN (Leaf2 link down)

  Path 2 (via SpineB - ACTIVE):
    AS-PATH: 65002 65004
    Next-hop: SpineB (10.0.0.2)
    State: ACCEPTED <- SpineA accepts because 65001 is NOT in 65002 65004

SpineA is re-advertising this path to Leaf1 as:
  AS-PATH: 65001 65002 65004 (prepending own ASN 65001)

If SpineA had ASN 65000 (same as SpineB):
  Path 2 AS-PATH at SpineA: 65000 65004
  SpineA's own ASN (65000) appears in path -> REJECTED by loop prevention
  SpineA would NOT re-advertise -> Leaf1 would use only SpineB -> clean failover`,
      type: "success",
    };
  }

  markCondition("suboptimalPathSeen");
  return {
    output: `BGP routing table entry for 10.2.0.0/16 (Leaf2 subnet)
Paths: 2 available

  Path 1: via SpineB (10.0.0.2)
    AS-PATH: 65002 65004
    Next-hop: 10.0.0.2 (SpineB)
    Weight: 100 (best path - direct via SpineB)

  Path 2: via SpineA (10.0.0.1)
    AS-PATH: 65001 65002 65004   <- suboptimal: 3 ASNs in path
    Next-hop: 10.0.0.1 (SpineA)
    Weight: 100

SpineA is re-advertising Leaf2 via SpineB because their ASNs differ.
With same-ASN spines (65000), SpineA could NOT re-advertise this route
because its own ASN would appear twice in the path - loop prevention rejects it.

ECMP: Both paths installed. 50% of traffic via SpineA -> SpineB -> Leaf2
      (suboptimal 3-hop) + 50% via SpineB -> Leaf2 (optimal 2-hop).
      SpineB carries 150% of its normal traffic load.`,
    type: "success",
  };
}

function showBgpRouteLeaf2After(): CommandResult {
  markCondition("postFixPathVerified");
  return {
    output: `BGP routing table entry for 10.2.0.0/16 (Leaf2 subnet)
Paths: 1 available

  Path 1: via SpineB (10.0.0.2)
    AS-PATH: 65000 65004
    Next-hop: SpineB
    Weight: 100 (only valid path)

  Path 2: via SpineA (10.0.0.1) - REJECTED
    AS-PATH: 65000 65000 65004
    Loop detected: 65000 appears twice -> AS-PATH loop prevention active
    SpineA's re-advertisement correctly REJECTED.

Result: All Leaf2 traffic now routes exclusively via SpineB (optimal 2-hop).
SpineA -> Leaf2 link is down; service is correctly declared unreachable via SpineA.
Orchestrator may reassign GPUs connected via SpineA -> Leaf2 path.`,
    type: "success",
  };
}

function showIpRouteLeaf2(): CommandResult {
  return {
    output: `Routing entry for 10.2.0.0/16
  Known via "bgp", distance 20, metric 0
  * 10.0.0.1, via eth0 (SpineA), weight 1/2  <- suboptimal: routes via SpineB internally
  * 10.0.0.2, via eth1 (SpineB), weight 1/2  <- correct path`,
    type: "success",
  };
}

function showBgpNeighborsSpineAtoSpineB(): CommandResult {
  markCondition("sameAsnPrincipleIdentified");
  return {
    output: `BGP neighbor 10.0.0.2 (SpineB)
  Remote AS: 65002    <- different ASN than SpineA (65001)
  BGP state: Established

This cross-spine peering exists because spines have different ASNs.
With same ASN design, cross-spine peering is rejected (same-ASN iBGP
would be required, which is not typical in pure eBGP designs).`,
    type: "success",
  };
}

function setBgpLocalAsSpineA(): CommandResult {
  markCondition("spineAAsnUnified");
  return {
    output: `Changing local ASN from 65001 to 65000.

WARNING: This will reset all BGP sessions on this switch.
BGP sessions will re-establish within ~30 seconds.

ASN change applied.
Resetting BGP sessions...
Session with Leaf1 (65001): RESET -> re-establishing
Session with Leaf3 (65003): RESET -> re-establishing
Session with SpineB (65002): RESET - will fail (SpineB still has ASN 65002)

Note: SpineB must also be changed to ASN 65000 for full consistency.`,
    type: "success",
  };
}

function setBgpLocalAsSpineB(): CommandResult {
  markCondition("spineBAsnUnified");
  return {
    output: `Changing local ASN from 65002 to 65000.

BGP sessions resetting...
Session with Leaf1 (65001): re-establishing
Session with Leaf2 (65004): re-establishing

Cross-spine session (SpineA -> SpineB): will not re-establish.
  SpineA (65000) will reject peering with SpineB (65000) - same ASN = iBGP.
  This is correct: in eBGP same-ASN design, cross-spine peering is not needed.

Route convergence in ~15 seconds.`,
    type: "success",
  };
}

const EXACT_HANDLERS: Record<string, () => CommandResult> = {
  ibstat: ibstat,
  "show fabric health": showFabricHealth,
  "show bgp summary": showBgpSummary,
  "show bgp route 10.4.0.0/16": showBgpRouteLeaf4,
  "show bgp route 10.4.0.0/16 detail": showBgpRouteLeaf4Detail,
  "show bgp route 10.2.0.0/16": showBgpRouteLeaf2ByDevice,
  "show bgp route 10.2.0.0/16 after": showBgpRouteLeaf2After,
  "show ip route 10.4.0.0/16": showIpRouteLeaf4,
  "show ip route 10.2.0.0/16": showIpRouteLeaf2,
  "show ip route vrf STORAGE": showIpRouteVrfStorage,
  "show bgp neighbors 10.0.0.1": showBgpNeighborSpineBToLeaf1,
  "show bgp neighbors 10.0.0.2": showBgpNeighborsSpineAtoSpineB,
  "show bgp link-bandwidth": showBgpLinkBandwidth,
  "show proposal a": showProposalA,
  "show proposal b": showProposalB,
  "show topology": showTopologyByLab,
  "show isis neighbor": showIsisNeighbor,
  "show isis srv6 node": showIsisSrv6Node,
  "show segment-routing srv6 sid": showSegmentRoutingSrv6SidByDevice,
  "show sr-te segment-list": showSrteSegmentList,
  "show sr-te policy": showSrtePolicy,
  "show ip policy": showIpPolicy,
  "show route-map STEER-CHECKPOINT": showRouteMapSteerCheckpoint,
  "show mtu": showMtu,
  "show srv6 packets": showSrv6PacketsByDevice,
  "show mr info": showMrInfo,
  "ibv_devinfo -d mlx5_0 -i 1": ibvDevInfoGid,
  "show gid filter": showGidFilter,
  "show mr info after": showMrInfoAfter,
  "ibv_devinfo -d mlx5_0": () =>
    useLabStore.getState().lab.labId === lab17.id || useLabStore.getState().lab.labId === lab18.id
      ? handleIbvDevinfo()
      : ibvDevInfoTenantB(),
  "ibv_rc_pingpong -d mlx5_0 -g 1": ibvRcPingpong,
  "ibv_rc_pingpong -d mlx5_0 -g 0 192.168.100.2": handleIbvRcPingpong,
  "show qos trust dscp-map": () =>
    useLabStore.getState().lab.labId === lab17.id || useLabStore.getState().lab.labId === lab18.id
      ? handleNvShowQosTrustDscpMap()
      : showQosTrustDscpMap(),
  "nv show interface swp1 qos": () =>
    useLabStore.getState().lab.labId === lab17.id || useLabStore.getState().lab.labId === lab18.id
      ? handleNvShowInterfaceQos()
      : nvShowInterfaceSwp1Qos(),
  "nv set interface swp1-32 qos roce": () => runMutation("nv set interface swp1-32 qos roce"),
  "nv config apply": () => runMutation("nv config apply"),
  "nv config save": () => runMutation("nv config save"),
  "nv show qos roce": handleNvShowQosRoce,
  "nv show qos ecn profile roce": showQosEcnProfileByLab,
  "nv show qos pfc": handleNvShowQosPfc,
  "nv show qos scheduler": handleNvShowQosScheduler,
  "nv show interface swp1 counters pfc": handleNvShowInterfaceCountersPfc,
  "cl-resource-query": showClResourceQueryByLab,
  "ethtool -S swp1 | grep ecn": showEthtoolSwp1EcnByLab,
  "ib_write_bw -d mlx5_0 --iters 5000 --size 65536 192.168.100.2": handleIbWriteBw,
  "ib_write_lat -d mlx5_0 --iters 10000 192.168.100.2": handleIbWriteLat,
  "ip link show eth0": handleIpLinkShow,
  "ethtool -S mlx5_0 | grep -E 'ecn|pfc|retry'": handleEthtoolMlx5Grep,
  "nv set qos ecn profile roce min-threshold 500000": () => runMutation("nv set qos ecn profile roce min-threshold 500000"),
  "nv set qos ecn profile roce max-threshold 1500000": () => runMutation("nv set qos ecn profile roce max-threshold 1500000"),
  "ib_write_bw -d mlx5_0 --iters 10000 --size 65536 192.168.100.2 &": handleLab18IbWriteBwMulti,
  "ib_write_bw -d mlx5_1 --iters 10000 --size 65536 192.168.100.2 &": handleLab18IbWriteBwMulti,
  "ib_write_bw -d mlx5_2 --iters 10000 --size 65536 192.168.100.2 &": handleLab18IbWriteBwMulti,
  "ib_write_bw -d mlx5_3 --iters 10000 --size 65536 192.168.100.2 &": handleLab18IbWriteBwMulti,
  "nv show interface swp1 counters": handleLab18ShowInterfaceCounters,
  "show gvmi table": showGvmiTable,
  "show ufm pkey table": showUfmPkeyTable,
  "nv --version": handleNvVersion,
  "cl-platform-info": handleClPlatformInfo,
  "nv show interface": showNvInterfaceByDevice,
  "nv show interface | grep -E \"swp|state\"": showNvInterfaceByDevice,
  "decode-syseeprom": decodeSyseepromByDevice,
  "cl-netstat": handleClNetstat,
  "ip link show | grep mtu": handleIpLinkShowMtuLeaf01,
  "nv show router bgp": handleNvShowRouterBgp,
  "submit audit report": handleSubmitAuditReport,
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
  "show interface swp8": showActiveLeafSwitchPort,
  "show interface swp9": showActiveLeafSwitchPort,
  "show dcb pfc": showDcbPfcByLab,
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
  "show ufm ports": showUfmPorts,
  "show ufm alarms": showUfmAlarms,
  "show ufm events": showUfmEventsByLab,
  "show ufm port leaf-rail5 swp7": showUfmPortDetail,
  "show ufm topology": showUfmTopology,
  "show dcgm gpu5": showDcgmGpu5,
  "show dcgm all": showDcgmAll,
  "show pfc pause-stats": showPfcPauseStats,
  "show interface counters": showInterfaceCountersByLab,
  "show interface swp7": () =>
    useLabStore.getState().lab.labId === lab6.id ? showInterfaceSwp7() : showActiveLeafSwitchPort(),
  [ETHTOOL_STATS_COMMAND]: ethtoolStatsByLab,
  [ETHTOOL_STATS_ETH2_COMMAND]: ethtoolStatsEth2,
  [ETHTOOL_STATS_ETH3_COMMAND]: ethtoolStatsEth3,
  [ETHTOOL_STATS_ETH5_COMMAND]: ethtoolStatsEth5,
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
  "show roce": showRoceByLab,
  "disable pfc": () => runMutation("disable pfc"),
  "enable pfc": () => runMutation("enable pfc"),
  "enable pfc priority 3": () => runMutation("enable pfc priority 3"),
  "enable ecn": () => runMutation("enable ecn"),
  "enable load-balance per-packet": () => runMutation("enable load-balance per-packet"),
  "disable ecn": () => runMutation("disable ecn"),
  "configure segment-list": () => runMutation("configure segment-list"),
  "configure sr-te policy": () => runMutation("configure sr-te policy"),
  "configure route-map dscp10": () => runMutation("configure route-map dscp10"),
  "apply route-map swp1-4": () => runMutation("apply route-map swp1-4"),
  "set nccl ib-hca": () => runMutation("set nccl ib-hca"),
  "set nccl ib-hca mlx5_0,mlx5_1,mlx5_2,mlx5_3,mlx5_4,mlx5_5,mlx5_6,mlx5_7": () =>
    runMutation("set nccl ib-hca mlx5_0,mlx5_1,mlx5_2,mlx5_3,mlx5_4,mlx5_5,mlx5_6,mlx5_7"),
  "set nccl socket-ifname": () => runMutation("set nccl socket-ifname"),
  "set nccl socket-ifname eno1": () => runMutation("set nccl socket-ifname eno1"),
  "enable gid filter": () => runMutation("enable gid filter"),
  "ibv_reg_mr rotate": () => runMutation("ibv_reg_mr rotate"),
  "rkey scan": () => runMutation("rkey scan"),
  "set bgp link-bandwidth community 1200": setBgpLinkBandwidthCommunity,
  "set bgp local-as 65000": setBgpLocalAsSpineA,
  "set bgp local-as 65000 spineb": setBgpLocalAsSpineB,
  "clear counters": () => runMutation("clear counters"),
  "show interface counters after": showInterfaceCountersAfter,
  "replace optic rail2": replaceOpticRail2,
  "no shutdown": noShutdown,
  "reseat connector leaf-rail5 swp7": reseatConnector,
  "set pkey tenanta 0x8001": setPkeyTenantA,
  "set pkey tenantb 0x8002": setPkeyTenantB,
  "traceroute6 checkpoint dscp10": traceroute6CheckpointDscp10,
  "traceroute6 nccl dscp26": traceroute6NcclDscp26,
  "ping6 spine02 sid": ping6Spine02,
  "ping6 spine03 sid": ping6Spine03,
  "ping6 storage sid": ping6StorageSid,
  "tcpdump srh swp1": tcpdumpSrhByDevice,
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
  "ip link show": showIpLinkByLabAndDevice,
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
  const effectiveDeviceType = deviceType ?? "leaf-switch";
  const normalizedInput = input.trim().toLowerCase();
  const activeLabId = useLabStore.getState().lab.labId;
  const labDevices = activeLabId ? LAB_DEVICES[activeLabId] ?? [] : [];
  const currentDevice = deviceId
    ? labDevices.find((device) => device.id === deviceId)
    : undefined;
  const isAllowedOnCurrentDevice = currentDevice?.allowedCommands?.length
    ? currentDevice.allowedCommands.some(
      (candidate) =>
        candidate.toLowerCase() === normalizedInput
        || normalizedInput.startsWith(candidate.toLowerCase()),
    )
    : isCommandAllowedOnDevice(normalizedInput, effectiveDeviceType);

  if (!isAllowedOnCurrentDevice) {
    if (currentDevice?.allowedCommands?.length) {
      const availableOnDevices = labDevices.filter(
        (device) =>
          device.id !== currentDevice.id
          && device.allowedCommands.some(
            (candidate) =>
              candidate.toLowerCase() === normalizedInput
              || normalizedInput.startsWith(candidate.toLowerCase()),
          ),
      );

      if (availableOnDevices.length > 0) {
        return (
          `Command not available on this device (${currentDevice.label}).\n`
          + `Try: ${availableOnDevices.map((device) => device.label).join(" or ")}`
        );
      }

      return `Command not available on this device (${currentDevice.label}). Type 'help' to see available commands.`;
    }

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
    const deviceCmds = currentDevice?.allowedCommands ?? DEVICE_COMMANDS[effectiveDeviceType] ?? [];

    return [
      "Available commands on this device:",
      ...deviceCmds.map((command) => `  ${command}`),
    ].join("\n");
  }

  const currentLabId = store.lab.labId;
  const handler = classification.handler === "show interface counters"
    ? (
      effectiveDeviceType === "spine-switch"
        && currentLabId !== lab10.id
        && currentLabId !== lab11.id
        && !(currentLabId === lab14.id && store.activeDeviceId === "spine-01")
        ? showSpineCounters
        : showInterfaceCountersByLab
    )
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

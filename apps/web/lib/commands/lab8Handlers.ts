import type { CommandResult } from "@/types";
import { useLabStore } from "@/store/labStore";

function getLab8State() {
  const store = useLabStore.getState();
  const topology = store.topology as typeof store.topology & {
    pfcPriority?: number;
    roceShorthandApplied?: boolean;
    configApplied?: boolean;
  };
  const pfcPriority = topology.pfcPriority ?? 3;
  const rocePending = topology.roceShorthandApplied === true;
  const configApplied = topology.configApplied === true;
  const isFixed = topology.pfcEnabled && pfcPriority === 3 && configApplied;

  return {
    store,
    topology,
    pfcPriority,
    rocePending,
    configApplied,
    isFixed,
  };
}

export function handleLab8NvShowInterfaceSwp1QosPfc(): CommandResult {
  const { store, pfcPriority, rocePending, configApplied, isFixed } =
    getLab8State();
  const appliedPriority = rocePending ? 3 : pfcPriority;
  const operationalPriority = configApplied ? appliedPriority : pfcPriority;

  store.setCondition("pfcPriorityInspected", true);
  store.markVerified("pfcPriorityInspected");

  if (!isFixed) {
    store.setCondition("mismatchIdentified", true);
    store.markVerified("mismatchIdentified");
  } else {
    store.setCondition("pfcVerified", true);
    store.markVerified("pfcVerified");
  }

  return {
    output: `              operational  applied
------------  -----------  -------
pfc-priority  ${String(operationalPriority).padEnd(11)}  ${String(appliedPriority)}
rx-enabled    yes          yes
tx-enabled    yes          yes`,
    conceptId: "pfc",
    type: isFixed ? "success" : "error",
  };
}

export function handleLab8NvShowQosRoce(): CommandResult {
  const { pfcPriority, rocePending, configApplied, isFixed } = getLab8State();
  const appliedPriority = rocePending ? 3 : pfcPriority;
  const operationalPriority = configApplied ? appliedPriority : pfcPriority;

  return {
    output: `                    operational  applied
------------------  -----------  -------
enable              on           on
roce-mode           lossless     lossless
pfc-priority        ${String(operationalPriority).padEnd(11)}  ${String(appliedPriority)}

RoCE PCP/DSCP->SP mapping
=========================
      pcp  dscp  switch-prio
----  ---  ----  -----------
cnp   6    48    6
roce  3    26    3`,
    conceptId: "pfc",
    type: isFixed ? "success" : "error",
  };
}

export function handleLab8NvSetQosRoce(): CommandResult {
  const { store, topology } = getLab8State();

  store.setTopology({
    ...(topology as object),
    roceShorthandApplied: true,
    configApplied: false,
  } as typeof store.topology);

  return {
    output: "",
    conceptId: "pfc",
    type: "success",
  };
}

export function handleLab8NvConfigApply(): CommandResult {
  const { store, topology, rocePending } = getLab8State();

  if (!rocePending) {
    return {
      output: "No pending RoCE QoS change. Stage 'nv set qos roce' first.",
      conceptId: "pfc",
      type: "info",
    };
  }

  store.setTopology({
    ...(topology as object),
    pfcEnabled: true,
    pfcPriority: 3,
    configApplied: true,
    congestionDetected: false,
    bufferUtilPct: 18,
  } as typeof store.topology);
  store.setCondition("pfcPriorityFixed", true);
  store.markVerified("pfcPriorityFixed");
  store.setCondition("pfcEnabled", true);

  return {
    output: "Configuration applied.",
    conceptId: "pfc",
    type: "success",
  };
}

export function ethtoolStatsPriorityMismatch(): CommandResult {
  const { store, isFixed } = getLab8State();

  if (!isFixed) {
    store.setCondition("dropsConfirmed", true);
    store.markVerified("dropsConfirmed");

    return {
      output: `NIC statistics:
     rx_packets: 6093124411
     tx_packets: 6110823099
     rx_prio3_pause: 0
     tx_prio3_pause: 0
     rx_ecn_marked_pkts: 0
     tx_discards_phy: 52847
     rx_discards_phy: 0
     link_down_events_phy: 0`,
      conceptId: "pfc",
      type: "error",
    };
  }

  return {
    output: `NIC statistics:
     rx_packets: 6093124411
     tx_packets: 6110823099
     rx_prio3_pause: 847
     tx_prio3_pause: 0
     rx_ecn_marked_pkts: 0
     tx_discards_phy: 0
     rx_discards_phy: 0
     link_down_events_phy: 0`,
    conceptId: "pfc",
    type: "success",
  };
}

export function showDcbPfcWithPriority(): CommandResult {
  return handleLab8NvShowInterfaceSwp1QosPfc();
}

export function showRocePriorityMismatch(): CommandResult {
  return handleLab8NvShowQosRoce();
}

import type { CommandResult } from "@/types";
import { useLabStore } from "@/store/labStore";

function getLab7State() {
  const store = useLabStore.getState();
  const topology = store.topology as typeof store.topology & {
    ecnConfigPending?: boolean;
    pauseStorm?: boolean;
  };

  return {
    store,
    topology,
    ecnEnabled: topology.ecnEnabled,
    ecnPending: topology.ecnConfigPending === true,
    pauseStorm: topology.pauseStorm === true,
  };
}

export function handleLab7NvShowInterfaceSwp1CountersQosPfcStats(): CommandResult {
  const { store, ecnEnabled, pauseStorm } = getLab7State();

  store.setCondition("switchCountersChecked", true);
  store.markVerified("switchCountersChecked");

  const tc3RxPauseFrames = ecnEnabled && !pauseStorm ? 2 : 14;

  return {
    output: `switch-priority  rx-pause-frames  rx-pause-duration  tx-pause-frames  tx-pause-duration
---------------  ---------------  -----------------  ---------------  -----------------
0                0                0                  0                0
1                0                0                  0                0
2                0                0                  0                0
3                ${String(tc3RxPauseFrames).padEnd(15)}  ${String(tc3RxPauseFrames * 64).padEnd(17)}  0                0
4                0                0                  0                0
5                0                0                  0                0
6                0                0                  0                0
7                0                0                  0                0`,
    conceptId: "pfc",
    type: ecnEnabled ? "success" : "info",
  };
}

export function handleLab7NvShowQosCongestionControlTc3(): CommandResult {
  const { store, ecnEnabled, ecnPending } = getLab7State();
  const applied = ecnPending || ecnEnabled ? "enabled" : "disabled";
  const operational = ecnEnabled ? "enabled" : "disabled";

  if (ecnEnabled) {
    store.setCondition("ecnVerified", true);
    store.markVerified("ecnVerified");
  } else {
    store.setCondition("ecnMissingIdentified", true);
    store.markVerified("ecnMissingIdentified");
  }

  return {
    output: `                    operational  applied
------------------  -----------  -------
ecn                 ${operational.padEnd(11)}  ${applied}
min-threshold       1501500      1501500
max-threshold       1501500      1501500`,
    conceptId: "ecn",
    type: ecnEnabled ? "success" : "info",
  };
}

export function handleLab7NvSetQosCongestionControlTc3EcnEnabled(): CommandResult {
  const { store, topology } = getLab7State();

  store.setTopology({
    ...(topology as object),
    ecnConfigPending: true,
  } as typeof store.topology);

  return {
    output: "",
    conceptId: "ecn",
    type: "success",
  };
}

export function handleLab7NvConfigApply(): CommandResult {
  const { store, topology } = getLab7State();

  if (topology.ecnConfigPending !== true) {
    return {
      output:
        "No pending ECN change for TC3. Stage 'nv set qos congestion-control default-global traffic-class 3 ecn enabled' first.",
      conceptId: "ecn",
      type: "info",
    };
  }

  store.setTopology({
    ...(topology as object),
    ecnEnabled: true,
    ecnConfigPending: false,
    pauseStorm: false,
    congestionDetected: false,
    silentCongestion: false,
    bufferUtilPct: 12,
  } as typeof store.topology);
  store.setCondition("ecnEnabled", true);
  store.markVerified("ecnEnabled");

  return {
    output: "Configuration applied.",
    conceptId: "ecn",
    type: "success",
  };
}

export function ethtoolStatsPauseStorm(): CommandResult {
  const { store, ecnEnabled, pauseStorm } = getLab7State();

  if (pauseStorm && !ecnEnabled) {
    store.setCondition("nicPauseConfirmed", true);
    store.markVerified("nicPauseConfirmed");
    store.setCondition("ecnMissingIdentified", true);
    store.markVerified("ecnMissingIdentified");

    return {
      output: `NIC statistics:
     rx_packets: 6234918441
     tx_packets: 6198441223
     rx_prio3_pause: 50847
     tx_prio3_pause: 0
     rx_ecn_marked_pkts: 0
     tx_discards_phy: 0
     rx_discards_phy: 0
     link_down_events_phy: 0`,
      conceptId: "pfc",
      type: "error",
    };
  }

  return {
    output: `NIC statistics:
     rx_packets: 6234918441
     tx_packets: 6198441223
     rx_prio3_pause: 3
     tx_prio3_pause: 0
     rx_ecn_marked_pkts: 2847
     tx_discards_phy: 0
     rx_discards_phy: 0
     link_down_events_phy: 0`,
    conceptId: "ecn",
    type: "success",
  };
}

export function showInterfaceCountersPauseStorm(): CommandResult {
  return handleLab7NvShowInterfaceSwp1CountersQosPfcStats();
}

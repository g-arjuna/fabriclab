import { lab2 } from "@/data/labs/lab2-congestion";
import { useLabStore } from "@/store/labStore";
import type { CommandResult } from "@/types";

function getLab2QosState() {
  const topology = useLabStore.getState().topology as {
    configApplied?: boolean;
    ecnConfigPending?: boolean;
    ecnEnabled?: boolean;
    pfcEnabled?: boolean;
    silentCongestion?: boolean;
  };

  return {
    configApplied: topology.configApplied ?? false,
    ecnEnabled: topology.ecnEnabled ?? false,
    ecnPending: topology.ecnConfigPending ?? false,
    pfcEnabled: topology.pfcEnabled ?? false,
    silentCongestion: topology.silentCongestion ?? false,
  };
}

export function isLab2Active() {
  return useLabStore.getState().lab.labId === lab2.id;
}

export function handleLab2EthtoolEth0(): CommandResult {
  const { ecnEnabled, pfcEnabled, silentCongestion } = getLab2QosState();
  const { markVerified, setCondition } = useLabStore.getState();

  if (silentCongestion && pfcEnabled && !ecnEnabled) {
    setCondition("congestionChecked", true);
    markVerified("congestionChecked");
  }

  if (ecnEnabled) {
    setCondition("ecnVerified", true);
    markVerified("ecnVerified");
  }

  return {
    output: `NIC statistics (ConnectX-7 - eth0):
  rx_prio3_pause:       ${ecnEnabled ? "912" : "12847"}
  tx_prio3_pause:       ${ecnEnabled ? "384" : "8293"}
  rx_ecn_marked_pkts:   ${ecnEnabled ? "2947" : "0"}
  tx_discards_phy:      0
  link_speed:           400Gb/s
  link_state:           up`,
    conceptId: "ecn",
    type: ecnEnabled ? "success" : "info",
  };
}

export function handleLab2NvShowInterfaceSwp1CountersQosPfcStats(): CommandResult {
  const { ecnEnabled, pfcEnabled, silentCongestion } = getLab2QosState();
  const { markVerified, setCondition } = useLabStore.getState();
  const pauseFrames = pfcEnabled && silentCongestion ? (ecnEnabled ? "912" : "4823") : "0";
  const pauseDuration = pfcEnabled && silentCongestion ? (ecnEnabled ? "18220" : "201993") : "0";

  if (pfcEnabled && silentCongestion && !ecnEnabled) {
    setCondition("congestionChecked", true);
    markVerified("congestionChecked");
  }

  return {
    output: `switch-priority  rx-pause-frames  rx-pause-duration  tx-pause-frames  tx-pause-duration
---------------  ---------------  -----------------  ---------------  -----------------
0                0                0                  0                0
1                0                0                  0                0
2                0                0                  0                0
3                ${pauseFrames}             ${pauseDuration}             ${pauseFrames}             ${pauseDuration}
4                0                0                  0                0
5                0                0                  0                0
6                0                0                  0                0
7                0                0                  0                0`,
    conceptId: "ecn",
    type: ecnEnabled ? "success" : "info",
  };
}

export function handleLab2NvShowQosCongestionControlDefaultGlobal(): CommandResult {
  const { configApplied, ecnEnabled, ecnPending } = getLab2QosState();
  const { markVerified, setCondition } = useLabStore.getState();

  if (ecnEnabled && configApplied) {
    setCondition("ecnVerified", true);
    markVerified("ecnVerified");
  }

  return {
    output: `ECN Configurations
=====================
    traffic-class  ECN      RED      Min Th     Max Th   Probability
    -------------  -------  -------  ---------  -------  -----------
    3              ${ecnEnabled && configApplied ? "enable " : "disable"}  disable  146.48 KB  1.43 MB  100`,
    conceptId: "ecn",
    type: ecnEnabled && configApplied ? "success" : "info",
  };
}

export function handleLab2NvShowQosCongestionControlTc3(): CommandResult {
  const { configApplied, ecnEnabled, ecnPending } = getLab2QosState();
  const { markVerified, setCondition } = useLabStore.getState();
  const operational = ecnEnabled && configApplied ? "enable" : "disable";
  const applied = ecnPending || (ecnEnabled && configApplied) ? "enable" : "disable";

  if (ecnEnabled && configApplied) {
    setCondition("ecnVerified", true);
    markVerified("ecnVerified");
  }

  return {
    output: `               operational  applied   description
-------------  -----------  --------  -----------------------------------
ecn            ${operational}       ${applied}    Early Congestion Notification State
max-threshold  1.43 MB      1.43 MB   Maximum Threshold (in bytes)
min-threshold  146.48 KB    146.48 KB Minimum Threshold (in bytes)
probability    100          100       Probability
red            disable      disable   Random Early Detection State`,
    conceptId: "ecn",
    type: ecnEnabled && configApplied ? "success" : "info",
  };
}

export function handleLab2NvSetQosCongestionControlTc3EcnEnabled(): CommandResult {
  const store = useLabStore.getState();

  store.setTopology({
    ...(store.topology as object),
    configApplied: false,
    ecnConfigPending: true,
  } as typeof store.topology);

  return {
    output: "",
    conceptId: "ecn",
    type: "success",
  };
}

export function handleLab2NvConfigApply(): CommandResult {
  const store = useLabStore.getState();
  const topology = store.topology as {
    configApplied?: boolean;
    ecnConfigPending?: boolean;
    ecnEnabled?: boolean;
  };

  if (!topology.ecnConfigPending && !topology.ecnEnabled && !topology.configApplied) {
    return {
      output: "No pending NVUE configuration to apply.",
      type: "error",
    };
  }

  store.setTopology({
    ...(store.topology as object),
    bufferUtilPct: 29,
    configApplied: true,
    ecnConfigPending: false,
    ecnEnabled: true,
    pfcEnabled: true,
    silentCongestion: true,
  } as typeof store.topology);
  store.setCondition("ecnEnabled", true);
  store.markVerified("ecnEnabled");

  return {
    output: "Configuration applied.",
    conceptId: "ecn",
    type: "success",
  };
}

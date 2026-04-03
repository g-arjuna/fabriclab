import { lab1 } from "@/data/labs/lab1-pfc-fix";
import { useLabStore } from "@/store/labStore";
import type { CommandResult } from "@/types";

function getRoceConfigState() {
  const topology = useLabStore.getState().topology as {
    configApplied?: boolean;
    pfcEnabled?: boolean;
    roceShorthandApplied?: boolean;
  };

  return {
    configApplied: topology.configApplied ?? false,
    pfcEnabled: topology.pfcEnabled ?? false,
    rocePending: topology.roceShorthandApplied ?? false,
  };
}

export function handleLab1NvShowQosRoce(): CommandResult {
  const { configApplied, pfcEnabled, rocePending } = getRoceConfigState();
  const { markVerified, setCondition } = useLabStore.getState();
  const operational = pfcEnabled && configApplied;

  if (operational) {
    setCondition("pfcVerified", true);
    markVerified("pfcVerified");
  } else {
    setCondition("pfcMissing", true);
    markVerified("pfcMissing");
  }

  return {
    output: `                  operational  applied
----------------  -----------  -------
enable            ${operational ? "on" : "off"}          ${rocePending ? "on" : "off"}
roce-mode         ${operational ? "lossless" : "-"}      ${rocePending ? "lossless" : "-"}`,
    conceptId: "pfc",
    type: operational ? "success" : "info",
  };
}

export function handleLab1NvShowInterfaceSwp1QosPfc(): CommandResult {
  const { configApplied, pfcEnabled, rocePending } = getRoceConfigState();
  const { markVerified, setCondition } = useLabStore.getState();
  const operational = pfcEnabled && configApplied;

  if (operational) {
    setCondition("pfcVerified", true);
    markVerified("pfcVerified");
  } else {
    setCondition("pfcMissing", true);
    markVerified("pfcMissing");
  }

  return {
    output: `    operational  applied
--  -----------  -------
rx  ${operational ? "enable" : "disable"}      ${rocePending ? "enable" : "disable"}
tx  ${operational ? "enable" : "disable"}      ${rocePending ? "enable" : "disable"}`,
    conceptId: "pfc",
    type: operational ? "success" : "info",
  };
}

export function handleLab1NvShowInterfaceSwp1CountersQosPfcStats(): CommandResult {
  const { configApplied, pfcEnabled } = getRoceConfigState();
  const pfcActive = pfcEnabled && configApplied;

  return {
    output: `switch-priority  rx-pause-frames  rx-pause-duration  tx-pause-frames  tx-pause-duration
---------------  ---------------  -----------------  ---------------  -----------------
0                0                0                  0                0
1                0                0                  0                0
2                0                0                  0                0
3                ${pfcActive ? "14296" : "0"}            ${pfcActive ? "184732" : "0"}             ${pfcActive ? "9173" : "0"}             ${pfcActive ? "118404" : "0"}
4                0                0                  0                0
5                0                0                  0                0
6                0                0                  0                0
7                0                0                  0                0`,
    conceptId: "pfc",
    type: pfcActive ? "success" : "info",
  };
}

export function handleLab1NvSetQosRoce(): CommandResult {
  const store = useLabStore.getState();

  store.setTopology({
    ...(store.topology as object),
    configApplied: false,
    roceShorthandApplied: true,
  } as typeof store.topology);

  return {
    output: "",
    conceptId: "pfc",
    type: "success",
  };
}

export function handleLab1NvConfigApply(): CommandResult {
  const store = useLabStore.getState();
  const topology = store.topology as {
    configApplied?: boolean;
    roceShorthandApplied?: boolean;
  };

  if (!topology.roceShorthandApplied && !topology.configApplied) {
    return {
      output: "No pending NVUE configuration to apply.",
      type: "error",
    };
  }

  store.setTopology({
    ...(store.topology as object),
    bufferUtilPct: 24,
    configApplied: true,
    congestionDetected: false,
    ecnEnabled: true,
    pfcEnabled: true,
    roceShorthandApplied: true,
  } as typeof store.topology);
  store.setCondition("pfcEnabled", true);
  store.markVerified("pfcEnabled");

  return {
    output: "Configuration applied.",
    conceptId: "pfc",
    type: "success",
  };
}

export function isLab1Active() {
  return useLabStore.getState().lab.labId === lab1.id;
}

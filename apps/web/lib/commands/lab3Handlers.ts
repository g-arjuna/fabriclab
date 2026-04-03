import { useLabStore } from "@/store/labStore";
import type { CommandResult } from "@/types";

const LEAF_UPLINK_PORTS = ["swp51", "swp52", "swp53", "swp54"] as const;

function getLab3State() {
  const topology = useLabStore.getState().topology as {
    adaptiveRoutingPendingPorts?: string[];
    bufferUtilPct?: number;
    lbMode?: string;
    unevenSpine?: boolean;
  };

  return {
    enabledPorts: topology.adaptiveRoutingPendingPorts ?? [],
    isAdaptiveRoutingOn: (topology.lbMode ?? "hash") === "per-packet",
    isUneven: topology.unevenSpine ?? false,
  };
}

function leafCounterValue(port: (typeof LEAF_UPLINK_PORTS)[number]) {
  const { isAdaptiveRoutingOn, isUneven } = getLab3State();

  if (!isAdaptiveRoutingOn && isUneven) {
    if (port === "swp51") {
      return { txBytes: "786245811008", txPackets: "6131795396", util: "89.7%" };
    }
    if (port === "swp52") {
      return { txBytes: "768100441088", txPackets: "5990315899", util: "86.4%" };
    }
    if (port === "swp53") {
      return { txBytes: "39682112", txPackets: "310016", util: "6.8%" };
    }
    return { txBytes: "41131136", txPackets: "321336", util: "7.1%" };
  }

  if (port === "swp51") {
    return { txBytes: "394207125504", txPackets: "3079743176", util: "46.8%" };
  }
  if (port === "swp52") {
    return { txBytes: "388945013760", txPackets: "3038647132", util: "46.1%" };
  }
  if (port === "swp53") {
    return { txBytes: "391402352640", txPackets: "3057862339", util: "46.4%" };
  }
  return { txBytes: "389778176000", txPackets: "3045173250", util: "46.2%" };
}

function spineCounterValue(deviceId: string | null) {
  const { isAdaptiveRoutingOn, isUneven } = getLab3State();

  if (!isAdaptiveRoutingOn && isUneven) {
    if (deviceId === "spine-1") {
      return { rxBytes: "786245811008", rxPackets: "6131795396", util: "89.7%" };
    }
    if (deviceId === "spine-2") {
      return { rxBytes: "768100441088", rxPackets: "5990315899", util: "86.4%" };
    }
    if (deviceId === "spine-3") {
      return { rxBytes: "39682112", rxPackets: "310016", util: "6.8%" };
    }
    return { rxBytes: "41131136", rxPackets: "321336", util: "7.1%" };
  }

  if (deviceId === "spine-1") {
    return { rxBytes: "394207125504", rxPackets: "3079743176", util: "46.8%" };
  }
  if (deviceId === "spine-2") {
    return { rxBytes: "388945013760", rxPackets: "3038647132", util: "46.1%" };
  }
  if (deviceId === "spine-3") {
    return { rxBytes: "391402352640", rxPackets: "3057862339", util: "46.4%" };
  }
  return { rxBytes: "389778176000", rxPackets: "3045173250", util: "46.2%" };
}

export function handleLab3LeafUplinkCounters(port: (typeof LEAF_UPLINK_PORTS)[number]): CommandResult {
  const counters = leafCounterValue(port);

  return {
    output: `                         operational  applied  pending
-------------------      -----------  -------  -------
carrier-transitions      2
in-bytes                 370.10 MB
in-pkts                  2891435
in-drops                 0
in-errors                0
out-bytes                ${counters.txBytes} B
out-pkts                 ${counters.txPackets}
out-drops                0
out-errors               0`,
    conceptId: "rocev2",
    type: "info",
  };
}

export function handleLab3SpineSwp1Counters(): CommandResult {
  const store = useLabStore.getState();
  const counters = spineCounterValue(store.activeDeviceId);
  const { isAdaptiveRoutingOn, isUneven } = getLab3State();

  if (!isAdaptiveRoutingOn && isUneven) {
    store.setCondition("spineChecked", true);
    store.markVerified("spineChecked");
  }

  if (isAdaptiveRoutingOn && !isUneven) {
    store.setCondition("spineVerified", true);
    store.markVerified("spineVerified");
  }

  return {
    output: `                         operational  applied  pending
-------------------      -----------  -------  -------
carrier-transitions      1
in-bytes                 ${counters.rxBytes} B
in-pkts                  ${counters.rxPackets}
in-drops                 0
in-errors                0
out-bytes                369.84 MB
out-pkts                 2889401
out-drops                0
out-errors               0`,
    conceptId: "rocev2",
    type: "info",
  };
}

export function handleLab3NvShowRouterAdaptiveRouting(): CommandResult {
  const store = useLabStore.getState();
  const { isAdaptiveRoutingOn } = getLab3State();

  store.setCondition("lbModeIdentified", true);
  store.markVerified("lbModeIdentified");

  return {
    output: `        applied  description
------  -------  ------------------------------------------------------
enable  ${isAdaptiveRoutingOn ? "on" : "off"}      Turn the feature 'on' or 'off'.  The default is 'off'.`,
    conceptId: "rocev2",
    type: isAdaptiveRoutingOn ? "success" : "info",
  };
}

export function handleLab3NvShowInterfaceAdaptiveRouting(): CommandResult {
  const { enabledPorts, isAdaptiveRoutingOn } = getLab3State();
  const enabled = isAdaptiveRoutingOn || enabledPorts.includes("swp51");

  return {
    output: `                            applied  description
--------------------------  -------  ------------------------------------------------------
enable                      ${enabled ? "on" : "off"}      Turn the feature 'on' or 'off'.  The default is 'off'.
link-utilization-threshold  70       Link utilization threshold percentage`,
    conceptId: "rocev2",
    type: enabled ? "success" : "info",
  };
}

export function handleLab3EnableAdaptiveRouting(port: (typeof LEAF_UPLINK_PORTS)[number]): CommandResult {
  const store = useLabStore.getState();
  const topology = store.topology as { adaptiveRoutingPendingPorts?: string[] };
  const nextPorts = new Set(topology.adaptiveRoutingPendingPorts ?? []);

  nextPorts.add(port);
  store.setTopology({
    ...(store.topology as object),
    adaptiveRoutingPendingPorts: Array.from(nextPorts),
  } as typeof store.topology);

  return {
    output: "",
    conceptId: "rocev2",
    type: "success",
  };
}

export function handleLab3NvConfigApply(): CommandResult {
  const store = useLabStore.getState();
  const pendingPorts = new Set(
    ((store.topology as { adaptiveRoutingPendingPorts?: string[] }).adaptiveRoutingPendingPorts)
      ?? [],
  );
  const missingPorts = LEAF_UPLINK_PORTS.filter((port) => !pendingPorts.has(port));

  if (missingPorts.length > 0) {
    return {
      output: `Adaptive routing is not staged on all ECMP uplinks yet.
Missing: ${missingPorts.join(", ")}`,
      type: "error",
    };
  }

  store.setTopology({
    ...(store.topology as object),
    bufferUtilPct: 34,
    lbMode: "per-packet",
    unevenSpine: false,
  } as typeof store.topology);
  store.setCondition("lbEnabled", true);
  store.markVerified("lbEnabled");

  return {
    output: "Configuration applied.",
    conceptId: "rocev2",
    type: "success",
  };
}

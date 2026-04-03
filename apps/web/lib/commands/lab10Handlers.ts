import { useLabStore } from "@/store/labStore";
import type { CommandResult } from "@/types";

function markCondition(key: string): void {
  const store = useLabStore.getState();
  store.setCondition(key, true);
  store.verifyCondition(key);
}

function isUcmpConfigured(): boolean {
  return useLabStore.getState().topology.ucmpRouteMapApplied === true;
}

export function handleLab10NetqShowEcmp(): CommandResult {
  markCondition("fabricHealthChecked");

  return {
    output: `Matching ECMP groups:

Hostname  VRF      Prefix        Nexthops  Notes
--------  -------  ------------  --------  --------------------------------------
leaf1     default  10.4.0.0/16   4         SpineB path still weighted equally

ECMP imbalance event:
  destination-prefix 10.4.0.0/16
  expected next-hop weights 4:3:4:4 after SpineB lost one Leaf4 uplink
  observed next-hop weights 1:1:1:1
  check Leaf1 BGP route details and SpineB route-map policy`,
    type: "success",
  };
}

export function handleLab10SpineBInterfaceSwp54LinkStats(): CommandResult {
  markCondition("ecmpImbalanceIdentified");

  const fixed = isUcmpConfigured();
  const rxBytes = fixed ? "27,882,104,992,144" : "39,812,441,772,991";
  const rxPackets = fixed ? "22,413,922,104" : "31,508,992,441";
  const pfcFrames = fixed ? "11" : "18841";

  return {
    output: `               operational
-------------  -----------
rx-bytes       ${rxBytes}
rx-packets     ${rxPackets}
rx-discards    0
tx-bytes       ${rxBytes}
tx-packets     ${rxPackets}
tx-discards    0
rx-pfc-frames  ${pfcFrames}
tx-pfc-frames  0`,
    conceptId: "rocev2",
    type: fixed ? "success" : "info",
  };
}

export function handleLab10Leaf1ShowBgpRoute(): CommandResult {
  const fixed = isUcmpConfigured();

  if (fixed) {
    markCondition("weightedEcmpVerified");
  } else {
    markCondition("ecmpImbalanceIdentified");
  }

  return {
    output: `                 operational
---------------  -----------
path-count       4
multipath-count  4

path
====
    id            1
    next-hop      10.0.0.1
    from          SpineA
    weight        ${fixed ? "100" : "1"}
    ext-community ${fixed ? "bandwidth: num-multipaths(4)" : "-"}

    id            2
    next-hop      10.0.0.2
    from          SpineB
    weight        ${fixed ? "75" : "1"}
    ext-community ${fixed ? "bandwidth: num-multipaths(3)" : "-"}

    id            3
    next-hop      10.0.0.3
    from          SpineC
    weight        ${fixed ? "100" : "1"}
    ext-community ${fixed ? "bandwidth: num-multipaths(4)" : "-"}

    id            4
    next-hop      10.0.0.4
    from          SpineD
    weight        ${fixed ? "100" : "1"}
    ext-community ${fixed ? "bandwidth: num-multipaths(4)" : "-"}`,
    conceptId: "rocev2",
    type: fixed ? "success" : "info",
  };
}

export function handleLab10SpineBShowRouteMapSet(): CommandResult {
  markCondition("bandwidthCommunityGapConfirmed");

  const topology = useLabStore.getState().topology;
  const appliedValue = topology.ucmpRouteMapApplied ? "multipaths" : "";
  const pendingValue = topology.ucmpRouteMapPending ? "multipaths" : "";

  return {
    output: `                  applied      pending
----------------  -----------  -----------
ext-community-bw  ${appliedValue.padEnd(11, " ")}  ${pendingValue}`,
    conceptId: "rocev2",
    type: isUcmpConfigured() ? "success" : "info",
  };
}

export function handleLab10SetExtCommunityBwMultipaths(): CommandResult {
  const store = useLabStore.getState();

  store.setTopology({
    ...(store.topology as object),
    ucmpRouteMapPending: true,
  } as typeof store.topology);

  return {
    output: "Staged ext-community-bw multipaths under route-map UCMP-LEAF4 rule 10. Run 'nv config apply' to activate it.",
    conceptId: "rocev2",
    type: "success",
  };
}

export function handleLab10NvConfigApply(): CommandResult {
  const store = useLabStore.getState();

  if (store.topology.ucmpRouteMapPending !== true) {
    return {
      output:
        "No pending UCMP policy change. Stage 'nv set router policy route-map UCMP-LEAF4 rule 10 set ext-community-bw multipaths' first.",
      conceptId: "rocev2",
      type: "info",
    };
  }

  store.setTopology({
    ...(store.topology as object),
    ucmpRouteMapPending: false,
    ucmpRouteMapApplied: true,
    congestionDetected: false,
    bufferUtilPct: 41,
  } as typeof store.topology);
  markCondition("bandwidthCommunityConfigured");

  return {
    output: "Configuration applied.",
    conceptId: "rocev2",
    type: "success",
  };
}

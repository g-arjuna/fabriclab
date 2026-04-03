import { useLabStore } from "@/store/labStore";
import type { CommandResult } from "@/types";

function markCondition(key: string): void {
  const store = useLabStore.getState();
  store.setCondition(key, true);
  store.verifyCondition(key);
}

function isSameAsnFixed(): boolean {
  const topology = useLabStore.getState().topology;
  return topology.spineAAsnApplied === true && topology.spineBAsnApplied === true;
}

export function handleLab11NetqCheckBgp(): CommandResult {
  markCondition("failureScopeChecked");

  return {
    output: `Total Nodes: 4, Failed Nodes: 1, Total Sessions: 7, Failed Sessions: 1

Hostname  VRF      Peer       PeerHostname  Reason
--------  -------  ---------  ------------  ---------------------------
spineA    default  swp2       leaf2         interface swp2 is down

[SIM ONLY] For this lab, the summary also flags a non-standard cross-spine peering:
  spineA <-> spineB eBGP is established with different spine ASNs (65001, 65002)
  That peering lets SpineA re-advertise Leaf2 routes through SpineB after swp2 fails.`,
    conceptId: "rocev2",
    type: "success",
  };
}

export function handleLab11Leaf1ShowRoute(): CommandResult {
  const fixed = isSameAsnFixed();

  if (fixed) {
    markCondition("postFixPathVerified");
  } else {
    markCondition("suboptimalPathSeen");
  }

  return {
    output: `                 operational
---------------  -----------
path-count       ${fixed ? "1" : "2"}
multipath-count  ${fixed ? "1" : "2"}

path
====
    id         1
    next-hop   10.0.0.2
    from       SpineB
    aspath     ${fixed ? "65000 65004" : "65002 65004"}

${fixed
  ? ""
  : `    id         2
    next-hop   10.0.0.1
    from       SpineA
    aspath     65001 65002 65004
    note       suboptimal path: Leaf1 -> SpineA -> SpineB -> Leaf2`}`,
    conceptId: "rocev2",
    type: fixed ? "success" : "info",
  };
}

export function handleLab11SpineAShowRoute(): CommandResult {
  const fixed = isSameAsnFixed();

  if (!fixed) {
    markCondition("sameAsnPrincipleIdentified");
  }

  return {
    output: `                 operational
---------------  -----------
path-count       ${fixed ? "0" : "1"}
multipath-count  ${fixed ? "0" : "1"}

${fixed
  ? "Leaf2 path from SpineB is rejected after both spines move to ASN 65000, so SpineA no longer re-advertises a detour."
  : `path
====
    id         1
    next-hop   10.0.0.2
    from       SpineB
    aspath     65002 65004

SpineA re-advertises this route to Leaf1 as 65001 65002 65004 because its own ASN (65001) is not present in the received path.`}`,
    conceptId: "rocev2",
    type: fixed ? "success" : "info",
  };
}

export function handleLab11SpineAShowNeighbor(): CommandResult {
  markCondition("sameAsnPrincipleIdentified");

  return {
    output: `              operational  applied
------------  -----------  -------
remote-as     65002        65002
state         established  established

[SIM ONLY] This lab intentionally includes a non-standard spineA <-> spineB peering.
Because the spines use different ASNs, SpineA can accept and re-advertise Leaf2 routes learned from SpineB.`,
    conceptId: "rocev2",
    type: "info",
  };
}

export function handleLab11SpineBInterfaceSwp4LinkStats(): CommandResult {
  const fixed = isSameAsnFixed();
  const txBytes = fixed ? "25,430,412,081,904" : "48,887,142,990,112";
  const txPackets = fixed ? "20,518,994,281" : "39,102,503,441";

  return {
    output: `              operational
------------  -----------
tx-bytes      ${txBytes}
tx-packets    ${txPackets}
tx-discards   0
rx-bytes      ${txBytes}
rx-packets    ${txPackets}
rx-discards   0`,
    conceptId: "rocev2",
    type: fixed ? "success" : "info",
  };
}

export function handleLab11SetSpineAsn(deviceId: "spineA" | "spineB"): CommandResult {
  const store = useLabStore.getState();

  if (deviceId === "spineA") {
    store.setTopology({
      ...(store.topology as object),
      spineAAsnPending: true,
    } as typeof store.topology);
  } else {
    store.setTopology({
      ...(store.topology as object),
      spineBAsnPending: true,
    } as typeof store.topology);
  }

  return {
    output: "Staged BGP ASN 65000. Run 'nv config apply' on this spine to restart BGP with the new ASN.",
    conceptId: "rocev2",
    type: "success",
  };
}

export function handleLab11NvConfigApply(): CommandResult {
  const store = useLabStore.getState();

  if (store.activeDeviceId === "spineA") {
    if (store.topology.spineAAsnPending !== true) {
      return {
        output: "No pending ASN change on SpineA. Stage 'nv set router bgp autonomous-system 65000' first.",
        conceptId: "rocev2",
        type: "info",
      };
    }

    store.setTopology({
      ...(store.topology as object),
      spineAAsnPending: false,
      spineAAsnApplied: true,
    } as typeof store.topology);
    markCondition("spineAAsnUnified");
  }

  if (store.activeDeviceId === "spineB") {
    if (store.topology.spineBAsnPending !== true) {
      return {
        output: "No pending ASN change on SpineB. Stage 'nv set router bgp autonomous-system 65000' first.",
        conceptId: "rocev2",
        type: "info",
      };
    }

    store.setTopology({
      ...(store.topology as object),
      spineBAsnPending: false,
      spineBAsnApplied: true,
    } as typeof store.topology);
    markCondition("spineBAsnUnified");
  }

  return {
    output: "Configuration applied. BGP sessions are converging.",
    conceptId: "rocev2",
    type: "success",
  };
}

import { useLabStore } from "@/store/labStore";
import { findFailedLab0Rail, normalizeRails } from "@/lib/lab0State";
import type { CommandResult } from "@/types";

function getLab0LeafContext() {
  const store = useLabStore.getState();
  const activeDeviceId = store.activeDeviceId ?? "leaf-rail3";
  const railId = Number.parseInt(activeDeviceId.replace("leaf-rail", ""), 10);
  const rail = normalizeRails(store.topology.rails).find((item) => item.id === railId);
  const failedRail = findFailedLab0Rail(store.topology.rails);

  return {
    store,
    railId,
    swpName: rail?.leafInterface ?? "swp5",
    rail,
    failedRail,
    isFailedLeaf: Boolean(failedRail && rail && failedRail.leafId === rail.leafId),
    isFailedRailPort: Boolean(failedRail && rail && failedRail.leafId === rail.leafId && failedRail.leafInterface === (rail.leafInterface ?? "swp5")),
  };
}

export function showUfmTopologyLab0(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState();
  const rails = normalizeRails(topology.rails);
  const failedRail = rails.find((rail) =>
    rail.switchPort !== "up" || rail.nicState !== "up" || rail.carrierState !== "up" || rail.rdmaPortState !== "active",
  );

  if (rails.length === 0) {
    return {
      output: "No fabric-inventory topology snapshot is available for this lab.",
      type: "info",
    };
  }

  if (failedRail) {
    setCondition("railIdentified", true);
    markVerified("railIdentified");
  }

  const rows = rails
    .map((rail) => {
      const hostState = `${rail.rdmaPortState}/${rail.carrierState}`;
      const switchState = rail.protodownReason ? `protodown/${rail.protodownReason}` : "up";
      return `${String(rail.id).padEnd(5)} ${`${rail.leafId}.${rail.leafInterface}`.padEnd(20)} ${rail.nicName.padEnd(8)} ${rail.netdevName.padEnd(9)} ${hostState.padEnd(11)} ${switchState}`;
    })
    .join("\n");

  return {
    output: `[SIMULATED FABRIC INVENTORY — tutorial scaffold, not literal NetQ/UFM output]
Rail  Leaf attachment      DGX HCA   DGX netdev  Host state  Switch state
----  -------------------  --------  ----------  ----------  ------------------
${rows}

Summary:
  Failed rail: ${failedRail ? `Rail ${failedRail.id}` : "none"}
  Mapping: ${failedRail ? `Rail ${failedRail.id} -> ${failedRail.leafId} ${failedRail.leafInterface} -> ${failedRail.nicName} / ${failedRail.netdevName}` : "no failed rail detected"}

Interpretation: this inventory reports layer state collected from the simulated fabric. Host state is RDMA-port/carrier state; switch state is operational forwarding state. It does not by itself prove application health.`,
    conceptId: "rocev2",
    type: "success",
  };
}

export function nvShowInterfaceStatusLab0(): CommandResult {
  const { rail, swpName, isFailedRailPort } = getLab0LeafContext();
  const oper = isFailedRailPort ? "down" : "up";
  const protodown = isFailedRailPort ? "enabled" : "disabled";
  const reason = isFailedRailPort ? rail?.protodownReason ?? "linkflap" : "";

  return {
    output: `[SIMULATED NVUE OUTPUT — abridged]
Interface  Admin Status  Oper Status  Protodown  Protodown Reason  Speed  Description
---------  ------------  -----------  ---------  ----------------  -----  -----------
${swpName.padEnd(9)} up            ${oper.padEnd(11)} ${protodown.padEnd(9)} ${reason.padEnd(16)} ${rail?.speedGbps ?? 400}G   dgx-node-a-rail${rail?.id ?? "?"}

[SIMULATION INTERPRETATION — not NVUE output]
Administrative state, carrier state, operational forwarding state, and protodown protection are separate layers.`,
    type: isFailedRailPort ? "error" : "success",
    conceptId: "rocev2",
  };
}

export function nvShowInterfaceLinkLab0(expectedPort: string): CommandResult {
  const { store, rail, swpName, isFailedLeaf, isFailedRailPort } = getLab0LeafContext();

  if (!rail) {
    return {
      output: `nv show interface ${expectedPort} link\n\nNo interface state is available for this device context.`,
      type: "info",
    };
  }

  if (swpName !== expectedPort) {
    return {
      output: `[SIMULATED NVUE OUTPUT — abridged]
nv show interface ${expectedPort} link

No Node A rail attachment is mapped to ${expectedPort} in this lab. Use the fabric-inventory mapping rather than guessing interface numbers.`,
      type: "info",
    };
  }

  if (isFailedRailPort && store.lab.conditions.railIdentified === true) {
    store.setCondition("faultIsolated", true);
    store.markVerified("faultIsolated");
  }

  const oper = isFailedRailPort ? "down" : "up";
  const protodown = isFailedRailPort ? "enabled" : "disabled";
  const reason = isFailedRailPort ? rail.protodownReason ?? "linkflap" : "";
  const carrierTransitions = isFailedRailPort ? "6" : "0";
  const carrierUp = isFailedRailPort ? "3" : "1";
  const carrierDown = isFailedRailPort ? "3" : "0";

  return {
    output: `[SIMULATED NVUE OUTPUT — abridged]
                         operational              applied
-----------------------  -----------------------  -------
admin-status             up                       up
oper-status              ${oper.padEnd(23)} up
protodown                ${protodown.padEnd(23)} disabled
protodown-reason         ${reason}
auto-negotiate           off                      off
duplex                   full                     full
speed                    ${rail.speedGbps}G                     ${rail.speedGbps}G
state                    ${oper.padEnd(23)} up
stats
  carrier-transitions    ${carrierTransitions}
  carrier-up-count       ${carrierUp}
  carrier-down-count     ${carrierDown}

[SIMULATION INTERPRETATION — not NVUE output]
${isFailedRailPort
  ? "This is the switch-side fault: link-flap protection placed the interface into protodown. Administrative state remains up, but operational forwarding and carrier state are down. Clearing protodown or restoring service is a separate recovery exercise."
  : isFailedLeaf
    ? "This leaf is involved in the failure, but the displayed interface state does not identify the mapped failed attachment."
    : "This interface is healthy. Inspecting a healthy rail does not isolate the failed rail."}`,
    type: isFailedRailPort ? "error" : "success",
    conceptId: "rocev2",
  };
}

export function nvShowInterfaceLinkFlapProtectionLab0(
  expectedPort: string,
): CommandResult {
  const { swpName, isFailedRailPort } = getLab0LeafContext();

  if (swpName !== expectedPort) {
    return {
      output: `nv show interface ${expectedPort} link flap-protection\n\nNo flap-protection evidence is available for ${expectedPort} in this lab mapping.`,
      type: "info",
    };
  }

  return {
    output: `[SIMULATED NVUE OUTPUT — abridged]
           operational  applied
---------  -----------  -------
state      enabled     enabled

[SIMULATION INTERPRETATION — not NVUE output]
${isFailedRailPort ? "Flap protection is enabled and the interface is currently protodown with reason linkflap." : "Flap protection is enabled; this interface has no active linkflap protodown event."}`,
    type: isFailedRailPort ? "error" : "success",
    conceptId: "rocev2",
  };
}

import type { RailState } from "@/types";

export type NormalizedLab0Rail = Required<Pick<RailState,
  "id" | "nicName" | "netdevName" | "leafId" | "leafInterface" |
  "adminState" | "nicState" | "carrierState" | "rdmaPortState" |
  "switchPort" | "switchAdminState" | "switchCarrierState" |
  "speedGbps" | "guid" | "portGuid"
>> & { protodownReason: "linkflap" | null };

/**
 * Normalizes the small Lab 0 fixture into explicit layers. The topology object
 * remains the source of truth; older labs that provide only the legacy fields
 * receive their previous behavior through the fallbacks below.
 */
export function normalizeRail(rail: RailState): NormalizedLab0Rail {
  const switchFailed = rail.switchPort !== "up";
  return {
    id: rail.id,
    nicName: rail.nicName,
    netdevName: rail.netdevName ?? `eth${rail.id}`,
    leafId: rail.leafId ?? `leaf-rail${rail.id}`,
    leafInterface: rail.leafInterface ?? "swp5",
    adminState: rail.adminState ?? "up",
    nicState: rail.nicState,
    carrierState: rail.carrierState ?? rail.nicState,
    rdmaPortState: rail.rdmaPortState ?? (rail.nicState === "up" ? "active" : "down"),
    switchPort: rail.switchPort,
    switchAdminState: rail.switchAdminState ?? "up",
    switchCarrierState: rail.switchCarrierState ?? (switchFailed ? "down" : "up"),
    protodownReason: rail.protodownReason ?? (rail.switchPort === "error-disabled" ? "linkflap" : null),
    speedGbps: rail.speedGbps ?? 400,
    guid: rail.guid,
    portGuid: rail.portGuid ?? rail.guid.slice(0, -2) + (0x40 + rail.id).toString(16).padStart(2, "0"),
  };
}

export function normalizeRails(rails: RailState[] | undefined): NormalizedLab0Rail[] {
  return (rails ?? []).map(normalizeRail);
}

export function findFailedLab0Rail(rails: RailState[] | undefined) {
  return normalizeRails(rails).find((rail) =>
    rail.switchPort !== "up" || rail.nicState !== "up" || rail.carrierState !== "up" || rail.rdmaPortState !== "active",
  );
}

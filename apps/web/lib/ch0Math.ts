/**
 * Canonical Chapter 0 arithmetic and units.
 *
 * Networking rates use decimal units unless explicitly stated otherwise:
 * 1 byte = 8 bits, 1 Gb = 1e9 bits, and 1 GB = 1e9 bytes.
 * Naming convention: Gbps means gigabits/second; GBps means gigabytes/second.
 */

export const BITS_PER_BYTE = 8

function assertFinite(value: number, name: string) {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`)
}

function assertNonNegative(value: number, name: string) {
  assertFinite(value, name)
  if (value < 0) throw new RangeError(`${name} must be non-negative`)
}

function assertPositive(value: number, name: string) {
  assertFinite(value, name)
  if (value <= 0) throw new RangeError(`${name} must be positive`)
}

function assertInteger(value: number, name: string) {
  assertFinite(value, name)
  if (!Number.isInteger(value)) throw new RangeError(`${name} must be an integer`)
}

function assertNonNegativeInteger(value: number, name: string) {
  assertInteger(value, name)
  if (value < 0) throw new RangeError(`${name} must be non-negative`)
}

function assertPositiveInteger(value: number, name: string) {
  assertInteger(value, name)
  if (value <= 0) throw new RangeError(`${name} must be positive`)
}

export function gbpsToGBps(gbps: number): number {
  assertNonNegative(gbps, "gbps")
  return gbps / BITS_PER_BYTE
}

export const ETHERNET_400G_PER_DIRECTION_Gbps = 400
export const ETHERNET_400G_PER_DIRECTION_GBps = gbpsToGBps(ETHERNET_400G_PER_DIRECTION_Gbps)
export const ETHERNET_400G_FULL_DUPLEX_GBps = 2 * ETHERNET_400G_PER_DIRECTION_GBps

export const NVLINK4_H100_BIDIRECTIONAL_GBps_PER_GPU = 900
export const NVLINK4_H100_PER_DIRECTION_GBps_PER_GPU = NVLINK4_H100_BIDIRECTIONAL_GBps_PER_GPU / 2
export const NVLINK4_TO_400G_NORMALIZED_RATIO =
  NVLINK4_H100_BIDIRECTIONAL_GBps_PER_GPU / ETHERNET_400G_FULL_DUPLEX_GBps

/** Approximate PCIe x16 payload-rate figures per direction, before transaction-level overhead. */
export const PCIE_X16_PER_DIRECTION_GBps = {
  gen3: 15.75,
  gen4: 31.5,
  gen5: 63,
} as const

/** AMD ROCm-documented aggregate peer-link bandwidth metric, not a claim that the physical topology is a simple ring. */
export const AMD_P2P_AGGREGATE_GBps = {
  mi300x: 896,
  mi325x: 896,
  mi350x: 1075.2,
  mi355x: 1075.2,
} as const

/** BF16 uses two bytes per parameter; parameter count may be fractional because it is expressed in billions. */
export function modelWeightsGB(parametersBillions: number, bytesPerParameter = 2): number {
  assertNonNegative(parametersBillions, "parametersBillions")
  assertPositive(bytesPerParameter, "bytesPerParameter")
  return parametersBillions * bytesPerParameter
}

/**
 * Ring AllReduce bytes sent by each rank for an input of sizeBytes per rank.
 * The same quantity is received by each rank. This is not combined send+receive traffic.
 */
export function ringAllReduceSentBytesPerRank(participants: number, sizeBytes: number): number {
  assertInteger(participants, "participants")
  if (participants < 2) throw new RangeError("participants must be at least 2")
  assertNonNegative(sizeBytes, "sizeBytes")
  return 2 * ((participants - 1) / participants) * sizeBytes
}

export function ringAllReduceSentGBPerRank(participants: number, sizeGB: number): number {
  return ringAllReduceSentBytesPerRank(participants, sizeGB)
}

/** Ideal transfer duration; effective bandwidth must already account for real-world overheads. */
export function transferDurationSeconds(sizeGB: number, effectiveBandwidthGBps: number): number {
  assertNonNegative(sizeGB, "sizeGB")
  assertPositive(effectiveBandwidthGBps, "effectiveBandwidthGBps")
  return sizeGB / effectiveBandwidthGBps
}

/** GPU-hours of useful work lost when gpuCount GPUs each lose lostSeconds of progress. */
export function gpuHoursLost(gpuCount: number, lostSeconds: number): number {
  assertNonNegativeInteger(gpuCount, "gpuCount")
  assertNonNegative(lostSeconds, "lostSeconds")
  return (gpuCount * lostSeconds) / 3600
}

/** Simplified independent exponential failure model: aggregate expected interval in hours. */
export function aggregateFailureIntervalHours(meanTimeBetweenFailuresHours: number, deviceCount: number): number {
  assertPositive(meanTimeBetweenFailuresHours, "meanTimeBetweenFailuresHours")
  assertPositiveInteger(deviceCount, "deviceCount")
  return meanTimeBetweenFailuresHours / deviceCount
}

/** Topology capacity ratio for a clearly specified direction and cut. Counts are discrete; rates must be positive. */
export function oversubscriptionRatio(
  downlinkCount: number,
  downlinkRateGbps: number,
  uplinkCount: number,
  uplinkRateGbps: number,
): number {
  assertNonNegativeInteger(downlinkCount, "downlinkCount")
  assertPositiveInteger(uplinkCount, "uplinkCount")
  assertPositive(downlinkRateGbps, "downlinkRateGbps")
  assertPositive(uplinkRateGbps, "uplinkRateGbps")
  const downlinkCapacity = downlinkCount * downlinkRateGbps
  const uplinkCapacity = uplinkCount * uplinkRateGbps
  return downlinkCapacity / uplinkCapacity
}

/** UALink 1.0 uses 200 Gb/s lanes; return decimal GB/s in one direction. */
export function ualinkPerDirectionGBps(laneCount: number): number {
  assertPositiveInteger(laneCount, "laneCount")
  return gbpsToGBps(laneCount * 200)
}

export function financialCost(gpuHours: number, dollarsPerGpuHour: number): number {
  assertNonNegative(gpuHours, "gpuHours")
  assertNonNegative(dollarsPerGpuHour, "dollarsPerGpuHour")
  return gpuHours * dollarsPerGpuHour
}

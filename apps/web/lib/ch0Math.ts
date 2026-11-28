/**
 * Canonical Chapter 0 arithmetic and units.
 *
 * Networking rates in this chapter use decimal units unless explicitly stated
 * otherwise: 1 byte = 8 bits, 1 Gb = 1e9 bits, and 1 GB = 1e9 bytes.
 */

export const BITS_PER_BYTE = 8

export function gbpsToGBps(gbps: number): number {
  return gbps / BITS_PER_BYTE
}

export const ETHERNET_400G_PER_DIRECTION_GBPS = 400
export const ETHERNET_400G_PER_DIRECTION_GBPS_BYTES = gbpsToGBps(ETHERNET_400G_PER_DIRECTION_GBPS)
export const ETHERNET_400G_FULL_DUPLEX_GBPS_BYTES = 2 * ETHERNET_400G_PER_DIRECTION_GBPS_BYTES

export const NVLINK4_H100_BIDIRECTIONAL_GBPS_PER_GPU = 900
export const NVLINK4_H100_PER_DIRECTION_GBPS_PER_GPU = NVLINK4_H100_BIDIRECTIONAL_GBPS_PER_GPU / 2
export const NVLINK4_TO_400G_NORMALIZED_RATIO =
  NVLINK4_H100_BIDIRECTIONAL_GBPS_PER_GPU / ETHERNET_400G_FULL_DUPLEX_GBPS_BYTES

/** Approximate PCIe x16 payload-rate figures per direction, before transaction-level overhead. */
export const PCIE_X16_PER_DIRECTION_GBPS = {
  gen3: 15.75,
  gen4: 31.5,
  gen5: 63,
} as const

export const AMD_P2P_RING_AGGREGATE_GBPS = {
  mi300x: 896,
  mi325x: 896,
  mi350x: 1075.2,
  mi355x: 1075.2,
} as const

/** BF16 uses two bytes per parameter. */
export function modelWeightsGB(parametersBillions: number, bytesPerParameter = 2): number {
  return parametersBillions * bytesPerParameter
}

/**
 * Ring AllReduce bytes sent by each rank for an input of sizeBytes per rank.
 * The same quantity is received by each rank. This is not combined send+receive traffic.
 */
export function ringAllReduceSentBytesPerRank(participants: number, sizeBytes: number): number {
  if (!Number.isFinite(participants) || participants < 2) {
    throw new RangeError("participants must be at least 2")
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
    throw new RangeError("sizeBytes must be non-negative")
  }
  return 2 * ((participants - 1) / participants) * sizeBytes
}

export function ringAllReduceSentGBPerRank(participants: number, sizeGB: number): number {
  return ringAllReduceSentBytesPerRank(participants, sizeGB)
}

/** Ideal transfer duration; effective bandwidth must already account for real-world overheads. */
export function transferDurationSeconds(sizeGB: number, effectiveBandwidthGBps: number): number {
  if (!Number.isFinite(sizeGB) || sizeGB < 0) {
    throw new RangeError("sizeGB must be non-negative")
  }
  if (!Number.isFinite(effectiveBandwidthGBps) || effectiveBandwidthGBps <= 0) {
    throw new RangeError("effectiveBandwidthGBps must be positive")
  }
  return sizeGB / effectiveBandwidthGBps
}

/** GPU-hours of useful work lost when gpuCount GPUs each lose lostSeconds of progress. */
export function gpuHoursLost(gpuCount: number, lostSeconds: number): number {
  if (!Number.isFinite(gpuCount) || gpuCount < 0) {
    throw new RangeError("gpuCount must be non-negative")
  }
  if (!Number.isFinite(lostSeconds) || lostSeconds < 0) {
    throw new RangeError("lostSeconds must be non-negative")
  }
  return (gpuCount * lostSeconds) / 3600
}

/** Simplified independent exponential failure model: aggregate expected interval in hours. */
export function aggregateFailureIntervalHours(meanTimeBetweenFailuresHours: number, deviceCount: number): number {
  if (!Number.isFinite(meanTimeBetweenFailuresHours) || meanTimeBetweenFailuresHours <= 0) {
    throw new RangeError("meanTimeBetweenFailuresHours must be positive")
  }
  if (!Number.isFinite(deviceCount) || deviceCount <= 0) {
    throw new RangeError("deviceCount must be positive")
  }
  return meanTimeBetweenFailuresHours / deviceCount
}

/** Topology capacity ratio for a clearly specified direction and cut. */
export function oversubscriptionRatio(
  downlinkCount: number,
  downlinkRateGbps: number,
  uplinkCount: number,
  uplinkRateGbps: number,
): number {
  const downlinkCapacity = downlinkCount * downlinkRateGbps
  const uplinkCapacity = uplinkCount * uplinkRateGbps
  if (!Number.isFinite(uplinkCapacity) || uplinkCapacity <= 0) {
    throw new RangeError("uplink capacity must be positive")
  }
  if (!Number.isFinite(downlinkCapacity) || downlinkCapacity < 0) {
    throw new RangeError("downlink capacity must be non-negative")
  }
  return downlinkCapacity / uplinkCapacity
}

/** UALink 1.0 uses 200 Gb/s lanes; return decimal GB/s in one direction. */
export function ualinkPerDirectionGBps(laneCount: number): number {
  if (!Number.isFinite(laneCount) || laneCount < 0) {
    throw new RangeError("laneCount must be non-negative")
  }
  return gbpsToGBps(laneCount * 200)
}

export function financialCost(gpuHours: number, dollarsPerGpuHour: number): number {
  if (!Number.isFinite(gpuHours) || gpuHours < 0) {
    throw new RangeError("gpuHours must be non-negative")
  }
  if (!Number.isFinite(dollarsPerGpuHour) || dollarsPerGpuHour < 0) {
    throw new RangeError("dollarsPerGpuHour must be non-negative")
  }
  return gpuHours * dollarsPerGpuHour
}

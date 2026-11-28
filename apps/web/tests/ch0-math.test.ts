import assert from "node:assert/strict"
import test from "node:test"

import {
  aggregateFailureIntervalHours,
  AMD_P2P_RING_AGGREGATE_GBPS,
  ETHERNET_400G_FULL_DUPLEX_GBPS_BYTES,
  ETHERNET_400G_PER_DIRECTION_GBPS_BYTES,
  financialCost,
  gbpsToGBps,
  gpuHoursLost,
  modelWeightsGB,
  NVLINK4_H100_BIDIRECTIONAL_GBPS_PER_GPU,
  NVLINK4_H100_PER_DIRECTION_GBPS_PER_GPU,
  NVLINK4_TO_400G_NORMALIZED_RATIO,
  oversubscriptionRatio,
  PCIE_X16_PER_DIRECTION_GBPS,
  ringAllReduceSentGBPerRank,
  transferDurationSeconds,
  ualinkPerDirectionGBps,
} from "../lib/ch0Math.ts"

test("decimal bits-to-bytes conversion and direction-normalized bandwidth comparison", () => {
  assert.equal(gbpsToGBps(400), 50)
  assert.equal(ETHERNET_400G_PER_DIRECTION_GBPS_BYTES, 50)
  assert.equal(ETHERNET_400G_FULL_DUPLEX_GBPS_BYTES, 100)
  assert.equal(NVLINK4_H100_BIDIRECTIONAL_GBPS_PER_GPU, 900)
  assert.equal(NVLINK4_H100_PER_DIRECTION_GBPS_PER_GPU, 450)
  assert.equal(NVLINK4_TO_400G_NORMALIZED_RATIO, 9)
})

test("PCIe x16 per-direction bandwidth figures are direction-normalized", () => {
  assert.equal(PCIE_X16_PER_DIRECTION_GBPS.gen3, 15.75)
  assert.equal(PCIE_X16_PER_DIRECTION_GBPS.gen4, 31.5)
  assert.equal(PCIE_X16_PER_DIRECTION_GBPS.gen5, 63)
})

test("70B BF16 model weights use decimal GB and exclude training state", () => {
  assert.equal(modelWeightsGB(70, 2), 140)
})

test("ring AllReduce bytes sent per rank use 2(N-1)/N x S", () => {
  assert.equal(ringAllReduceSentGBPerRank(4, 8), 12)
  assert.equal(ringAllReduceSentGBPerRank(8, 14), 24.5)
  assert.equal(ringAllReduceSentGBPerRank(256, 14), 27.890625)
})

test("checkpoint ideal transfer durations match canonical examples", () => {
  assert.equal(transferDurationSeconds(140, 12.5), 11.2)
  assert.equal(transferDurationSeconds(140, 25), 5.6)
  assert.equal(transferDurationSeconds(140, 50), 2.8)
  assert.equal(transferDurationSeconds(140, 100), 1.4)
})

test("GPU-hour calculations use N x T / 3600", () => {
  assert.equal(gpuHoursLost(32_000, 30 * 60), 16_000)
  assert.ok(Math.abs(gpuHoursLost(32_000, 9.8) - 87.11111111111111) < 1e-10)
  assert.ok(Math.abs(financialCost(87.11111111111111, 500) - 43_555.555555555555) < 1e-8)
  assert.equal(financialCost(16_000, 500), 8_000_000)
})

test("simplified failure interval and oversubscription calculations", () => {
  assert.equal(aggregateFailureIntervalHours(10_000, 32_000), 0.3125)
  assert.equal(aggregateFailureIntervalHours(10_000, 32_000) * 60, 18.75)
  assert.equal(oversubscriptionRatio(32, 400, 16, 400), 2)
})

test("UALink lane conversion is bits to bytes per direction", () => {
  assert.equal(ualinkPerDirectionGBps(4), 100)
})

test("AMD peer aggregate metrics remain canonical", () => {
  assert.equal(AMD_P2P_RING_AGGREGATE_GBPS.mi325x, 896)
  assert.equal(AMD_P2P_RING_AGGREGATE_GBPS.mi350x, 1075.2)
})

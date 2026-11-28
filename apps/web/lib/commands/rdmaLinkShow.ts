import type { CommandResult } from '@/types'
import { useLabStore } from '@/store/labStore'
import { findFailedLab0Rail, normalizeRails } from '@/lib/lab0State'

export function rdmaLinkShow(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const rails = normalizeRails(topology.rails)
  const hasNcclContext = topology.ncclTransport !== undefined
    || topology.ncclIbHca !== undefined
    || topology.ncclSocketIfname !== undefined

  // Multi-rail mode: rail-based labs. Output derives from each rail fixture.
  if (rails.length > 0) {
    const degradedRail = findFailedLab0Rail(topology.rails)
    const railAlreadyIdentified =
      useLabStore.getState().lab.conditions.railIdentified === true

    if (degradedRail && railAlreadyIdentified) {
      setCondition('linkConfirmed', true)
      markVerified('linkConfirmed')
    }
    if (degradedRail && useLabStore.getState().lab.labId === 'lab0-failed-rail') {
      setCondition('rdmaEvidence', true)
      markVerified('rdmaEvidence')
    }

    const lines = rails.map(rail => {
      const state = rail.rdmaPortState === 'active' ? 'ACTIVE' : 'DOWN'
      const physical = rail.carrierState === 'up' ? 'LINK_UP' : 'DISABLED'
      const pfcWarning = !topology.pfcEnabled
        ? '\n  WARNING: PFC disabled -- lossless operation not guaranteed'
        : ''
      return (
        `link ${rail.nicName}/1 state ${state} physical_state ${physical}\n`
        + `  type RoCE\n`
        + `  netdev ${rail.netdevName}\n`
        + `  roce_mode: RoCEv2`
        + pfcWarning
      )
    })

    const interpretation = degradedRail
      ? `\n\n[SIMULATION INTERPRETATION — not rdma output] Rail ${degradedRail.id} reports ${degradedRail.rdmaPortState}/${degradedRail.carrierState === 'up' ? 'LINK_UP' : 'DISABLED'} from the host's RDMA port and carrier state. This evidence does not diagnose QP state or application health. ${degradedRail.carrierState === 'up' ? 'A host can retain carrier in a separate switch-side forwarding/protodown scenario, so host output alone cannot prove end-to-end connectivity.' : 'Loss of carrier makes the affected RDMA port unavailable.'}`
      : ''

    return {
      output: `[SIMULATED rdma output — abridged]\n${lines.join('\n\n')}${interpretation}`,
      conceptId: 'rocev2',
      type: 'success',
    }
  }

  if (hasNcclContext) {
    setCondition("rdmaDevicesChecked", true)
    markVerified("rdmaDevicesChecked")

    const output = Array.from({ length: 8 }, (_, index) => (
      `link mlx5_${index}/1 state ACTIVE physical_state LINK_UP\n`
      + `  type RoCE\n`
      + `  netdev eth${index}\n`
      + `  roce_mode: RoCEv2`
    )).join("\n\n")

    return {
      output,
      conceptId: "rocev2",
      type: "success",
    }
  }

  // Single-interface mode: Labs 1 and 2
  const { nic, pfcEnabled } = topology
  const warningLine = nic.state === 'up' && !pfcEnabled
    ? '\n  WARNING: PFC disabled -- lossless operation not guaranteed'
    : ''

  return {
    output: nic.state === 'up'
      ? `link mlx5_0/1 state ACTIVE physical_state LINK_UP\n  type RoCE\n  netdev eth0\n  roce_mode: RoCEv2${warningLine}`
      : `link mlx5_0/1 state DOWN physical_state DISABLED\n  type RoCE\n  netdev eth0`,
    conceptId: 'rocev2',
    type: nic.state === 'up' ? 'success' : 'error',
  }
}

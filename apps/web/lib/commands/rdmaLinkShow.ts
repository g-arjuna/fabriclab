import type { CommandResult } from '@/types'
import { useLabStore } from '@/store/labStore'

export function rdmaLinkShow(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const rails = topology.rails ?? []
  const hasNcclContext = topology.ncclTransport !== undefined
    || topology.ncclIbHca !== undefined
    || topology.ncclSocketIfname !== undefined

  // Multi-rail mode: Lab 0 with 8-rail topology
  if (rails.length > 0) {
    const degradedRail = rails.find(
      (rail) => rail.switchPort !== "up" || rail.nicState !== "up",
    );
    const railAlreadyIdentified =
      useLabStore.getState().lab.conditions.railIdentified === true;

    if (degradedRail && railAlreadyIdentified) {
      setCondition("linkConfirmed", true);
      markVerified("linkConfirmed");
    }

    const lines = rails.map(rail => {
      const pfcWarning = !topology.pfcEnabled
        ? '\n  WARNING: PFC disabled -- lossless operation not guaranteed'
        : ''
      const switchWarning = rail.switchPort === 'error-disabled'
        ? '\n  WARNING: NIC reports ACTIVE but switch port is error-disabled -- traffic not flowing on this rail'
        : ''

      return (
        `link ${rail.nicName}/1 state ACTIVE physical_state LINK_UP\n`
        + `  type RoCE\n`
        + `  netdev eth${rail.id}\n`
        + `  roce_mode: RoCEv2`
        + pfcWarning
        + switchWarning
      )
    })

    return {
      output: lines.join('\n\n'),
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

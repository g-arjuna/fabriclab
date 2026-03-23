import type { CommandResult } from '@/types'
import { useLabStore } from '@/store/labStore'

export function showRdmaLinks(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()

  const rails = topology.rails ?? []

  if (rails.length === 0) {
    return {
      output: 'No rail topology configured for this lab.',
      type: 'info',
    }
  }

  // Only mark linkConfirmed after railIdentified has been set
  // This enforces the diagnostic sequence: topology first, then RDMA state
  const degradedRail = rails.find(r => r.switchPort !== 'up' || r.nicState !== 'up')
  const railAlreadyIdentified = useLabStore.getState().lab.conditions['railIdentified'] === true
  if (degradedRail && railAlreadyIdentified) {
    setCondition('linkConfirmed', true)
    markVerified('linkConfirmed')
  }

  const lines = rails.map(rail => {
    // NIC side is UP even for Rail 3 -- the fault is on the switch side
    // This is the key teaching: NIC shows UP but traffic is not flowing
    const physicalState = rail.nicState === 'up' ? 'LINK_UP' : 'DISABLED'
    const rdmaState = rail.switchPort === 'up' && rail.nicState === 'up'
      ? 'ACTIVE'
      : rail.switchPort === 'error-disabled'
        ? 'ACTIVE' // NIC side still reports UP -- switch side is the issue
        : 'DOWN'

    const warning = rail.switchPort === 'error-disabled'
      ? '\n    WARNING: NIC reports ACTIVE but switch port is error-disabled -- traffic not flowing'
      : ''

    return `link ${rail.nicName}/1 state ${rdmaState} physical_state ${physicalState}
    type RoCE
    netdev eth${rail.id}
    rail: ${rail.id}
    guid: ${rail.guid}${warning}`
  })

  return {
    output: lines.join('\n\n'),
    conceptId: 'rocev2',
    type: 'success',
  }
}

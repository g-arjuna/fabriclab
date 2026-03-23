import type { CommandResult } from '@/types'
import { useLabStore } from '@/store/labStore'

export function showTopology(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()

  const rails = topology.rails ?? []

  if (rails.length === 0) {
    return {
      output: 'No rail topology configured for this lab.',
      type: 'info',
    }
  }

  // Mark railIdentified when user runs this command and there is a degraded rail
  const hasDegradedRail = rails.some(
    r => r.switchPort !== 'up' || r.nicState !== 'up'
  )
  if (hasDegradedRail) {
    setCondition('railIdentified', true)
    markVerified('railIdentified')
  }

  const header = `DGX-Node-01 — Rail topology map (16-node cluster)
  ══════════════════════════════════════════════════════════════
  Rail  NIC       GUID                    NIC state  Switch         Leaf switch
  ══════════════════════════════════════════════════════════════`

  const rows = rails.map(rail => {
    const nicCol = rail.nicName.padEnd(10)
    const guidCol = rail.guid.padEnd(24)
    const nicState = rail.nicState === 'up' ? 'ACTIVE    ' : 'DOWN      '
    const swState = rail.switchPort === 'up'
      ? 'UP            '
      : rail.switchPort === 'error-disabled'
        ? 'ERR-DISABLED  ← fault'
        : rail.switchPort.toUpperCase().padEnd(14)

    return `  ${String(rail.id).padEnd(6)}${nicCol}${guidCol}${nicState}${swState}  leaf-rail${rail.id}`
  }).join('\n')

  const activeCount = rails.filter(r => r.switchPort === 'up' && r.nicState === 'up').length
  const footer = `  ══════════════════════════════════════════════════════════════
  8 rails total  |  ${activeCount}/8 active on DGX-Node-01

  Cluster: 16 DGX H100 nodes × 8 GPUs = 128 GPUs total
  Each leaf switch serves all 16 nodes on that GPU rail.
  Fault scope: One port on leaf-rail3 — only DGX-Node-01 GPU 3 is isolated.
  The other 15 nodes are contributing all 8 GPUs each.

  Next: Run 'show rdma links' to confirm NIC-level view of the fault.
  Then: Switch to leaf-rail3 terminal and run 'show switch port rail3'.`

  return {
    output: `${header}\n${rows}\n${footer}`,
    conceptId: 'rocev2',
    type: 'success',
  }
}

import type { CommandResult } from '@/types'
import { useLabStore } from '@/store/labStore'

export function ibstat(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const rails = topology.rails ?? []

  if (rails.length === 0) {
    const { nic, pfcEnabled } = topology
    const pfcNote = !pfcEnabled
      ? '\n          WARNING: PFC disabled -- lossless operation not guaranteed'
      : ''
    return {
      output: `CA 'mlx5_0'
          CA type: MT4129
          Number of ports: 1
          Firmware version: 28.38.1002
          Hardware version: 0
          Node GUID: 0x506b4b0300a1b200
          System image GUID: 0x506b4b0300a1b203
          Port 1:
                  State: ${nic.state === 'up' ? 'Active' : 'Down'}
                  Physical state: ${nic.state === 'up' ? 'LinkUp' : 'Disabled'}
                  Rate: ${nic.speed}
                  Base lid: 0
                  SM lid:   0
                  Capability mask: 0xa651e848
                  Port GUID: 0x506b4b0300a1b201
                  Link layer: Ethernet${pfcNote}`,
      conceptId: 'rocev2',
      type: 'info',
    }
  }

  const entries = rails.map(rail => {
    const isActive = rail.nicState === 'up'
    const switchNote = rail.switchPort === 'error-disabled'
      ? '\n                  [simulation note follows output]'
      : ''
    const portGuid = rail.guid.slice(0, -2) + '01'

    return `CA '${rail.nicName}'
          CA type: MT4129
          Number of ports: 1
          Firmware version: 28.38.1002
          Hardware version: 0
          Node GUID: ${rail.guid}
          Port 1:
                  State: ${isActive ? 'Active' : 'Down'}${switchNote}
                  Physical state: ${isActive ? 'LinkUp' : 'Disabled'}
                  Rate: 400
                  Base lid: 0
                  SM lid:   0
                  Capability mask: 0xa651e848
                  Port GUID: ${portGuid}
                  Link layer: Ethernet`
  })

  const hasErrDisabled = rails.some((rail) => rail.switchPort === 'error-disabled')
  if (hasErrDisabled) {
    setCondition('nicActiveTrapSeen', true)
    markVerified('nicActiveTrapSeen')
  }

  return {
    output: entries.join('\n\n') + (hasErrDisabled ? '\n\nSimulation interpretation (not ibstat output): ibstat reports RDMA device/port state only. It does not report QP state or application health. In this lab the NIC port remains administratively/link-up while the peer switch interface is operationally down in protodown; those state layers can differ. Inspect the leaf and use QP/application diagnostics separately.' : ''),
    conceptId: 'rocev2',
    type: 'success',
  }
}

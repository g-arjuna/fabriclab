import type { CommandResult } from '@/types'
import { useLabStore } from '@/store/labStore'
import { findFailedLab0Rail, normalizeRails } from '@/lib/lab0State'

export function ibstat(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const rails = normalizeRails(topology.rails)

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
                  Port GUID: 0x506b4b0300a1c240
                  Link layer: Ethernet${pfcNote}`,
      conceptId: 'rocev2',
      type: 'info',
    }
  }

  const entries = rails.map(rail => {
    const isActive = rail.rdmaPortState === 'active'
    return `CA '${rail.nicName}'
          CA type: MT4129
          Number of ports: 1
          Firmware version: 28.38.1002
          Hardware version: 0
          Node GUID: ${rail.guid}
          Port 1:
                  State: ${isActive ? 'Active' : 'Down'}
                  Physical state: ${rail.carrierState === 'up' ? 'LinkUp' : 'Disabled'}
                  Rate: ${rail.speedGbps}
                  Base lid: 0
                  SM lid:   0
                  Capability mask: 0xa651e848
                  Port GUID: ${rail.portGuid}
                  Link layer: Ethernet`
  })

  const degradedRail = findFailedLab0Rail(topology.rails)
  if (degradedRail) {
    setCondition('nicActiveTrapSeen', true)
    markVerified('nicActiveTrapSeen')
  }

  return {
    output: `[SIMULATED ibstat output — abridged]\n${entries.join('\n\n')}` + (degradedRail ? `\n\n[SIMULATION INTERPRETATION — not ibstat output]\nibstat reports RDMA device/port state only. It does not report QP state, collective progress, or application health. Rail ${degradedRail.id} is ${degradedRail.rdmaPortState} with physical state ${degradedRail.carrierState === 'up' ? 'LinkUp' : 'Disabled'}. ${degradedRail.carrierState === 'up' ? 'This host can retain carrier while the switch-side interface is protodown and not forwarding traffic.' : 'The simulated carrier is unavailable, so the host port cannot remain physically up.'}` : ''),
    conceptId: 'rocev2',
    type: 'success',
  }
}

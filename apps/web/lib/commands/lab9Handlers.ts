// lab9Handlers.ts
// New command handlers required for lab9-errdisable-recovery.
//
// Requires:
//   1. TopologyState extended with:  opticReplaced?: boolean
//   2. New conditions in formatters.ts:
//        railIdentified (already exists in lab0),
//        nicActiveTrapSeen, errDisabledConfirmed,
//        opticReplaced, portReenabled, railVerified
//   3. New commands added to commandCatalog.ts KNOWN_COMMANDS:
//        "replace optic rail2", "no shutdown"
//   4. New EXACT_HANDLERS entries in commandHandler.ts

import type { CommandResult } from '@/types'
import { useLabStore } from '@/store/labStore'

// ── ibstat for lab9 ─────────────────────────────────────────────────────────
// The ibstat output for lab9 uses the existing ibstat.ts multi-rail handler
// which already shows the "NIC reports Active but switch port is error-disabled"
// warning on Rail 2.
//
// However we need to set nicActiveTrapSeen when the learner runs ibstat
// and sees the rail 2 Active state despite err-disabled switch port.
// Add this setCondition call to ibstat.ts for the multi-rail path:
//
//   const errDisabledRails = rails.filter(r => r.switchPort === 'error-disabled')
//   if (errDisabledRails.length > 0) {
//     setCondition('nicActiveTrapSeen', true)
//     markVerified('nicActiveTrapSeen')
//   }

// ── showSwitchPort for rail2 (lab9) ─────────────────────────────────────────
// The existing showSwitchPort handler uses TopologyState.rails to determine
// port state. Rail 2 switchPort='error-disabled' will already trigger the
// err-disabled output. We just need to wire the new conditions.
//
// ADD to showSwitchPort.ts when switchPort === 'error-disabled':
//   store.setCondition('errDisabledConfirmed', true)
//   store.markVerified('errDisabledConfirmed')
//   store.setCondition('railIdentified', true)
//   store.markVerified('railIdentified')

// ── replace optic rail2 ─────────────────────────────────────────────────────
// Simulates replacing the dirty optical transceiver on Rail 2.
// Sets opticReplaced=true. Port stays err-disabled until 'no shutdown'.

export function replaceOpticRail2(): CommandResult {
  const { topology, setTopology, setCondition, markVerified } = useLabStore.getState()
  const rails = topology.rails ?? []
  const rail2 = rails.find(r => r.id === 2)

  if (!rail2) {
    return { output: 'Rail 2 not found in topology.', type: 'error' }
  }

  if ((topology as any).opticReplaced) {
    return {
      output: `Optic on leaf-rail2 swp3 ↔ DGX mlx5_2 already replaced.
Port is still Err-Disabled until cleared.
Run: no shutdown`,
      type: 'info',
    }
  }

  setTopology({ opticReplaced: true } as any)
  setCondition('opticReplaced', true)
  markVerified('opticReplaced')

  return {
    output: `Replacing optical transceiver on leaf-rail2 swp3 (Rail 2 connection)...

  Physical action: removed dirty OSFP transceiver
  IPA cleaning of connector receptacle...
  Inserted new OSFP 400G SR4 transceiver...
  Transceiver detected: OSFP 400G SR4, vendor=NVIDIA, rev=A2

  Port physical signal: restored
  Link layer:           pending (port still Err-Disabled)

The port is still administratively disabled (Err-Disabled state from
the previous link-flap event). The switch will not forward traffic
until the err-disable is explicitly cleared.

Next step: run 'no shutdown' to re-enable the port.`,
    conceptId: 'rocev2',
    type: 'success',
  }
}

// ── no shutdown ─────────────────────────────────────────────────────────────
// Clears the err-disable state on Rail 2, restoring the port to Active.
// Only allowed after optic has been replaced.

export function noShutdown(): CommandResult {
  const { topology, setTopology, setCondition, markVerified } = useLabStore.getState()
  const rails = topology.rails ?? []
  const opticReplaced = (topology as any).opticReplaced ?? false

  if (!opticReplaced) {
    return {
      output: `no shutdown: port re-enable attempted but optic is still dirty.

The link-flap condition that caused this port to enter Err-Disabled
state has not been resolved. Re-enabling without fixing the root cause
will result in the port immediately re-entering Err-Disabled.

Fix the physical layer first:
  replace optic rail2    ← replace the dirty optical transceiver

Then re-run: no shutdown`,
      type: 'error',
    }
  }

  // Update rail 2 switchPort from 'error-disabled' to 'up'
  const updatedRails = rails.map(r =>
    r.id === 2 ? { ...r, switchPort: 'up' as const } : r
  )
  setTopology({ rails: updatedRails })
  setCondition('portReenabled', true)
  markVerified('portReenabled')
  setCondition('railVerified', true)
  markVerified('railVerified')

  return {
    output: `leaf-rail2 # no shutdown
  interface swp3: clearing err-disable state
  interface swp3: re-enabling port
  interface swp3: link negotiation starting...
  interface swp3: 400G link up (OSFP SR4)
  interface swp3: state → Active

Rail 2 port re-enabled successfully.

Verify recovery:
  show switch port rail2    ← confirm swp3 = Active (no longer Err-Disabled)
  show rdma links           ← from DGX: confirm mlx5_2 Active, no warnings
  show topology             ← from DGX: confirm Rail 2 fully green`,
    conceptId: 'rocev2',
    type: 'success',
  }
}

// ── ethtool -S eth2 for lab9 ─────────────────────────────────────────────────
// Rail 2 NIC stats. Before recovery: link up but zero traffic (switch not
// forwarding). After recovery: normal counters.

export function ethtoolStatsEth2(): CommandResult {
  const { topology } = useLabStore.getState()
  const rails = topology.rails ?? []
  const rail2 = rails.find(r => r.id === 2)
  const isErrDisabled = rail2?.switchPort === 'error-disabled'

  return {
    output: `NIC statistics (ConnectX-7 · eth2 / mlx5_2 — Rail 2):
  rx_prio3_pause:       0
  tx_prio3_pause:       0
  rx_ecn_marked_pkts:   0
  tx_discards_phy:      ${isErrDisabled ? '0' : '0'}
  link_speed:           400Gb/s
  link_state:           up

${isErrDisabled
  ? `NOTE: NIC reports link UP — physical signal present on the cable.
  tx_discards_phy: 0 — the NIC is not dropping; it is not receiving traffic.
  This is consistent with the switch port being Err-Disabled:
  the cable carries signal but the switch is not forwarding frames.

  The NIC cannot detect the switch-side fault. Check the switch:
  → Switch to leaf-rail2 terminal and run: show switch port rail2`
  : `Rail 2 healthy. Link active, traffic flowing normally.`}`,
    conceptId: 'rocev2',
    type: 'info',
  }
}

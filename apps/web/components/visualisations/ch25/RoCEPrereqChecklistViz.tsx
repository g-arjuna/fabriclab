'use client'
import { useState } from 'react'

interface CheckItem {
  id: number
  label: string
  short: string
  status: 'pass' | 'fail' | 'unchecked'
  failDetail: string
  passDetail: string
  command: string
}

const ITEMS: CheckItem[] = [
  {
    id: 1,
    label: 'MTU = 9000 bytes end-to-end',
    short: 'Jumbo Frames',
    status: 'unchecked',
    failDetail: 'RoCEv2 BW collapses to ~13% of line rate. Silent failure â€” ib_write_bw runs without error but reports ~12 GB/s instead of 46.8 GB/s.',
    passDetail: 'All hops: NIC, leaf, spine, storage leaf â€” configured for MTU 9000. IB MTU will negotiate to 4096 (fits within 9000-byte Ethernet frame).',
    command: 'ip link show eth0 | grep mtu',
  },
  {
    id: 2,
    label: 'DSCP 26 trusted â†’ TC3 (lossless)',
    short: 'DSCP Trust',
    status: 'unchecked',
    failDetail: 'RoCEv2 frames land in TC0 (lossy default queue). No PFC protection. Under congestion, frames are dropped and NACK storms follow.',
    passDetail: 'Switch trusts NIC-stamped DSCP 26 and maps it to TC3. The lossless queue with PFC protection handles all RoCEv2 training traffic.',
    command: 'nv show qos trust dscp-map',
  },
  {
    id: 3,
    label: 'PFC enabled on priority 3 only',
    short: 'PFC Priority 3',
    status: 'unchecked',
    failDetail: 'Lossless guarantee broken. Under congestion, TC3 frames are dropped, triggering Go-Back-N retransmissions and millisecond latency spikes.',
    passDetail: 'IEEE 802.1Qbb PAUSE frames sent on priority 3 only. All other priorities remain lossy. Buffer starvation cascades prevented.',
    command: 'nv show qos pfc',
  },
  {
    id: 4,
    label: 'ECN enabled on TC3 egress queues',
    short: 'ECN Enabled',
    status: 'unchecked',
    failDetail: 'DCQCN feedback loop never engages. PFC becomes the only congestion mechanism. Under multi-flow load, continuous PFC leads to deadlock.',
    passDetail: 'Spectrum-4 ASIC marks CE bits at wire speed when TC3 queue > min_threshold. DCQCN rate-limits senders before PFC ever fires.',
    command: 'nv show qos ecn profile roce',
  },
  {
    id: 5,
    label: 'Lossless headroom carved from buffer',
    short: 'Headroom Reserved',
    status: 'unchecked',
    failDetail: 'TC3 queue overflow before PFC triggers. Frames dropped in supposedly lossless queue. ib_write_lat p99 spikes to >10Âµs.',
    passDetail: '~98 KB headroom per port reserved (for 5m DAC cable). Total ~6 MB of 48 MB Spectrum-4 buffer dedicated to lossless TC3 operations.',
    command: 'cl-resource-query',
  },
  {
    id: 6,
    label: 'CNP DSCP 48 â†’ TC6 (SP, PFC disabled)',
    short: 'CNP TC6 SP',
    status: 'unchecked',
    failDetail: 'DCQCN deadlock: CNP packets paused by PFC â†’ sender never receives rate-reduction signal â†’ TC3 fills â†’ permanent PFC storm.',
    passDetail: 'CNP on TC6 Strict Priority, never PFC-paused. DCQCN feedback loop always has a clear path back to the sender for rate-limiting signals.',
    command: 'nv show qos scheduler',
  },
]

export default function RoCEPrereqChecklistViz() {
  const [items, setItems] = useState<CheckItem[]>(ITEMS)
  const [selected, setSelected] = useState<number | null>(null)

  const toggle = (id: number, status: 'pass' | 'fail') => {
    setItems(prev => prev.map(it =>
      it.id === id ? { ...it, status: it.status === status ? 'unchecked' : status } : it
    ))
  }

  const allPass = items.every(i => i.status === 'pass')
  const anyFail = items.some(i => i.status === 'fail')
  const passCount = items.filter(i => i.status === 'pass').length

  return (
    <div style={{
      background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 12,
      padding: '20px 24px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: '#e2e8f0', maxWidth: 680, margin: '24px auto',
    }}>
      <div style={{ fontSize: 13, color: '#7c8db5', marginBottom: 4, letterSpacing: '0.08em' }}>
        INTERACTIVE
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#60a5fa', marginBottom: 16 }}>
        RoCE Pre-Flight Prerequisites Checklist
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 8, background: '#161928', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(passCount / items.length) * 100}%`,
            background: allPass ? '#76e5b5' : anyFail ? '#f87171' : '#60a5fa',
            borderRadius: 4, transition: 'width 0.4s ease',
          }} />
        </div>
        <div style={{ fontSize: 13, color: '#7c8db5', minWidth: 60 }}>
          {passCount}/{items.length} ready
        </div>
      </div>

      {allPass && (
        <div style={{
          background: '#0d2a1f', border: '1px solid #76e5b5', borderRadius: 8,
          padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#76e5b5',
        }}>
          âœ“ All prerequisites met â€” fabric is RoCE-ready. Proceed to NVUE configuration.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item) => {
          const isSelected = selected === item.id
          const statusColor = item.status === 'pass' ? '#76e5b5' : item.status === 'fail' ? '#f87171' : '#4a5568'
          const bgColor = item.status === 'pass' ? '#0d2a1f' : item.status === 'fail' ? '#2a0f0f' : '#161928'
          const borderColor = item.status === 'pass' ? '#76e5b5' : item.status === 'fail' ? '#f87171' : '#2a2d3e'

          return (
            <div key={item.id} style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }}
                onClick={() => setSelected(isSelected ? null : item.id)}>
                <div style={{
                  width: 22, height: 22, borderRadius: 11, background: statusColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, flexShrink: 0, color: '#0f1117', fontWeight: 700,
                }}>
                  {item.status === 'pass' ? 'âœ“' : item.status === 'fail' ? 'âœ—' : item.id}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: '#7c8db5', marginTop: 2 }}>{item.short}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={e => { e.stopPropagation(); toggle(item.id, 'pass') }}
                    style={{
                      padding: '3px 10px', borderRadius: 5, fontSize: 11, cursor: 'pointer',
                      background: item.status === 'pass' ? '#76e5b5' : 'transparent',
                      border: `1px solid ${item.status === 'pass' ? '#76e5b5' : '#2a2d3e'}`,
                      color: item.status === 'pass' ? '#0f1117' : '#7c8db5', fontFamily: 'inherit',
                    }}>PASS</button>
                  <button onClick={e => { e.stopPropagation(); toggle(item.id, 'fail') }}
                    style={{
                      padding: '3px 10px', borderRadius: 5, fontSize: 11, cursor: 'pointer',
                      background: item.status === 'fail' ? '#f87171' : 'transparent',
                      border: `1px solid ${item.status === 'fail' ? '#f87171' : '#2a2d3e'}`,
                      color: item.status === 'fail' ? '#0f1117' : '#7c8db5', fontFamily: 'inherit',
                    }}>FAIL</button>
                </div>
              </div>
              {isSelected && (
                <div style={{ borderTop: `1px solid ${borderColor}`, padding: '12px 14px', background: '#0d0f18' }}>
                  <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 6 }}>VERIFY WITH:</div>
                  <div style={{ background: '#161928', border: '1px solid #2a2d3e', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: '#76e5b5', marginBottom: 10 }}>
                    $ {item.command}
                  </div>
                  {item.status === 'fail' ? (
                    <div>
                      <div style={{ fontSize: 11, color: '#f87171', marginBottom: 4 }}>WHAT BREAKS IF WRONG:</div>
                      <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 }}>{item.failDetail}</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 11, color: '#76e5b5', marginBottom: 4 }}>WHAT CORRECT LOOKS LIKE:</div>
                      <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 }}>{item.passDetail}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: '#4a5568', textAlign: 'center' }}>
        Click any item to expand Â· Toggle PASS/FAIL to track your pre-flight state
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'

interface Scenario {
  id: string
  label: string
  symptom: string
  counters: { name: string; value: string; flag: boolean }[]
  rootCause: string
  fix: string[]
  color: string
}

const SCENARIOS: Scenario[] = [
  {
    id: 'A', label: 'DCQCN not triggering', color: '#fbbf24',
    symptom: 'Single-flow ib_write_bw OK (~46 GB/s). Multi-flow degrades to ~12 GB/s per flow. ethtool shows tx_ecn_marked_pkts=0 despite sustained congestion.',
    counters: [
      { name: 'tx_ecn_marked_pkts', value: '0', flag: true },
      { name: 'rx_pfc_xoff_frames_priority_3', value: '84291', flag: true },
      { name: 'tx_retry_exceeded', value: '0', flag: false },
      { name: 'ib_write_bw (multi-flow)', value: '12.3 GB/s', flag: true },
    ],
    rootCause: 'ECN min_threshold set above TC3 buffer capacity (e.g., 10 MB on a 6 MB carved lossless pool). ECN never marks. DCQCN feedback loop never fires. PFC becomes the only congestion mechanism.',
    fix: [
      'nv show qos ecn profile roce  â† check min-threshold value',
      'cl-resource-query  â† confirm available lossless buffer',
      'nv set qos ecn profile roce min-threshold 500000',
      'nv set qos ecn profile roce max-threshold 1500000',
      'nv config apply',
      'ethtool -S swp1 | grep ecn  â† verify tx_ecn_marked_pkts now incrementing',
    ],
  },
  {
    id: 'B', label: 'PFC deadlock (watchdog fires)', color: '#f87171',
    symptom: 'Training job runs 20 minutes, then throughput drops to zero within 200ms. ib_write_bw stalls completely. Watchdog counter increments on switch.',
    counters: [
      { name: 'tx_ecn_marked_pkts', value: '0', flag: true },
      { name: 'pfc_watchdog_fires', value: '3', flag: true },
      { name: 'rx_pfc_xoff_frames_priority_3', value: '284739', flag: true },
      { name: 'tx_retry_exceeded', value: '8821', flag: true },
    ],
    rootCause: 'ECN not configured (or threshold too high). PFC fires continuously. CNP packets stuck in paused queue. DCQCN loop broken. NACK/retransmit cycle fills lossless queue. Deadlock. Watchdog breaks it by dropping frames.',
    fix: [
      'nv show interface swp1 counters pfc  â† confirm watchdog fires',
      'nv show qos ecn profile roce  â† ECN likely missing or wrong',
      'nv set qos ecn profile roce min-threshold 500000',
      'nv set qos ecn profile roce max-threshold 1500000',
      'nv set interface swp1-32 qos egress-queue-mapping traffic-class 3 ecn on',
      'nv config apply',
    ],
  },
  {
    id: 'C', label: 'Low ib_write_bw (MTU mismatch)', color: '#f97316',
    symptom: 'Links PORT_ACTIVE, no ethtool errors. ib_write_bw single-flow reports ~12 GB/s. QP state machine transitions successfully. CloudAI also shows ~26% of expected throughput.',
    counters: [
      { name: 'ib_write_bw (single-flow)', value: '12.21 GB/s', flag: true },
      { name: 'active_mtu (ibv_devinfo)', value: '512 (3) = 1024B', flag: true },
      { name: 'tx_ecn_marked_pkts', value: '0', flag: false },
      { name: 'tx_retry_exceeded', value: '0', flag: false },
    ],
    rootCause: 'MTU mismatch: Ethernet interface on DGX node or switch port set to 1500 bytes. IB path MTU negotiates to 1024 bytes (MTU encoding 3). BW = ~12 GB/s â‰ˆ 26% of 400GbE line rate.',
    fix: [
      'ip link show eth0 | grep mtu  â† on DGX node',
      'nv show interface swp1 link  â† on leaf switch',
      'ip link set eth0 mtu 9000  â† on DGX node (all nodes)',
      'nv set interface swp1-32 link mtu 9000',
      'nv config apply',
      'ibv_devinfo -d mlx5_0 | grep active_mtu  â† expect 4096 (5)',
      'ib_write_bw -d mlx5_0 --iters 5000 --size 65536 <peer>  â† expect 46.8 GB/s',
    ],
  },
  {
    id: 'D', label: 'CNP storm (ECN thresholds too low)', color: '#a78bfa',
    symptom: 'tx_ecn_marked_pkts extremely high (millions/second). CNP rate very high. ib_write_bw oscillates between 30â€“46 GB/s every 2â€“3 seconds. GPU training throughput unstable.',
    counters: [
      { name: 'tx_ecn_marked_pkts/sec', value: '14,284,739', flag: true },
      { name: 'rx_pfc_xoff_frames', value: '0', flag: false },
      { name: 'tx_retry_exceeded', value: '0', flag: false },
      { name: 'ib_write_bw (oscillating)', value: '30â€“46 GB/s', flag: true },
    ],
    rootCause: 'ECN min_threshold too low (e.g., 4 KB). Every multi-flow burst deeper than 4 KB marks all packets. DCQCN over-reacts, rate-limits to near-zero. Traffic drains, flows restart, burst repeats. Classic sawtooth BW pattern.',
    fix: [
      'nv show qos ecn profile roce  â† check min-threshold',
      '# If min-threshold < 100KB, it is too aggressive',
      'nv set qos ecn profile roce min-threshold 500000',
      'nv set qos ecn profile roce max-threshold 1500000',
      'nv config apply',
      'ethtool -S swp1 | grep ecn  â† verify marking rate drops to reasonable level',
    ],
  },
]

export default function RoCEScenarioTroubleshootViz() {
  const [activeScenario, setActiveScenario] = useState('A')
  const [showFix, setShowFix] = useState(false)
  const scenario = SCENARIOS.find(s => s.id === activeScenario)!

  return (
    <div style={{
      background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 12,
      padding: '20px 24px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: '#e2e8f0', maxWidth: 680, margin: '24px auto',
    }}>
      <div style={{ fontSize: 13, color: '#7c8db5', marginBottom: 4, letterSpacing: '0.08em' }}>DECISION TOOL</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#60a5fa', marginBottom: 16 }}>RoCE Misconfiguration Scenario Troubleshooter</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {SCENARIOS.map(s => (
          <button key={s.id} onClick={() => { setActiveScenario(s.id); setShowFix(false) }} style={{ flex: 1, padding: '8px 6px', borderRadius: 8, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', background: activeScenario === s.id ? s.color : '#161928', border: `1px solid ${activeScenario === s.id ? s.color : '#2a2d3e'}`, color: activeScenario === s.id ? '#0f1117' : '#7c8db5', fontWeight: activeScenario === s.id ? 700 : 400, textAlign: 'center', lineHeight: 1.3 }}>
            Scenario {s.id}<br /><span style={{ fontSize: 9 }}>{s.label.split(' ').slice(0, 2).join(' ')}</span>
          </button>
        ))}
      </div>

      <div style={{ background: '#161928', border: '1px solid #2a2d3e', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 4 }}>SYMPTOM</div>
        <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 }}>{scenario.symptom}</div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 6 }}>COUNTER SIGNATURES</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {scenario.counters.map(c => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, background: c.flag ? '#1a0a0a' : '#0f1a0f', border: `1px solid ${c.flag ? '#f87171' : '#76e5b5'}`, borderRadius: 6, padding: '6px 10px' }}>
              <div style={{ fontSize: 11, color: c.flag ? '#f87171' : '#76e5b5', width: 12 }}>{c.flag ? 'âœ—' : 'âœ“'}</div>
              <div style={{ flex: 1, fontSize: 11, color: '#e2e8f0' }}>{c.name}</div>
              <div style={{ fontSize: 11, color: c.flag ? '#f87171' : '#76e5b5', fontWeight: 700 }}>{c.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#1a0f00', border: `1px solid ${scenario.color}`, borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: scenario.color, marginBottom: 4 }}>ROOT CAUSE</div>
        <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 }}>{scenario.rootCause}</div>
      </div>

      <button onClick={() => setShowFix(f => !f)} style={{ width: '100%', padding: '8px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', background: showFix ? '#0d2a1f' : '#161928', border: `1px solid ${showFix ? '#76e5b5' : '#2a2d3e'}`, color: showFix ? '#76e5b5' : '#7c8db5', marginBottom: showFix ? 10 : 0 }}>
        {showFix ? 'â–² Hide Fix Commands' : 'â–¼ Show Fix Commands'}
      </button>

      {showFix && (
        <div style={{ background: '#0d0f18', border: '1px solid #76e5b5', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 10, color: '#76e5b5', marginBottom: 8 }}>REMEDIATION</div>
          {scenario.fix.map((line, i) => (
            <div key={i} style={{ fontSize: 11, lineHeight: 1.8 }}>
              {line.startsWith('#') ? (
                <span style={{ color: '#4a5568' }}>{line}</span>
              ) : (
                <>
                  <span style={{ color: '#7c8db5' }}>$ </span>
                  <span style={{ color: '#76e5b5' }}>{line.split('  ')[0]}</span>
                  {line.includes('  ') && <span style={{ color: '#4a5568' }}>  {line.split('  ').slice(1).join('  ')}</span>}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

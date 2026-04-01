'use client'
import { useState } from 'react'

/**
 * HPCCINTPacketViz
 * Shows an HPCC packet traversing a 4-hop path.
 * Each hop switch inserts an INT record. The receiver reads all hop records.
 * Interactive: click on each hop to see INT data inserted. 
 * Adjust congestion at each hop to see rate calculation change.
 */

interface HopState {
  name: string
  txRateGbps: number
  queueKB: number
  hopLatencyNs: number
  color: string
}

const DEFAULT_HOPS: HopState[] = [
  { name: 'Leaf-01', txRateGbps: 380, queueKB: 12, hopLatencyNs: 280, color: '#76e5b5' },
  { name: 'Spine-01', txRateGbps: 395, queueKB: 4, hopLatencyNs: 290, color: '#60a5fa' },
  { name: 'Spine-02', txRateGbps: 340, queueKB: 890, hopLatencyNs: 310, color: '#f87171' },
  { name: 'Leaf-02', txRateGbps: 390, queueKB: 8, hopLatencyNs: 285, color: '#76e5b5' },
]

const LINE_RATE = 400

export default function HPCCINTPacketViz() {
  const [hops, setHops] = useState<HopState[]>(DEFAULT_HOPS)
  const [selectedHop, setSelectedHop] = useState<number>(2)

  const updateHop = (idx: number, field: keyof HopState, val: number) => {
    setHops(prev => prev.map((h, i) => i === idx ? { ...h, [field]: val } : h))
  }

  // HPCC rate calculation: for each hop, compute inflight
  const hopResults = hops.map(h => {
    const bwBytesPerNs = (h.txRateGbps * 1e9) / 8 / 1e9  // bytes/ns
    const inflight = bwBytesPerNs * h.hopLatencyNs + h.queueKB * 1024
    const targetBW = (LINE_RATE * 1e9) / 8 / 1e9
    const targetInflight = targetBW * (h.hopLatencyNs + 5000)  // +5µs queuing budget
    const utilisation = inflight / targetInflight
    const rateMultiplier = Math.max(0.1, 1 - utilisation + 1)
    return { inflight, utilisation, rateMultiplier }
  })

  const bottleneckIdx = hopResults.reduce((maxIdx, h, i, arr) =>
    h.utilisation > arr[maxIdx].utilisation ? i : maxIdx, 0)

  // Compute INT overhead
  const intBytesPerHop = 20
  const totalIntOverhead = hops.length * intBytesPerHop
  const msgSizes = [512, 4096, 65536, 1048576]

  return (
    <div
      style={{
        background: '#0f1117',
        border: '1px solid #2a2d3e',
        borderRadius: 12,
        padding: '20px 24px',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        color: '#e2e8f0',
        maxWidth: 640,
        margin: '24px auto',
      }}
    >
      <div style={{ fontSize: 13, color: '#7c8db5', marginBottom: 4, letterSpacing: '0.08em' }}>
        INTERACTIVE SIMULATION
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#fbbf24', marginBottom: 4 }}>
        HPCC: In-Band Network Telemetry Packet Path
      </div>
      <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 16 }}>
        Each switch hop inserts INT telemetry into the packet. Click a hop to tune its congestion state.
      </div>

      {/* Packet path SVG */}
      <svg viewBox="0 0 560 90" style={{ width: '100%', maxWidth: 560, display: 'block', marginBottom: 16 }}>
        {/* Host src */}
        <rect x={4} y={28} width={52} height={34} rx={6} fill="#1a1f2e" stroke="#2a2d3e" />
        <text x={30} y={42} fontSize={9} fill="#76e5b5" textAnchor="middle" fontWeight="bold">GPU</text>
        <text x={30} y={54} fontSize={8} fill="#4a5568" textAnchor="middle">sender</text>

        {/* Arrows between hops */}
        {[0, 1, 2, 3].map(i => {
          const x1 = 60 + i * 110
          const x2 = x1 + 60
          const midX = (x1 + x2) / 2
          return (
            <g key={i}>
              <line x1={x1} y1={45} x2={x2} y2={45} stroke="#334155" strokeWidth={2} />
              <polygon points={`${x2},45 ${x2-6},41 ${x2-6},49`} fill="#334155" />
            </g>
          )
        })}

        {/* Switch hops */}
        {hops.map((hop, i) => {
          const x = 64 + i * 110
          const isSelected = selectedHop === i
          const isBottleneck = bottleneckIdx === i
          const borderColor = isBottleneck ? '#f87171' : isSelected ? '#fbbf24' : '#2a2d3e'
          const bgColor = isSelected ? '#1e2a1a' : '#161928'
          const congPct = Math.min(100, (hop.queueKB / 1000) * 100)
          return (
            <g key={i} style={{ cursor: 'pointer' }} onClick={() => setSelectedHop(i)}>
              <rect x={x} y={14} width={46} height={62} rx={6}
                fill={bgColor} stroke={borderColor} strokeWidth={isSelected ? 2 : 1} />
              {/* INT record being inserted */}
              <rect x={x + 3} y={17} width={40} height={10} rx={3}
                fill={hop.color} fillOpacity={0.3} />
              <text x={x + 23} y={25} fontSize={7} fill={hop.color} textAnchor="middle">INT #{i + 1}</text>
              {/* Switch name */}
              <text x={x + 23} y={36} fontSize={8} fill="#e2e8f0" textAnchor="middle" fontWeight="bold">
                {hop.name}
              </text>
              {/* Queue bar */}
              <rect x={x + 6} y={40} width={34} height={8} rx={2} fill="#1e2130" />
              <rect x={x + 6} y={40} width={34 * Math.min(1, hop.queueKB / 1000)} height={8} rx={2}
                fill={hop.queueKB > 500 ? '#f87171' : '#76e5b5'} />
              <text x={x + 23} y={62} fontSize={7.5} fill="#7c8db5" textAnchor="middle">
                {hop.queueKB}KB
              </text>
              {isBottleneck && (
                <text x={x + 23} y={73} fontSize={7} fill="#f87171" textAnchor="middle">⚠ BOTTLENECK</text>
              )}
            </g>
          )
        })}

        {/* Final arrow to receiver */}
        <line x1={504} y1={45} x2={550} y2={45} stroke="#334155" strokeWidth={2} />
        <polygon points="550,45 544,41 544,49" fill="#334155" />

        {/* Host dst */}
        <rect x={502} y={28} width={54} height={34} rx={6} fill="#1a1f2e" stroke="#2a2d3e" />
        <text x={529} y={42} fontSize={9} fill="#fbbf24" textAnchor="middle" fontWeight="bold">GPU</text>
        <text x={529} y={54} fontSize={8} fill="#4a5568" textAnchor="middle">receiver</text>
      </svg>

      {/* Selected hop detail */}
      {selectedHop !== null && (
        <div style={{
          background: '#161928',
          border: `1px solid ${hops[selectedHop].color}55`,
          borderRadius: 10,
          padding: '14px 16px',
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: hops[selectedHop].color, marginBottom: 12 }}>
            Editing: {hops[selectedHop].name}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, color: '#7c8db5' }}>TX RATE: {hops[selectedHop].txRateGbps} Gbps</span>
              <input type="range" min={100} max={400} step={10} value={hops[selectedHop].txRateGbps}
                onChange={e => updateHop(selectedHop, 'txRateGbps', Number(e.target.value))}
                style={{ accentColor: hops[selectedHop].color }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, color: '#7c8db5' }}>QUEUE DEPTH: {hops[selectedHop].queueKB} KB</span>
              <input type="range" min={0} max={2000} step={50} value={hops[selectedHop].queueKB}
                onChange={e => updateHop(selectedHop, 'queueKB', Number(e.target.value))}
                style={{ accentColor: '#f87171' }} />
            </label>
          </div>

          {/* INT record for this hop */}
          <div style={{
            marginTop: 10, background: '#0d0f18', borderRadius: 6, padding: '8px 10px',
            fontSize: 10, color: '#7c8db5', fontFamily: 'monospace'
          }}>
            <div style={{ color: '#fbbf24', marginBottom: 4 }}>INT record #{selectedHop + 1}:</div>
            <div>tx_rate:          {hops[selectedHop].txRateGbps} Gbps</div>
            <div>queue_occupancy:  {hops[selectedHop].queueKB} KB</div>
            <div>hop_latency:      {hops[selectedHop].hopLatencyNs} ns</div>
            <div style={{ marginTop: 4, color: '#60a5fa' }}>
              inflight_bytes:   {hopResults[selectedHop].inflight.toFixed(0)} bytes
            </div>
            <div style={{ color: hopResults[selectedHop].utilisation > 1 ? '#f87171' : '#76e5b5' }}>
              utilisation:      {(hopResults[selectedHop].utilisation * 100).toFixed(1)}%
              {hopResults[selectedHop].utilisation > 1 ? '  ← CONGESTED' : '  ← OK'}
            </div>
          </div>
        </div>
      )}

      {/* INT overhead table */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 8 }}>
          INT overhead ({hops.length} hops × {intBytesPerHop}B = {totalIntOverhead}B per packet):
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
          {msgSizes.map(sz => (
            <div key={sz} style={{
              background: '#161928', border: '1px solid #2a2d3e', borderRadius: 6,
              padding: '6px 8px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 9, color: '#7c8db5' }}>
                {sz >= 1024 ? `${sz / 1024}KB` : `${sz}B`}
              </div>
              <div style={{
                fontSize: 13, fontWeight: 700,
                color: totalIntOverhead / sz > 0.1 ? '#f87171' : '#76e5b5',
              }}>
                {((totalIntOverhead / sz) * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        background: '#0d1424', border: '1px solid #1e3a5f', borderRadius: 8,
        padding: '10px 14px', fontSize: 11, color: '#93c5fd', lineHeight: 1.6,
      }}>
        <span style={{ color: '#60a5fa', fontWeight: 700 }}>Bottleneck:</span>{' '}
        {hops[bottleneckIdx].name} is the most congested hop (
        {(hopResults[bottleneckIdx].utilisation * 100).toFixed(1)}% utilisation).
        HPCC sender will set rate to match {hops[bottleneckIdx].name}'s available capacity.
        DCQCN/Swift would only see aggregate path RTT — unable to isolate which hop is congested.
      </div>
    </div>
  )
}

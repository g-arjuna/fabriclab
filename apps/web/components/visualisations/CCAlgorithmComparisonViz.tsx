'use client'
import { useState } from 'react'

/**
 * CCAlgorithmComparisonViz
 * Interactive sortable comparison table of all 5 CC algorithms.
 * User can filter by hardware requirement, sort by any column.
 * Also shows a radar-style pentagon chart for selected algorithm.
 */

interface Algorithm {
  name: string
  shortName: string
  signal: string
  feedbackRTTs: number
  nicHW: 'Custom' | 'ConnectX-7' | 'INT Switch' | 'Commodity' | 'Pollara/Future'
  switchReq: string
  scalability: number  // 1-5
  tuningComplexity: number  // 1-5 (higher = harder)
  incastPerf: number   // 1-5 (higher = better)
  deployability: number  // 1-5 (higher = easier)
  available2025: boolean
  color: string
  useCase: string
}

const ALGORITHMS: Algorithm[] = [
  {
    name: 'DCQCN',
    shortName: 'DCQCN',
    signal: 'ECN CE → CNP → rate reduce',
    feedbackRTTs: 2,
    nicHW: 'ConnectX-7',
    switchReq: 'ECN-capable (all Spectrum)',
    scalability: 4,
    tuningComplexity: 3,
    incastPerf: 3,
    deployability: 5,
    available2025: true,
    color: '#76e5b5',
    useCase: 'NVIDIA deployments today',
  },
  {
    name: 'Swift',
    shortName: 'Swift',
    signal: 'RTT measurement at NIC',
    feedbackRTTs: 1,
    nicHW: 'Custom',
    switchReq: 'None (no ECN needed)',
    scalability: 5,
    tuningComplexity: 2,
    incastPerf: 4,
    deployability: 2,
    available2025: false,
    color: '#60a5fa',
    useCase: 'Google/custom RDMA NICs',
  },
  {
    name: 'HPCC',
    shortName: 'HPCC',
    signal: 'INT per-hop queue depth',
    feedbackRTTs: 1,
    nicHW: 'Custom',
    switchReq: 'INT insertion (P4/Tofino)',
    scalability: 4,
    tuningComplexity: 5,
    incastPerf: 5,
    deployability: 1,
    available2025: false,
    color: '#fbbf24',
    useCase: 'INT-capable fabrics (hyperscale)',
  },
  {
    name: 'TIMELY',
    shortName: 'TIMELY',
    signal: 'RTT gradient (dRTT/dt)',
    feedbackRTTs: 1,
    nicHW: 'Commodity',
    switchReq: 'None',
    scalability: 3,
    tuningComplexity: 2,
    incastPerf: 3,
    deployability: 4,
    available2025: true,
    color: '#c084fc',
    useCase: 'TCP flows, RTT > 20µs',
  },
  {
    name: 'UEC CC',
    shortName: 'UEC',
    signal: 'C-flag in ACK + NPM hint',
    feedbackRTTs: 1,
    nicHW: 'Pollara/Future',
    switchReq: 'ECN (NPM optional)',
    scalability: 5,
    tuningComplexity: 2,
    incastPerf: 4,
    deployability: 3,
    available2025: true,
    color: '#f97316',
    useCase: 'Next-gen UEC-compliant fabrics',
  },
]

type SortKey = 'feedbackRTTs' | 'scalability' | 'tuningComplexity' | 'incastPerf' | 'deployability'

const COLS: { key: SortKey; label: string; invert?: boolean }[] = [
  { key: 'feedbackRTTs', label: 'Feedback RTTs', invert: true },
  { key: 'scalability', label: 'Scalability' },
  { key: 'incastPerf', label: 'Incast Perf' },
  { key: 'deployability', label: 'Deployability' },
  { key: 'tuningComplexity', label: 'Tuning Cmplx', invert: true },
]

function ScoreBar({ value, max = 5, color }: { value: number; max?: number; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 8, height: 8, borderRadius: 2,
            background: i < value ? color : '#2a2d3e',
          }}
        />
      ))}
    </div>
  )
}

// Radar chart for a selected algorithm
function RadarChart({ algo }: { algo: Algorithm }) {
  const dims = [
    { label: 'Scalability', value: algo.scalability },
    { label: 'Incast Perf', value: algo.incastPerf },
    { label: 'Deployability', value: algo.deployability },
    { label: 'Low Tuning', value: 6 - algo.tuningComplexity },
    { label: 'Low Latency', value: 6 - algo.feedbackRTTs * 2.5 },
  ]
  const N = dims.length
  const R = 55
  const cx = 80
  const cy = 72

  const angle = (i: number) => (i * 2 * Math.PI) / N - Math.PI / 2
  const point = (i: number, v: number) => ({
    x: cx + (v / 5) * R * Math.cos(angle(i)),
    y: cy + (v / 5) * R * Math.sin(angle(i)),
  })

  const outerPoints = dims.map((_, i) => point(i, 5))
  const valuePoints = dims.map((d, i) => point(i, Math.max(0, d.value)))
  const outerPoly = outerPoints.map(p => `${p.x},${p.y}`).join(' ')
  const valuePoly = valuePoints.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <svg viewBox="0 0 160 144" style={{ width: '100%', maxWidth: 160 }}>
      {/* Background spokes */}
      {dims.map((d, i) => {
        const outer = outerPoints[i]
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="#2a2d3e" strokeWidth={1} />
            <text
              x={cx + 1.2 * R * Math.cos(angle(i))}
              y={cy + 1.2 * R * Math.sin(angle(i)) + 4}
              fontSize={7.5}
              fill="#7c8db5"
              textAnchor="middle"
            >
              {d.label}
            </text>
          </g>
        )
      })}
      {/* Grid rings */}
      {[1, 2, 3, 4, 5].map(r => (
        <polygon
          key={r}
          points={dims.map((_, i) => {
            const p = point(i, r)
            return `${p.x},${p.y}`
          }).join(' ')}
          fill="none"
          stroke="#1e2130"
          strokeWidth={1}
        />
      ))}
      {/* Outer ring */}
      <polygon points={outerPoly} fill="none" stroke="#334155" strokeWidth={1} />
      {/* Value fill */}
      <polygon points={valuePoly} fill={algo.color} fillOpacity={0.2} stroke={algo.color} strokeWidth={2} />
      {/* Dots */}
      {valuePoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={algo.color} />
      ))}
    </svg>
  )
}

export default function CCAlgorithmComparisonViz() {
  const [sortKey, setSortKey] = useState<SortKey>('deployability')
  const [sortDesc, setSortDesc] = useState(true)
  const [filterAvail, setFilterAvail] = useState(false)
  const [selected, setSelected] = useState<string>('DCQCN')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc(d => !d)
    else { setSortKey(key); setSortDesc(true) }
  }

  const sorted = [...ALGORITHMS]
    .filter(a => !filterAvail || a.available2025)
    .sort((a, b) => {
      const va = a[sortKey] as number
      const vb = b[sortKey] as number
      return sortDesc ? vb - va : va - vb
    })

  const selectedAlgo = ALGORITHMS.find(a => a.name === selected) ?? ALGORITHMS[0]

  return (
    <div
      style={{
        background: '#0f1117',
        border: '1px solid #2a2d3e',
        borderRadius: 12,
        padding: '20px 24px',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        color: '#e2e8f0',
        maxWidth: 700,
        margin: '24px auto',
      }}
    >
      <div style={{ fontSize: 13, color: '#7c8db5', marginBottom: 4, letterSpacing: '0.08em' }}>
        ALGORITHM SELECTOR
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>
        CC Algorithm Comparison: DCQCN · Swift · HPCC · TIMELY · UEC
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#7c8db5' }}>Sort by:</span>
        {COLS.map(c => (
          <button
            key={c.key}
            onClick={() => handleSort(c.key)}
            style={{
              background: sortKey === c.key ? '#1e3a5f' : '#161928',
              border: `1px solid ${sortKey === c.key ? '#60a5fa' : '#2a2d3e'}`,
              borderRadius: 5, padding: '3px 10px',
              color: sortKey === c.key ? '#60a5fa' : '#7c8db5',
              cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
            }}
          >
            {c.label} {sortKey === c.key ? (sortDesc ? '↓' : '↑') : ''}
          </button>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7c8db5', cursor: 'pointer' }}>
          <input type="checkbox" checked={filterAvail} onChange={e => setFilterAvail(e.target.checked)} />
          2025-available only
        </label>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #2a2d3e' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: '#7c8db5', fontWeight: 400 }}>Algorithm</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: '#7c8db5', fontWeight: 400 }}>Signal</th>
              <th style={{ textAlign: 'center', padding: '6px 8px', color: '#7c8db5', fontWeight: 400 }}>RTTs</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: '#7c8db5', fontWeight: 400 }}>NIC</th>
              {COLS.map(c => (
                <th key={c.key} style={{ textAlign: 'center', padding: '6px 8px', color: '#7c8db5', fontWeight: 400 }}>
                  {c.label.split(' ')[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(a => (
              <tr
                key={a.name}
                onClick={() => setSelected(a.name)}
                style={{
                  borderBottom: '1px solid #1a1f2e',
                  background: selected === a.name ? '#1a1f2e' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <td style={{ padding: '7px 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: a.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, color: a.color }}>{a.name}</span>
                    {a.available2025 && (
                      <span style={{ fontSize: 8, background: '#064e3b', color: '#34d399', borderRadius: 3, padding: '1px 4px' }}>
                        2025
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '7px 8px', color: '#94a3b8', maxWidth: 140, fontSize: 10 }}>
                  {a.signal}
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                  <span style={{ color: a.feedbackRTTs === 1 ? '#76e5b5' : '#f87171', fontWeight: 700 }}>
                    {a.feedbackRTTs}
                  </span>
                </td>
                <td style={{ padding: '7px 8px', color: '#94a3b8', fontSize: 10 }}>{a.nicHW}</td>
                <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                  <ScoreBar value={a.scalability} color={a.color} />
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                  <ScoreBar value={a.incastPerf} color={a.color} />
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                  <ScoreBar value={a.deployability} color={a.color} />
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                  <ScoreBar value={a.tuningComplexity} color="#f87171" />
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                  <ScoreBar value={6 - a.feedbackRTTs * 2} max={4} color="#76e5b5" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected algorithm detail */}
      <div style={{
        background: '#161928',
        border: `1px solid ${selectedAlgo.color}44`,
        borderRadius: 10,
        padding: '14px 16px',
        display: 'grid',
        gridTemplateColumns: '160px 1fr',
        gap: 16,
      }}>
        <RadarChart algo={selectedAlgo} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: selectedAlgo.color, marginBottom: 6 }}>
            {selectedAlgo.name}
          </div>
          <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 4 }}>
            <span style={{ color: '#94a3b8' }}>Signal: </span>{selectedAlgo.signal}
          </div>
          <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 4 }}>
            <span style={{ color: '#94a3b8' }}>Switch req: </span>{selectedAlgo.switchReq}
          </div>
          <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 8 }}>
            <span style={{ color: '#94a3b8' }}>NIC hardware: </span>{selectedAlgo.nicHW}
          </div>
          <div style={{
            background: '#0d0f18', borderRadius: 6,
            padding: '8px 10px', fontSize: 11,
            color: selectedAlgo.color, fontStyle: 'italic',
          }}>
            Best for: {selectedAlgo.useCase}
          </div>
        </div>
      </div>
    </div>
  )
}

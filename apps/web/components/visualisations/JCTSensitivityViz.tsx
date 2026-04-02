'use client'
import { useState, useMemo } from 'react'

/**
 * JCTSensitivityViz
 * Shows how a single congested link in an N-GPU All-Reduce degrades overall Job Completion Time.
 * Interactive sliders: GPU count, congestion %, cost per GPU-hour.
 * The model:
 *   - Ring-AllReduce has 2*(N-1) steps. A straggler extends each barrier by straggler_delay.
 *   - straggler_delay = base_step_time * congestion_factor
 *   - JCT_degradation = congestion_factor averaged over all steps (since one link is slow)
 */

const COST_PER_GPU_HOUR = 10 // USD

export default function JCTSensitivityViz() {
  const [gpuCount, setGpuCount] = useState(1000)
  const [congestionPct, setCongestionPct] = useState(10)
  const [hoursPerDay] = useState(24)

  // Base step time assumed 1ms for a 1GB gradient chunk on 400GbE
  const baseStepMs = 1.0

  const analysis = useMemo(() => {
    // Ring-AllReduce: 2*(N-1) steps, one link at degraded speed
    const steps = 2 * (gpuCount - 1)
    // Fraction of steps affected (one link = 1 out of N links in ring)
    const affectedFraction = 1 / gpuCount
    // Effective JCT multiplier
    const congestionFactor = 1 + (congestionPct / 100)
    // Overall JCT multiplier: weighted average
    const jctMultiplier = 1 + affectedFraction * (congestionFactor - 1)
    const jctDegradationPct = (jctMultiplier - 1) * 100

    // Cost calculation
    const baseJct = steps * baseStepMs // ms
    const degradedJct = baseJct * jctMultiplier
    const lostTimeMs = degradedJct - baseJct

    const dailyCostBase = gpuCount * hoursPerDay * COST_PER_GPU_HOUR
    const dailyCostLost = dailyCostBase * (jctMultiplier - 1)

    // Points for line chart: congestion% from 0 to 100
    const chartPoints = Array.from({ length: 101 }, (_, i) => {
      const cf = 1 + i / 100
      const mult = 1 + (1 / gpuCount) * (cf - 1)
      return { x: i, y: (mult - 1) * 100 }
    })

    return {
      jctMultiplier,
      jctDegradationPct,
      baseJct,
      degradedJct,
      lostTimeMs,
      dailyCostBase,
      dailyCostLost,
      chartPoints,
    }
  }, [gpuCount, congestionPct, hoursPerDay])

  const maxY = Math.max(...analysis.chartPoints.map(p => p.y)) || 1
  const W = 520
  const H = 180
  const PAD = { top: 16, right: 20, bottom: 36, left: 52 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const toSvg = (x: number, y: number) => ({
    cx: PAD.left + (x / 100) * chartW,
    cy: PAD.top + chartH - (y / maxY) * chartH,
  })

  const polyline = analysis.chartPoints
    .map(p => {
      const { cx, cy } = toSvg(p.x, p.y)
      return `${cx},${cy}`
    })
    .join(' ')

  // Current point marker
  const curPoint = toSvg(congestionPct, analysis.jctDegradationPct)

  const fmtUSD = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(2)}M`
      : n >= 1000
      ? `$${(n / 1000).toFixed(1)}K`
      : `$${n.toFixed(0)}`

  return (
    <div
      style={{
        background: '#0f1117',
        border: '1px solid #2a2d3e',
        borderRadius: 12,
        padding: '20px 24px',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        color: '#e2e8f0',
        maxWidth: 600,
        margin: '24px auto',
      }}
    >
      <div style={{ fontSize: 13, color: '#7c8db5', marginBottom: 4, letterSpacing: '0.08em' }}>
        INTERACTIVE MODEL
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#76e5b5', marginBottom: 16 }}>
        JCT Sensitivity to Single-Link Congestion
      </div>

      {/* Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#7c8db5' }}>GPU COUNT: {gpuCount.toLocaleString()}</span>
          <input
            type="range"
            min={8}
            max={10000}
            step={8}
            value={gpuCount}
            onChange={e => setGpuCount(Number(e.target.value))}
            style={{ accentColor: '#76e5b5', width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#4a5568' }}>
            <span>8</span><span>10,000</span>
          </div>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#7c8db5' }}>CONGESTION ON 1 LINK: {congestionPct}%</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={congestionPct}
            onChange={e => setCongestionPct(Number(e.target.value))}
            style={{ accentColor: '#f87171', width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#4a5568' }}>
            <span>0%</span><span>100%</span>
          </div>
        </label>
      </div>

      {/* SVG chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', maxWidth: W, display: 'block', marginBottom: 16 }}
      >
        {/* Grid */}
        {[0, 25, 50, 75, 100].map(pct => {
          const y = PAD.top + chartH - (pct / maxY) * chartH
          if (y < PAD.top || y > PAD.top + chartH) return null
          return (
            <g key={pct}>
              <line
                x1={PAD.left}
                y1={y}
                x2={PAD.left + chartW}
                y2={y}
                stroke="#2a2d3e"
                strokeWidth={1}
              />
              <text x={PAD.left - 6} y={y + 4} fontSize={9} fill="#4a5568" textAnchor="end">
                {pct.toFixed(1)}%
              </text>
            </g>
          )
        })}

        {/* X axis labels */}
        {[0, 25, 50, 75, 100].map(x => (
          <text
            key={x}
            x={PAD.left + (x / 100) * chartW}
            y={PAD.top + chartH + 16}
            fontSize={9}
            fill="#4a5568"
            textAnchor="middle"
          >
            {x}%
          </text>
        ))}

        {/* Axis labels */}
        <text
          x={PAD.left + chartW / 2}
          y={H - 2}
          fontSize={9}
          fill="#7c8db5"
          textAnchor="middle"
        >
          Congestion on single link →
        </text>
        <text
          x={10}
          y={PAD.top + chartH / 2}
          fontSize={9}
          fill="#7c8db5"
          textAnchor="middle"
          transform={`rotate(-90, 10, ${PAD.top + chartH / 2})`}
        >
          JCT degradation %
        </text>

        {/* Axes */}
        <line
          x1={PAD.left} y1={PAD.top + chartH}
          x2={PAD.left + chartW} y2={PAD.top + chartH}
          stroke="#2a2d3e" strokeWidth={1}
        />
        <line
          x1={PAD.left} y1={PAD.top}
          x2={PAD.left} y2={PAD.top + chartH}
          stroke="#2a2d3e" strokeWidth={1}
        />

        {/* Curve */}
        <polyline points={polyline} fill="none" stroke="#76e5b5" strokeWidth={2} />

        {/* Fill under curve */}
        <polyline
          points={`${PAD.left},${PAD.top + chartH} ${polyline} ${PAD.left + chartW},${PAD.top + chartH}`}
          fill="#76e5b5"
          fillOpacity={0.07}
          stroke="none"
        />

        {/* Current value marker */}
        <line
          x1={curPoint.cx}
          y1={PAD.top}
          x2={curPoint.cx}
          y2={PAD.top + chartH}
          stroke="#f87171"
          strokeWidth={1}
          strokeDasharray="4 2"
        />
        <circle cx={curPoint.cx} cy={curPoint.cy} r={5} fill="#f87171" />
        <text
          x={curPoint.cx + 6}
          y={curPoint.cy - 6}
          fontSize={10}
          fill="#f87171"
          fontWeight="bold"
        >
          {analysis.jctDegradationPct.toFixed(2)}%
        </text>
      </svg>

      {/* Stats grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 10,
          marginBottom: 16,
        }}
      >
        {[
          {
            label: 'JCT Degradation',
            value: `+${analysis.jctDegradationPct.toFixed(3)}%`,
            color: '#f87171',
          },
          {
            label: 'Base Daily GPU Cost',
            value: fmtUSD(analysis.dailyCostBase),
            color: '#76e5b5',
          },
          {
            label: 'Daily Lost Compute',
            value: fmtUSD(analysis.dailyCostLost),
            color: '#fbbf24',
          },
        ].map(s => (
          <div
            key={s.label}
            style={{
              background: '#161928',
              border: '1px solid #2a2d3e',
              borderRadius: 8,
              padding: '10px 12px',
            }}
          >
            <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Insight */}
      <div
        style={{
          background: '#0d1424',
          border: '1px solid #1e3a5f',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 11,
          color: '#93c5fd',
          lineHeight: 1.6,
        }}
      >
        <span style={{ color: '#60a5fa', fontWeight: 700 }}>Model:</span> Ring-AllReduce with{' '}
        {gpuCount.toLocaleString()} GPUs has 2×(N-1) ={' '}
        {(2 * (gpuCount - 1)).toLocaleString()} steps. One congested link affects{' '}
        {(100 / gpuCount).toFixed(3)}% of steps, but every synchronisation barrier stalls all{' '}
        {gpuCount.toLocaleString()} GPUs until the slowest completes.
      </div>
    </div>
  )
}

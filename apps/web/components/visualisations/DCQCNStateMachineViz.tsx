'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * DCQCNStateMachineViz
 * Simulates the DCQCN rate control loop over time.
 * Shows alpha (congestion estimate) and TX rate over simulated time ticks.
 * Interactive: fire CNP events, see rate reduction; watch recovery via RI timer.
 */

const MAX_RATE = 400 // Gbps (line rate)
const MIN_RATE = 4   // Gbps (DCQCN_MIN_RATE)
const RAI = 5        // Rate Additive Increase (Gbps per timer tick)
const RAI_HYPER = 50 // Hyper Additive Increase
const ALPHA_G = 1 / 256  // alpha update weight
const BC_BYTES = 65536   // byte counter threshold
const TICKS_PER_SEC = 20
const MAX_HISTORY = 120

interface Tick {
  t: number
  rate: number
  alpha: number
  cnp: boolean
  phase: 'reduce' | 'active_inc' | 'hyper_inc'
}

export default function DCQCNStateMachineViz() {
  const [history, setHistory] = useState<Tick[]>([])
  const [running, setRunning] = useState(false)
  const [pendingCNP, setPendingCNP] = useState(false)
  const stateRef = useRef({
    rate: MAX_RATE,
    alpha: 0,
    tick: 0,
    phase: 'active_inc' as Tick['phase'],
    ticksSinceLastCNP: 0,
    hysteresis: 0,
  })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const step = useCallback(() => {
    const s = stateRef.current
    const isCNP = pendingCNP
    setPendingCNP(false)

    let newAlpha = s.alpha
    let newRate = s.rate
    let newPhase = s.phase

    if (isCNP) {
      // Alpha update: alpha increases on CNP
      newAlpha = (1 - ALPHA_G) * s.alpha + ALPHA_G * 1.0
      // Rate multiplicative decrease
      newRate = Math.max(MIN_RATE, newRate * (1 - newAlpha / 2))
      newPhase = 'reduce'
      s.ticksSinceLastCNP = 0
      s.hysteresis = 0
    } else {
      // No CNP: alpha decays
      newAlpha = (1 - ALPHA_G) * s.alpha
      s.ticksSinceLastCNP++

      // Rate recovery
      if (s.phase === 'reduce') {
        // After reduction, enter active increase
        newPhase = 'active_inc'
      }

      if (newPhase === 'active_inc') {
        s.hysteresis++
        newRate = Math.min(MAX_RATE, newRate + RAI)
        if (s.hysteresis >= 5) {
          newPhase = 'hyper_inc'
          s.hysteresis = 0
        }
      } else if (newPhase === 'hyper_inc') {
        s.hysteresis++
        newRate = Math.min(MAX_RATE, newRate + RAI_HYPER)
        if (newRate >= MAX_RATE * 0.95) {
          newPhase = 'active_inc'
          s.hysteresis = 0
        }
      }
    }

    stateRef.current = {
      ...s,
      rate: newRate,
      alpha: newAlpha,
      tick: s.tick + 1,
      phase: newPhase,
    }

    setHistory(prev => {
      const next: Tick = {
        t: s.tick,
        rate: newRate,
        alpha: newAlpha,
        cnp: isCNP,
        phase: newPhase,
      }
      return [...prev.slice(-MAX_HISTORY + 1), next]
    })
  }, [pendingCNP])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(step, 1000 / TICKS_PER_SEC)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, step])

  const fireCNP = () => {
    setPendingCNP(true)
    if (!running) step()
  }

  const reset = () => {
    setRunning(false)
    setHistory([])
    stateRef.current = {
      rate: MAX_RATE,
      alpha: 0,
      tick: 0,
      phase: 'active_inc',
      ticksSinceLastCNP: 0,
      hysteresis: 0,
    }
  }

  // SVG chart dims
  const W = 540
  const H = 180
  const PAD = { top: 12, right: 20, bottom: 32, left: 52 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom

  const pts = history
  const N = Math.max(MAX_HISTORY, 1)

  const ratePolyline = pts
    .map((p, i) => {
      const x = PAD.left + (i / (MAX_HISTORY - 1)) * cW
      const y = PAD.top + cH - (p.rate / MAX_RATE) * cH
      return `${x},${y}`
    })
    .join(' ')

  const alphaPolyline = pts
    .map((p, i) => {
      const x = PAD.left + (i / (MAX_HISTORY - 1)) * cW
      const y = PAD.top + cH - p.alpha * cH
      return `${x},${y}`
    })
    .join(' ')

  const lastTick = history[history.length - 1]
  const currentRate = lastTick?.rate ?? MAX_RATE
  const currentAlpha = lastTick?.alpha ?? 0
  const currentPhase = lastTick?.phase ?? 'active_inc'

  const phaseColor: Record<string, string> = {
    reduce: '#f87171',
    active_inc: '#fbbf24',
    hyper_inc: '#76e5b5',
  }

  const phaseLabel: Record<string, string> = {
    reduce: 'RATE REDUCTION',
    active_inc: 'ACTIVE INCREASE (RAI)',
    hyper_inc: 'HYPER INCREASE (RHAI)',
  }

  return (
    <div
      style={{
        background: '#0f1117',
        border: '1px solid #2a2d3e',
        borderRadius: 12,
        padding: '20px 24px',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        color: '#e2e8f0',
        maxWidth: 620,
        margin: '24px auto',
      }}
    >
      <div style={{ fontSize: 13, color: '#7c8db5', marginBottom: 4, letterSpacing: '0.08em' }}>
        INTERACTIVE SIMULATION
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#76e5b5', marginBottom: 4 }}>
        DCQCN Rate Control State Machine
      </div>
      <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 16 }}>
        Click <strong style={{ color: '#e2e8f0' }}>Fire CNP</strong> to inject a Congestion Notification Packet.
        Watch alpha rise and rate drop. Then watch recovery via RAI/RHAI timers.
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          onClick={() => setRunning(r => !r)}
          style={{
            background: running ? '#7f1d1d' : '#064e3b',
            border: `1px solid ${running ? '#f87171' : '#76e5b5'}`,
            borderRadius: 6,
            color: running ? '#f87171' : '#76e5b5',
            padding: '6px 16px',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'inherit',
          }}
        >
          {running ? '⏸ Pause' : '▶ Run'}
        </button>
        <button
          onClick={fireCNP}
          style={{
            background: '#451a03',
            border: '1px solid #f97316',
            borderRadius: 6,
            color: '#f97316',
            padding: '6px 16px',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'inherit',
          }}
        >
          📡 Fire CNP
        </button>
        <button
          onClick={reset}
          style={{
            background: '#1e1b4b',
            border: '1px solid #6366f1',
            borderRadius: 6,
            color: '#818cf8',
            padding: '6px 16px',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'inherit',
          }}
        >
          ↺ Reset
        </button>
      </div>

      {/* Phase badge */}
      <div
        style={{
          display: 'inline-block',
          background: phaseColor[currentPhase] + '22',
          border: `1px solid ${phaseColor[currentPhase]}`,
          borderRadius: 6,
          padding: '4px 12px',
          fontSize: 11,
          color: phaseColor[currentPhase],
          marginBottom: 12,
          letterSpacing: '0.06em',
        }}
      >
        {phaseLabel[currentPhase]}
      </div>

      {/* Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block', marginBottom: 12 }}>
        {/* Y gridlines */}
        {[0, 25, 50, 75, 100].map(pct => {
          const y = PAD.top + cH - (pct / 100) * cH
          return (
            <g key={pct}>
              <line x1={PAD.left} y1={y} x2={PAD.left + cW} y2={y} stroke="#1e2130" strokeWidth={1} />
              <text x={PAD.left - 6} y={y + 4} fontSize={9} fill="#4a5568" textAnchor="end">
                {pct === 0 ? '0' : pct + '%'}
              </text>
            </g>
          )
        })}
        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top + cH} x2={PAD.left + cW} y2={PAD.top + cH} stroke="#2a2d3e" />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + cH} stroke="#2a2d3e" />

        {/* CNP event markers */}
        {pts.map((p, i) => {
          if (!p.cnp) return null
          const x = PAD.left + (i / (MAX_HISTORY - 1)) * cW
          return (
            <line key={i} x1={x} y1={PAD.top} x2={x} y2={PAD.top + cH}
              stroke="#f97316" strokeWidth={1.5} strokeDasharray="3 2" opacity={0.7} />
          )
        })}

        {/* Rate curve */}
        {pts.length > 1 && (
          <polyline points={ratePolyline} fill="none" stroke="#76e5b5" strokeWidth={2} />
        )}

        {/* Alpha curve */}
        {pts.length > 1 && (
          <polyline points={alphaPolyline} fill="none" stroke="#f87171" strokeWidth={1.5} strokeDasharray="4 2" />
        )}

        {/* Legend */}
        <line x1={W - 130} y1={PAD.top + 8} x2={W - 110} y2={PAD.top + 8} stroke="#76e5b5" strokeWidth={2} />
        <text x={W - 106} y={PAD.top + 12} fontSize={9} fill="#76e5b5">TX Rate / 400G</text>
        <line x1={W - 130} y1={PAD.top + 22} x2={W - 110} y2={PAD.top + 22} stroke="#f87171" strokeWidth={1.5} strokeDasharray="4 2" />
        <text x={W - 106} y={PAD.top + 26} fontSize={9} fill="#f87171">Alpha (α)</text>
        <line x1={W - 130} y1={PAD.top + 36} x2={W - 110} y2={PAD.top + 36} stroke="#f97316" strokeWidth={1.5} strokeDasharray="3 2" />
        <text x={W - 106} y={PAD.top + 40} fontSize={9} fill="#f97316">CNP event</text>
      </svg>

      {/* Current stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { label: 'TX Rate', value: `${currentRate.toFixed(1)} Gbps`, color: '#76e5b5' },
          { label: 'Alpha (α)', value: currentAlpha.toFixed(4), color: '#f87171' },
          { label: 'Rate / Line', value: `${((currentRate / MAX_RATE) * 100).toFixed(1)}%`, color: '#fbbf24' },
        ].map(s => (
          <div
            key={s.label}
            style={{
              background: '#161928',
              border: '1px solid #2a2d3e',
              borderRadius: 8,
              padding: '8px 12px',
            }}
          >
            <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 12, fontSize: 11, color: '#4a5568',
        background: '#0d0f18', borderRadius: 6, padding: '8px 12px',
      }}>
        <span style={{ color: '#6366f1' }}>Params: </span>
        RAI = {RAI} Gbps/tick · RHAI = {RAI_HYPER} Gbps/tick · g = 1/256 · MIN_RATE = {MIN_RATE} Gbps · MAX = {MAX_RATE} Gbps
      </div>
    </div>
  )
}

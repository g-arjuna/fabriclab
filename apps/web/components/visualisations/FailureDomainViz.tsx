'use client'
import { useState, useEffect, useRef } from 'react'

type FailedItem = 'none' | 'leaf1' | 'leaf2' | 'spine1' | 'spine2' | 'link_dgx3_leaf1'

interface SimState {
  failed: FailedItem
  converging: boolean
  converged: boolean
  elapsed: number
  affectedGPUs: number
  totalGPUs: number
  bwPct: number
  message: string
}

const FAILURE_CONFIGS: Record<FailedItem, {
  label: string
  desc: string
  affectedGPUs: number
  bwPct: number
  convergenceMs: number
  message: string
}> = {
  none: { label: 'No failure', desc: '', affectedGPUs: 0, bwPct: 100, convergenceMs: 0, message: '' },
  leaf1: {
    label: 'leaf-01 fails',
    desc: 'NICs 0,1,4,5 offline across all 8 DGX nodes. Rail wiring = 4 NICs/node lost from one switch.',
    affectedGPUs: 0, bwPct: 50, convergenceMs: 250,
    message: 'All 8 DGX nodes lose 4/8 NICs. Training continues at ~50% bandwidth. No node fully isolated. BFD detects in 150ms, BGP reconverges in +100ms.',
  },
  leaf2: {
    label: 'leaf-02 fails',
    desc: 'NICs 2,3,6,7 offline across all 8 DGX nodes.',
    affectedGPUs: 0, bwPct: 50, convergenceMs: 250,
    message: 'All 8 DGX nodes lose 4/8 NICs. Training continues at ~50% bandwidth. Mirror image of leaf-01 failure.',
  },
  spine1: {
    label: 'spine-01 fails',
    desc: 'One spine switch fails. ECMP reconverges across remaining spines.',
    affectedGPUs: 0, bwPct: 75, convergenceMs: 200,
    message: 'Intra-SU traffic unaffected. Cross-SU traffic loses 25% of uplink capacity. ECMP reconverges across remaining 3 spines in ~200ms.',
  },
  spine2: {
    label: 'spine-01 + spine-02 fail',
    desc: 'Two spine switches fail simultaneously.',
    affectedGPUs: 0, bwPct: 50, convergenceMs: 300,
    message: 'Cross-SU traffic loses 50% uplink capacity. Intra-SU All-Reduce unaffected. Two convergence events compound.',
  },
  link_dgx3_leaf1: {
    label: 'DGX-03 → leaf-01 link fails',
    desc: 'Single NIC 0 link fails on DGX-03 only. All other DGX nodes unaffected.',
    affectedGPUs: 1, bwPct: 98, convergenceMs: 150,
    message: 'Only DGX-03 loses one NIC (NIC 0 → leaf-01). 7/8 NICs remain active. AR engine stops routing to that egress within microseconds. BFD detects in 150ms.',
  },
}

const DGX_COUNT = 8
const SV_W = 640
const SV_H = 300

const getDGXX = (i: number) => 40
const getDGXY = (i: number) => 30 + i * 30

const LEAF1 = { x: 200, y: 70 }
const LEAF2 = { x: 200, y: 200 }
const STORAGE = { x: 310, y: 135 }
const SPINE1 = { x: 430, y: 70 }
const SPINE2 = { x: 430, y: 200 }

export default function FailureDomainViz() {
  const [failed, setFailed] = useState<FailedItem>('none')
  const [simState, setSimState] = useState<SimState>({
    failed: 'none', converging: false, converged: false, elapsed: 0,
    affectedGPUs: 0, totalGPUs: DGX_COUNT, bwPct: 100, message: '',
  })
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const triggerFailure = (f: FailedItem) => {
    if (timerRef.current) clearInterval(timerRef.current)
    const cfg = FAILURE_CONFIGS[f]
    setFailed(f)
    if (f === 'none') {
      setSimState({ failed: 'none', converging: false, converged: false, elapsed: 0, affectedGPUs: 0, totalGPUs: DGX_COUNT, bwPct: 100, message: '' })
      return
    }
    setSimState({ failed: f, converging: true, converged: false, elapsed: 0, affectedGPUs: cfg.affectedGPUs, totalGPUs: DGX_COUNT, bwPct: 100, message: 'Detecting failure...' })
    let elapsed = 0
    const tick = 50
    timerRef.current = setInterval(() => {
      elapsed += tick
      if (elapsed >= cfg.convergenceMs) {
        clearInterval(timerRef.current!)
        setSimState({ failed: f, converging: false, converged: true, elapsed, affectedGPUs: cfg.affectedGPUs, totalGPUs: DGX_COUNT, bwPct: cfg.bwPct, message: cfg.message })
      } else {
        setSimState(s => ({
          ...s, elapsed,
          message: elapsed < 150 ? `BFD detecting... ${elapsed}ms` : `BGP reconverging... ${elapsed}ms`,
          bwPct: Math.max(cfg.bwPct, 100 - (100 - cfg.bwPct) * (elapsed / cfg.convergenceMs)),
        }))
      }
    }, tick)
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const isNodeDegraded = (dgxIdx: number) => {
    if (failed === 'leaf1' || failed === 'leaf2') return true
    if (failed === 'link_dgx3_leaf1' && dgxIdx === 2) return true
    return false
  }

  const isItemFailed = (item: string) => {
    if (item === 'leaf1' && failed === 'leaf1') return true
    if (item === 'leaf2' && failed === 'leaf2') return true
    if (item === 'spine1' && (failed === 'spine1' || failed === 'spine2')) return true
    if (item === 'spine2' && failed === 'spine2') return true
    return false
  }

  const bwColor = simState.bwPct >= 90 ? '#76e5b5' : simState.bwPct >= 60 ? '#fbbf24' : '#f87171'
  const convColor = simState.converging ? '#fbbf24' : simState.converged ? '#76e5b5' : '#4a5568'

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
        Failure Domain Isolation — Spectrum-X Scalable Unit
      </div>

      {/* Failure selector */}
      <div style={{ marginBottom: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(Object.keys(FAILURE_CONFIGS) as FailedItem[]).map(f => (
          <button key={f} onClick={() => triggerFailure(f)} style={{
            padding: '4px 10px', borderRadius: 6, fontSize: 10,
            border: `1px solid ${failed === f ? '#f87171' : '#2a2d3e'}`,
            background: failed === f ? '#f8717120' : '#161928',
            color: failed === f ? '#f87171' : '#7c8db5',
            cursor: 'pointer', fontFamily: 'inherit',
            fontWeight: failed === f ? 700 : 400,
          }}>
            {FAILURE_CONFIGS[f].label}
          </button>
        ))}
      </div>

      <svg viewBox={`0 0 ${SV_W} ${SV_H}`} style={{ width: '100%', maxWidth: SV_W, display: 'block', background: '#0d0f18', borderRadius: 8 }}>
        {/* Wires DGX → leaf1 */}
        {Array.from({ length: DGX_COUNT }, (_, i) => {
          const y = getDGXY(i) + 10
          const degraded = isItemFailed('leaf1') || (failed === 'link_dgx3_leaf1' && i === 2)
          return (
            <line key={`l1-${i}`} x1={90} y1={y} x2={LEAF1.x} y2={LEAF1.y + 15}
              stroke={degraded ? '#f8717140' : '#60a5fa30'} strokeWidth={0.6}
              strokeDasharray={degraded ? '3,4' : ''} />
          )
        })}
        {/* Wires DGX → leaf2 */}
        {Array.from({ length: DGX_COUNT }, (_, i) => {
          const y = getDGXY(i) + 10
          const degraded = isItemFailed('leaf2')
          return (
            <line key={`l2-${i}`} x1={90} y1={y} x2={LEAF2.x} y2={LEAF2.y + 15}
              stroke={degraded ? '#f8717140' : '#76e5b530'} strokeWidth={0.6}
              strokeDasharray={degraded ? '3,4' : ''} />
          )
        })}

        {/* Leaf → spine uplinks */}
        <line x1={LEAF1.x + 60} y1={LEAF1.y + 15} x2={SPINE1.x} y2={SPINE1.y + 15}
          stroke={isItemFailed('spine1') ? '#f8717140' : '#60a5fa50'} strokeWidth={1.5}
          strokeDasharray={isItemFailed('spine1') ? '4,3' : ''} />
        <line x1={LEAF1.x + 60} y1={LEAF1.y + 15} x2={SPINE2.x} y2={SPINE2.y + 15}
          stroke={isItemFailed('spine2') ? '#f8717140' : '#60a5fa30'} strokeWidth={1}
          strokeDasharray={isItemFailed('spine2') ? '4,3' : ''} />
        <line x1={LEAF2.x + 60} y1={LEAF2.y + 15} x2={SPINE1.x} y2={SPINE1.y + 15}
          stroke={isItemFailed('spine1') ? '#f8717140' : '#76e5b530'} strokeWidth={1}
          strokeDasharray={isItemFailed('spine1') ? '4,3' : ''} />
        <line x1={LEAF2.x + 60} y1={LEAF2.y + 15} x2={SPINE2.x} y2={SPINE2.y + 15}
          stroke={isItemFailed('spine2') ? '#f8717140' : '#76e5b550'} strokeWidth={1.5}
          strokeDasharray={isItemFailed('spine2') ? '4,3' : ''} />

        {/* DGX nodes */}
        {Array.from({ length: DGX_COUNT }, (_, i) => {
          const y = getDGXY(i)
          const degraded = isNodeDegraded(i)
          const color = degraded ? '#fbbf24' : '#a78bfa'
          return (
            <g key={i}>
              <rect x={10} y={y} width={80} height={20} rx={4}
                fill={degraded ? '#fbbf2420' : '#161928'}
                stroke={color} strokeWidth={degraded ? 1.5 : 1} />
              <text x={50} y={y + 13} fill={color} fontSize={9}
                fontFamily="'JetBrains Mono',monospace" textAnchor="middle" fontWeight={700}>
                DGX-{String(i + 1).padStart(2, '0')} {degraded ? '⚠' : ''}
              </text>
            </g>
          )
        })}

        {/* Leaf switches */}
        {[
          { id: 'leaf1', pos: LEAF1, color: '#60a5fa', label: 'leaf-01\nSN5600' },
          { id: 'leaf2', pos: LEAF2, color: '#76e5b5', label: 'leaf-02\nSN5600' },
        ].map(sw => {
          const f = isItemFailed(sw.id)
          return (
            <g key={sw.id}>
              <rect x={sw.pos.x} y={sw.pos.y} width={60} height={30} rx={6}
                fill={f ? '#f8717120' : `${sw.color}18`}
                stroke={f ? '#f87171' : sw.color}
                strokeWidth={f ? 2 : 1}
                strokeDasharray={f ? '4,2' : ''} />
              {sw.label.split('\n').map((l, li) => (
                <text key={li} x={sw.pos.x + 30} y={sw.pos.y + 12 + li * 12}
                  fill={f ? '#f87171' : sw.color}
                  fontSize={8} fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
                  {f && li === 0 ? '✕ ' : ''}{l}
                </text>
              ))}
            </g>
          )
        })}

        {/* Storage */}
        <rect x={STORAGE.x} y={STORAGE.y} width={70} height={28} rx={6}
          fill="#f9731618" stroke="#f97316" strokeWidth={1} />
        <text x={STORAGE.x + 35} y={STORAGE.y + 12} fill="#f97316"
          fontSize={8} fontFamily="'JetBrains Mono',monospace" textAnchor="middle" fontWeight={700}>
          storage-01
        </text>
        <text x={STORAGE.x + 35} y={STORAGE.y + 22} fill="#7c8db5"
          fontSize={7} fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
          SN4600C
        </text>

        {/* Spine switches */}
        {[
          { id: 'spine1', pos: SPINE1, label: 'spine-01' },
          { id: 'spine2', pos: SPINE2, label: 'spine-02' },
        ].map(sp => {
          const f = isItemFailed(sp.id)
          return (
            <g key={sp.id}>
              <rect x={sp.pos.x} y={sp.pos.y} width={80} height={30} rx={6}
                fill={f ? '#f8717120' : '#16192840'}
                stroke={f ? '#f87171' : '#2a2d3e'}
                strokeWidth={f ? 2 : 1}
                strokeDasharray={f ? '4,2' : ''} />
              <text x={sp.pos.x + 40} y={sp.pos.y + 19}
                fill={f ? '#f87171' : '#4a5568'}
                fontSize={9} fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
                {f ? '✕ ' : ''}{sp.label}
              </text>
            </g>
          )
        })}

        {/* BFD timer annotation */}
        {failed !== 'none' && (
          <g>
            <rect x={480} y={10} width={150} height={70} rx={6}
              fill="#16192890" stroke={convColor} strokeWidth={1} />
            <text x={555} y={27} fill={convColor} fontSize={9}
              fontFamily="'JetBrains Mono',monospace" textAnchor="middle" fontWeight={700}>
              {simState.converging ? 'CONVERGING' : simState.converged ? 'CONVERGED' : 'STABLE'}
            </text>
            <text x={555} y={42} fill="#e2e8f0" fontSize={11}
              fontFamily="'JetBrains Mono',monospace" textAnchor="middle" fontWeight={700}>
              {simState.elapsed}ms
            </text>
            <text x={555} y={57} fill="#7c8db5" fontSize={8}
              fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
              BFD: 3×50ms = 150ms detect
            </text>
            <text x={555} y={71} fill="#7c8db5" fontSize={8}
              fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
              BGP: +{FAILURE_CONFIGS[failed].convergenceMs - 150}ms reconverge
            </text>
          </g>
        )}
      </svg>

      {/* Metrics */}
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <div style={{ background: '#161928', border: '1px solid #2a2d3e', borderRadius: 8, padding: '8px 14px', flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: bwColor }}>{simState.bwPct.toFixed(0)}%</div>
          <div style={{ fontSize: 10, color: '#7c8db5' }}>Training BW available</div>
        </div>
        <div style={{ background: '#161928', border: '1px solid #2a2d3e', borderRadius: 8, padding: '8px 14px', flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: convColor }}>{simState.elapsed}ms</div>
          <div style={{ fontSize: 10, color: '#7c8db5' }}>Elapsed since failure</div>
        </div>
        <div style={{ background: '#161928', border: '1px solid #2a2d3e', borderRadius: 8, padding: '8px 14px', flex: 2 }}>
          <div style={{ fontSize: 11, color: '#e2e8f0', lineHeight: 1.5 }}>
            {simState.message || 'Select a failure scenario above to simulate'}
          </div>
        </div>
      </div>
    </div>
  )
}

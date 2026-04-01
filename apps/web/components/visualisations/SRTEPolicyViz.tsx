'use client'
import { useState, useEffect, useRef } from 'react'

/**
 * SRTEPolicyViz
 * Animated spine-leaf fabric showing SR-TE policy in action.
 * Two traffic classes:
 *   - NCCL collective (DSCP 26): follows ECMP across all spines (normal)
 *   - Checkpoint-to-storage (DSCP 10): steered via SR-TE to spine-02 + spine-03 only
 *
 * Without SR-TE: checkpoint floods spine-01 which collective uses → collision
 * With SR-TE: clean separation
 *
 * Layout:
 *   2 racks of GPU leaves (left), 4 spines (center), storage leaf (right)
 */

interface Packet {
  id: number
  type: 'nccl' | 'checkpoint'
  x: number
  y: number
  targetX: number
  targetY: number
  phase: 'leaf-to-spine' | 'spine-to-leaf' | 'done'
  spineIdx: number
  speed: number
  opacity: number
}

const W = 620
const H = 320
const SPINE_X = [230, 290, 350, 410]
const SPINE_Y = 140
const GPU_LEAVES = [
  { x: 60, y: 100, label: 'Leaf-A1', rack: 'A' },
  { x: 60, y: 180, label: 'Leaf-A2', rack: 'A' },
  { x: 60, y: 260, label: 'Leaf-B1', rack: 'B' },
]
const STORAGE_LEAF = { x: 560, y: 180, label: 'Storage\nLeaf-08' }
const NODE_R = 22

let nextId = 0

export default function SRTEPolicyViz() {
  const [srteEnabled, setSrteEnabled] = useState(false)
  const [packets, setPackets] = useState<Packet[]>([])
  const [running, setRunning] = useState(false)
  const [stats, setStats] = useState({ spine1CollectivePkts: 0, spine1CheckpointPkts: 0, totalCheckpoint: 0, totalNccl: 0 })
  const animRef = useRef<number | null>(null)
  const statsRef = useRef(stats)
  statsRef.current = stats

  // Spawn packets periodically
  useEffect(() => {
    if (!running) return
    const spawnInterval = setInterval(() => {
      // Spawn NCCL from random GPU leaf
      const srcLeaf = GPU_LEAVES[Math.floor(Math.random() * 2)] // rack A
      // Without SR-TE: NCCL goes to any spine; with SR-TE: still any spine
      const ncclSpine = Math.floor(Math.random() * 4) // all 4 spines for NCCL

      // Checkpoint from Rack B
      // Without SR-TE: random spine; with SR-TE: only spine 1 or 2 (index 1,2)
      const cpSpine = srteEnabled
        ? (Math.random() < 0.5 ? 1 : 2) // SR-TE: spine-02 or spine-03 only
        : Math.floor(Math.random() * 4)  // ECMP: any spine

      const newPackets: Packet[] = [
        {
          id: nextId++,
          type: 'nccl',
          x: srcLeaf.x + NODE_R,
          y: srcLeaf.y,
          targetX: SPINE_X[ncclSpine],
          targetY: SPINE_Y,
          phase: 'leaf-to-spine',
          spineIdx: ncclSpine,
          speed: 2.5 + Math.random(),
          opacity: 1,
        },
        {
          id: nextId++,
          type: 'checkpoint',
          x: GPU_LEAVES[2].x + NODE_R,
          y: GPU_LEAVES[2].y,
          targetX: SPINE_X[cpSpine],
          targetY: SPINE_Y,
          phase: 'leaf-to-spine',
          spineIdx: cpSpine,
          speed: 1.8 + Math.random() * 0.5,
          opacity: 1,
        },
      ]
      setPackets(prev => [...prev.slice(-80), ...newPackets])

      // Update stats
      setStats(prev => ({
        ...prev,
        spine1CollectivePkts: prev.spine1CollectivePkts + (ncclSpine === 0 ? 1 : 0),
        spine1CheckpointPkts: prev.spine1CheckpointPkts + (!srteEnabled && cpSpine === 0 ? 1 : 0),
        totalNccl: prev.totalNccl + 1,
        totalCheckpoint: prev.totalCheckpoint + 1,
      }))
    }, 280)
    return () => clearInterval(spawnInterval)
  }, [running, srteEnabled])

  // Animation frame
  useEffect(() => {
    const animate = () => {
      setPackets(prev =>
        prev
          .map(p => {
            if (p.phase === 'done') return { ...p, opacity: p.opacity - 0.05 }
            const dx = p.targetX - p.x
            const dy = p.targetY - p.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < p.speed) {
              if (p.phase === 'leaf-to-spine') {
                // Now head to storage
                return {
                  ...p,
                  x: p.targetX,
                  y: p.targetY,
                  targetX: STORAGE_LEAF.x - NODE_R,
                  targetY: STORAGE_LEAF.y,
                  phase: 'spine-to-leaf' as const,
                }
              } else {
                return { ...p, x: p.targetX, y: p.targetY, phase: 'done' as const }
              }
            }
            return {
              ...p,
              x: p.x + (dx / dist) * p.speed,
              y: p.y + (dy / dist) * p.speed,
            }
          })
          .filter(p => p.opacity > 0)
      )
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [])

  const resetStats = () => setStats({ spine1CollectivePkts: 0, spine1CheckpointPkts: 0, totalCheckpoint: 0, totalNccl: 0 })

  return (
    <div style={{
      background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 12,
      padding: '20px 24px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: '#e2e8f0', maxWidth: 680, margin: '24px auto',
    }}>
      <div style={{ fontSize: 13, color: '#7c8db5', marginBottom: 4, letterSpacing: '0.08em' }}>ANIMATED SIMULATION</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#34d399', marginBottom: 4 }}>
        SR-TE Policy: Collective vs Checkpoint Traffic Steering
      </div>
      <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 14 }}>
        <span style={{ color: '#34d399' }}>■</span> NCCL collective (DSCP 26) · <span style={{ color: '#f97316' }}>■</span> Checkpoint-to-storage (DSCP 10)
        {srteEnabled ? ' — SR-TE separates checkpoint onto Spine-2/3 only' : ' — ECMP: checkpoint may flood Spine-1'}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <button onClick={() => setRunning(r => !r)}
          style={{ background: running ? '#7f1d1d' : '#064e3b', border: `1px solid ${running ? '#f87171' : '#34d399'}`,
            borderRadius: 6, color: running ? '#f87171' : '#34d399', padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
          {running ? '⏸ Pause' : '▶ Run'}
        </button>
        <button onClick={() => { setSrteEnabled(e => !e); resetStats() }}
          style={{ background: srteEnabled ? '#1a3a2a' : '#161928', border: `1px solid ${srteEnabled ? '#34d399' : '#2a2d3e'}`,
            borderRadius: 6, color: srteEnabled ? '#34d399' : '#7c8db5', padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
          SR-TE: {srteEnabled ? 'ON' : 'OFF'}
        </button>
        <button onClick={() => { setPackets([]); resetStats() }}
          style={{ background: '#1e1b4b', border: '1px solid #6366f1', borderRadius: 6, color: '#818cf8', padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
          ↺ Clear
        </button>
      </div>

      {/* SVG fabric */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block', marginBottom: 14, background: '#090b12', borderRadius: 8 }}>
        {/* Background links: leaves to all spines */}
        {GPU_LEAVES.map(leaf =>
          SPINE_X.map((sx, si) => (
            <line key={`${leaf.label}-s${si}`}
              x1={leaf.x + NODE_R} y1={leaf.y} x2={sx} y2={SPINE_Y}
              stroke="#1e2130" strokeWidth={1} />
          ))
        )}
        {/* Spine to storage links */}
        {SPINE_X.map((sx, si) => (
          <line key={`spine${si}-storage`}
            x1={sx} y1={SPINE_Y} x2={STORAGE_LEAF.x - NODE_R} y2={STORAGE_LEAF.y}
            stroke="#1e2130" strokeWidth={1} />
        ))}

        {/* SR-TE highlighted paths: checkpoint on spine-02/03 */}
        {srteEnabled && [1, 2].map(si => (
          <g key={`srte-${si}`}>
            <line x1={GPU_LEAVES[2].x + NODE_R} y1={GPU_LEAVES[2].y} x2={SPINE_X[si]} y2={SPINE_Y}
              stroke="#f97316" strokeWidth={2} strokeDasharray="6 3" opacity={0.5} />
            <line x1={SPINE_X[si]} y1={SPINE_Y} x2={STORAGE_LEAF.x - NODE_R} y2={STORAGE_LEAF.y}
              stroke="#f97316" strokeWidth={2} strokeDasharray="6 3" opacity={0.5} />
          </g>
        ))}

        {/* Spine switches */}
        {SPINE_X.map((sx, i) => {
          const isProtected = srteEnabled && i === 0
          const hasCheckpoint = !srteEnabled && stats.spine1CheckpointPkts > 0 && i === 0
          return (
            <g key={i}>
              <rect x={sx - 22} y={SPINE_Y - 18} width={44} height={36} rx={6}
                fill="#161928" stroke={hasCheckpoint ? '#f87171' : '#2a2d3e'} strokeWidth={hasCheckpoint ? 2 : 1} />
              <text x={sx} y={SPINE_Y - 4} fontSize={8} fill={isProtected ? '#76e5b5' : '#7c8db5'} textAnchor="middle" fontWeight="bold">
                Spine-0{i + 1}
              </text>
              <text x={sx} y={SPINE_Y + 10} fontSize={7} fill="#4a5568" textAnchor="middle">
                {isProtected ? 'NCCL only' : hasCheckpoint ? 'MIXED!' : 'all traffic'}
              </text>
              {hasCheckpoint && (
                <circle cx={sx + 18} cy={SPINE_Y - 16} r={5} fill="#f87171" />
              )}
            </g>
          )
        })}

        {/* GPU leaf switches */}
        {GPU_LEAVES.map((leaf, i) => (
          <g key={i}>
            <rect x={leaf.x - NODE_R} y={leaf.y - NODE_R} width={NODE_R * 2} height={NODE_R * 2} rx={6}
              fill="#1a2a1a" stroke={leaf.rack === 'B' ? '#f97316' : '#2a4a2a'} strokeWidth={1} />
            <text x={leaf.x} y={leaf.y - 4} fontSize={8} fill={leaf.rack === 'B' ? '#f97316' : '#76e5b5'} textAnchor="middle">{leaf.label}</text>
            <text x={leaf.x} y={leaf.y + 9} fontSize={7} fill="#4a5568" textAnchor="middle">
              {leaf.rack === 'B' ? 'checkpoint src' : 'NCCL src'}
            </text>
          </g>
        ))}

        {/* Storage leaf */}
        <rect x={STORAGE_LEAF.x - NODE_R} y={STORAGE_LEAF.y - NODE_R} width={NODE_R * 2} height={NODE_R * 2 + 6} rx={6}
          fill="#1a1a2e" stroke="#60a5fa" strokeWidth={1} />
        <text x={STORAGE_LEAF.x} y={STORAGE_LEAF.y - 4} fontSize={7.5} fill="#60a5fa" textAnchor="middle">Storage</text>
        <text x={STORAGE_LEAF.x} y={STORAGE_LEAF.y + 8} fontSize={7.5} fill="#60a5fa" textAnchor="middle">Leaf-08</text>

        {/* Animated packets */}
        {packets.map(p => (
          <circle key={p.id}
            cx={p.x} cy={p.y} r={4}
            fill={p.type === 'nccl' ? '#34d399' : '#f97316'}
            opacity={p.opacity}
          />
        ))}

        {/* Labels */}
        <text x={60} y={30} fontSize={10} fill="#7c8db5" textAnchor="middle">Rack A</text>
        <text x={60} y={290} fontSize={10} fill="#f97316" textAnchor="middle">Rack B</text>
        <text x={320} y={20} fontSize={10} fill="#7c8db5" textAnchor="middle">Spine Layer</text>
      </svg>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {[
          { label: 'Spine-01: Collective', value: stats.spine1CollectivePkts, color: '#34d399' },
          {
            label: 'Spine-01: Checkpoint',
            value: stats.spine1CheckpointPkts,
            color: srteEnabled ? '#76e5b5' : stats.spine1CheckpointPkts > 5 ? '#f87171' : '#fbbf24',
            suffix: srteEnabled ? ' (blocked by SR-TE)' : '',
          },
          { label: 'SR-TE Status', value: srteEnabled ? 'ENABLED' : 'DISABLED', color: srteEnabled ? '#34d399' : '#f87171' },
        ].map(s => (
          <div key={s.label} style={{ background: '#161928', border: '1px solid #2a2d3e', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>
              {s.value}{'suffix' in s ? s.suffix : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

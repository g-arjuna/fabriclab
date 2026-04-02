'use client'
import { useEffect, useRef, useState } from 'react'

interface TC {
  id: number
  name: string
  dscp: string
  mode: 'SP' | 'DWRR'
  spPriority?: number
  dwrrWeight?: number
  pfcEnabled: boolean
  ecnEnabled: boolean
  color: string
  description: string
}

const TCS: TC[] = [
  { id: 6, name: 'CNP Feedback', dscp: '48', mode: 'SP', spPriority: 3, pfcEnabled: false, ecnEnabled: false, color: '#f87171', description: 'Congestion Notification Packets â€” must never be paused. Always served first.' },
  { id: 3, name: 'RoCEv2 Training', dscp: '26', mode: 'SP', spPriority: 2, pfcEnabled: true, ecnEnabled: true, color: '#76e5b5', description: 'AI training RDMA traffic â€” lossless, PFC-protected, ECN-marked for DCQCN.' },
  { id: 5, name: 'NCCL Collectives', dscp: '46', mode: 'DWRR', dwrrWeight: 32, pfcEnabled: false, ecnEnabled: false, color: '#a78bfa', description: 'NCCL high-priority collectives â€” lossy but high-weight DWRR.' },
  { id: 1, name: 'Checkpoint Storage', dscp: '10', mode: 'DWRR', dwrrWeight: 8, pfcEnabled: false, ecnEnabled: false, color: '#fbbf24', description: 'DGX-to-storage checkpoint traffic â€” lower DWRR weight, best-effort.' },
  { id: 0, name: 'Default Lossy', dscp: '0-25, 27-47, 49-63', mode: 'DWRR', dwrrWeight: 16, pfcEnabled: false, ecnEnabled: false, color: '#7c8db5', description: 'All other traffic â€” TCP, management, default â€” shares the lossy pool.' },
]

export default function QoSSchedulerViz() {
  const [load, setLoad] = useState(60)
  const [hoveredTc, setHoveredTc] = useState<number | null>(null)
  const [tick, setTick] = useState(0)
  const animRef = useRef<number | null>(null)

  useEffect(() => {
    let frame = 0
    const animate = () => {
      frame++
      if (frame % 3 === 0) setTick(t => t + 1)
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [])

  const getQueueDepth = (tc: TC): number => {
    const base = load / 100
    if (tc.mode === 'SP') {
      if (tc.id === 6) return Math.min(base * 0.05, 0.08)
      if (tc.id === 3) {
        if (tc.ecnEnabled && load > 40) return Math.min(base * 0.3, 0.55)
        return Math.min(base * 0.7, 0.95)
      }
    }
    const weightRatio = (tc.dwrrWeight ?? 16) / 56
    return Math.min(base * (1 - weightRatio * 0.3), 0.85)
  }

  const getAnimatedDepth = (tc: TC): number => {
    const base = getQueueDepth(tc)
    const wiggle = Math.sin((tick + tc.id * 7) * 0.15) * 0.03
    return Math.max(0, Math.min(1, base + wiggle))
  }

  const totalDwrrWeight = TCS.filter(t => t.mode === 'DWRR').reduce((a, t) => a + (t.dwrrWeight ?? 0), 0)
  const spTcs = TCS.filter(t => t.mode === 'SP').sort((a, b) => (b.spPriority ?? 0) - (a.spPriority ?? 0))
  const dwrrTcs = TCS.filter(t => t.mode === 'DWRR').sort((a, b) => (b.dwrrWeight ?? 0) - (a.dwrrWeight ?? 0))
  const hovered = hoveredTc !== null ? TCS.find(t => t.id === hoveredTc) : null

  return (
    <div style={{
      background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 12,
      padding: '20px 24px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: '#e2e8f0', maxWidth: 680, margin: '24px auto',
    }}>
      <div style={{ fontSize: 13, color: '#7c8db5', marginBottom: 4, letterSpacing: '0.08em' }}>ANIMATED SIMULATION</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#60a5fa', marginBottom: 16 }}>QoS Scheduler â€” SP vs DWRR Under Load</div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#7c8db5', marginBottom: 6 }}>
          Fabric Load: <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{load}%</span>
          {load > 75 && <span style={{ color: '#f87171', marginLeft: 8 }}>â† DWRR starvation risk</span>}
          {load > 40 && load <= 75 && <span style={{ color: '#fbbf24', marginLeft: 8 }}>â† ECN marking active on TC3</span>}
        </div>
        <input type="range" min={0} max={100} value={load} onChange={e => setLoad(Number(e.target.value))} style={{ width: '100%', accentColor: '#60a5fa' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#4a5568' }}>
          <span>0% idle</span><span>100% full congestion</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#f87171', marginBottom: 8, letterSpacing: '0.08em', borderBottom: '1px solid #2a2d3e', paddingBottom: 4 }}>
            STRICT PRIORITY (served first)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {spTcs.map(tc => {
              const depth = getAnimatedDepth(tc)
              const isHovered = hoveredTc === tc.id
              return (
                <div key={tc.id} onMouseEnter={() => setHoveredTc(tc.id)} onMouseLeave={() => setHoveredTc(null)} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: tc.color }} />
                    <span style={{ fontSize: 10, color: tc.color, fontWeight: 700 }}>TC{tc.id}</span>
                    <span style={{ fontSize: 10, color: '#7c8db5' }}>{tc.name}</span>
                    {tc.pfcEnabled && <span style={{ fontSize: 9, color: '#76e5b5', background: '#0d2a1f', padding: '1px 4px', borderRadius: 3 }}>PFC</span>}
                    {tc.ecnEnabled && <span style={{ fontSize: 9, color: '#60a5fa', background: '#0d1a2a', padding: '1px 4px', borderRadius: 3 }}>ECN</span>}
                  </div>
                  <div style={{ height: 20, background: '#161928', borderRadius: 4, border: `1px solid ${isHovered ? tc.color : '#2a2d3e'}`, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${depth * 100}%`, background: tc.color, opacity: 0.8, transition: 'width 0.15s ease' }} />
                    <div style={{ position: 'absolute', right: 4, top: 0, bottom: 0, display: 'flex', alignItems: 'center', fontSize: 9, color: '#e2e8f0' }}>{Math.round(depth * 100)}%</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#60a5fa', marginBottom: 8, letterSpacing: '0.08em', borderBottom: '1px solid #2a2d3e', paddingBottom: 4 }}>
            DWRR (served proportionally)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {dwrrTcs.map(tc => {
              const depth = getAnimatedDepth(tc)
              const isHovered = hoveredTc === tc.id
              const sharePercent = Math.round(((tc.dwrrWeight ?? 0) / totalDwrrWeight) * 100)
              return (
                <div key={tc.id} onMouseEnter={() => setHoveredTc(tc.id)} onMouseLeave={() => setHoveredTc(null)} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: tc.color }} />
                    <span style={{ fontSize: 10, color: tc.color, fontWeight: 700 }}>TC{tc.id}</span>
                    <span style={{ fontSize: 10, color: '#7c8db5' }}>{tc.name}</span>
                    <span style={{ fontSize: 9, color: '#4a5568' }}>w={tc.dwrrWeight} ({sharePercent}%)</span>
                  </div>
                  <div style={{ height: 20, background: '#161928', borderRadius: 4, border: `1px solid ${isHovered ? tc.color : '#2a2d3e'}`, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${depth * 100}%`, background: tc.color, opacity: 0.7, transition: 'width 0.15s ease' }} />
                    {load > 75 && <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(248,113,113,0.1) 4px, rgba(248,113,113,0.1) 8px)' }} />}
                    <div style={{ position: 'absolute', right: 4, top: 0, bottom: 0, display: 'flex', alignItems: 'center', fontSize: 9, color: '#e2e8f0' }}>{Math.round(depth * 100)}%</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {hovered && (
        <div style={{ background: '#161928', border: `1px solid ${hovered.color}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 }}>
          <span style={{ color: hovered.color, fontWeight: 700 }}>TC{hovered.id} â€” {hovered.name}: </span>
          {hovered.description}
          {hovered.id === 6 && !hovered.pfcEnabled && (
            <div style={{ color: '#f87171', marginTop: 4, fontSize: 11 }}>
              âš  PFC DISABLED on TC6 is MANDATORY â€” enabling it breaks DCQCN feedback loop
            </div>
          )}
        </div>
      )}
      <div style={{ marginTop: 10, fontSize: 11, color: '#4a5568', textAlign: 'center' }}>
        Hover over any TC Â· Drag slider to simulate congestion
      </div>
    </div>
  )
}

'use client'
import { useEffect, useRef, useState } from 'react'

type Phase = 'idle' | 'congestion' | 'ecn_marking' | 'pfc_start' | 'storm' | 'watchdog' | 'recovery'

interface PhaseInfo {
  id: Phase
  label: string
  description: string
  color: string
  queuePct: number
  pfcActive: boolean
  ecnActive: boolean
  watchdogActive: boolean
  throughputPct: number
}

const PHASES: PhaseInfo[] = [
  { id: 'idle', label: 'Idle', description: 'Fabric at rest. TC3 queue empty. No congestion signals.', color: '#76e5b5', queuePct: 5, pfcActive: false, ecnActive: false, watchdogActive: false, throughputPct: 100 },
  { id: 'congestion', label: 'Congestion Onset', description: 'Multi-flow burst arrives. TC3 queue depth rising. BDP accumulating in buffer.', color: '#fbbf24', queuePct: 30, pfcActive: false, ecnActive: false, watchdogActive: false, throughputPct: 95 },
  { id: 'ecn_marking', label: 'ECN Marks (DCQCN)', description: 'Queue crosses min_threshold (500KB). Spectrum-4 marks CE bits. NICs generate CNP. Senders rate-limit. Queue stabilizes.', color: '#60a5fa', queuePct: 45, pfcActive: false, ecnActive: true, watchdogActive: false, throughputPct: 88 },
  { id: 'pfc_start', label: 'PFC Triggers (safety net)', description: 'Without ECN: queue keeps rising past xoff threshold. Switch sends 802.1Qbb PAUSE on priority 3. Upstream NIC stops transmitting.', color: '#f97316', queuePct: 78, pfcActive: true, ecnActive: false, watchdogActive: false, throughputPct: 60 },
  { id: 'storm', label: 'PFC Storm (deadlock)', description: 'PFC propagates upstream hop-by-hop. Every switch in path pauses. CNP packets stuck behind paused queue. DCQCN loop broken. Queue stays at 100%.', color: '#f87171', queuePct: 100, pfcActive: true, ecnActive: false, watchdogActive: false, throughputPct: 0 },
  { id: 'watchdog', label: 'Watchdog Fires (200ms)', description: 'PFC watchdog detects continuous pause for >200ms. Fires in DROP mode: starts discarding TC3 frames to break deadlock. Retransmits begin.', color: '#a78bfa', queuePct: 95, pfcActive: true, ecnActive: false, watchdogActive: true, throughputPct: 15 },
  { id: 'recovery', label: 'Recovery', description: 'Watchdog drops drain the queue. PFC pause clears. Senders resume. With ECN configured correctly, system never reaches PFC storm phase.', color: '#76e5b5', queuePct: 20, pfcActive: false, ecnActive: true, watchdogActive: false, throughputPct: 90 },
]

export default function PFCStormProgressionViz() {
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [autoPlay, setAutoPlay] = useState(false)
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const phase = PHASES[phaseIdx]

  useEffect(() => {
    if (autoPlay) {
      animRef.current = setInterval(() => setPhaseIdx(i => (i + 1) % PHASES.length), 2200)
    }
    return () => { if (animRef.current) clearInterval(animRef.current) }
  }, [autoPlay])

  const isStormPath = phaseIdx >= 3

  return (
    <div style={{
      background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 12,
      padding: '20px 24px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: '#e2e8f0', maxWidth: 680, margin: '24px auto',
    }}>
      <div style={{ fontSize: 13, color: '#7c8db5', marginBottom: 4, letterSpacing: '0.08em' }}>ANIMATED SIMULATION</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#60a5fa', marginBottom: 16 }}>PFC Storm Progression and Watchdog Response</div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {PHASES.map((p, i) => (
          <button key={p.id} onClick={() => { setPhaseIdx(i); setAutoPlay(false) }}
            style={{
              flex: 1, minWidth: 70, padding: '5px 4px', borderRadius: 6, fontSize: 9, cursor: 'pointer',
              border: `1px solid ${i === phaseIdx ? p.color : '#2a2d3e'}`,
              background: i === phaseIdx ? p.color : i < phaseIdx ? '#161928' : '#0d0f18',
              color: i === phaseIdx ? '#0f1117' : i < phaseIdx ? p.color : '#4a5568',
              fontFamily: 'inherit', fontWeight: i === phaseIdx ? 700 : 400, textAlign: 'center', lineHeight: 1.3,
            }}>
            {i + 1}. {p.label.split(' ')[0]}<br />{p.label.split(' ').slice(1).join(' ')}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
        <div style={{ width: 80, background: '#161928', border: '1px solid #2a2d3e', borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 10, color: '#7c8db5', textAlign: 'center' }}>TC3 Queue</div>
          <div style={{ flex: 1, width: 30, background: '#0d0f18', borderRadius: 4, overflow: 'hidden', position: 'relative', minHeight: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ width: '100%', height: `${phase.queuePct}%`, background: phase.color, transition: 'height 0.6s ease, background 0.4s ease', borderRadius: 4 }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${100 - 75}%`, borderTop: '1px dashed #f97316' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${100 - 40}%`, borderTop: '1px dashed #60a5fa' }} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: phase.color }}>{phase.queuePct}%</div>
          <div style={{ fontSize: 9, color: '#f97316' }}>â€” xoff(75%)</div>
          <div style={{ fontSize: 9, color: '#60a5fa' }}>â€” ecn(40%)</div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ background: '#161928', border: `1px solid ${phase.color}`, borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 13, color: phase.color, fontWeight: 700, marginBottom: 6 }}>Phase {phaseIdx + 1}: {phase.label}</div>
            <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 }}>{phase.description}</div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: 'ECN Marking', active: phase.ecnActive, color: '#60a5fa' },
              { label: 'PFC Active', active: phase.pfcActive, color: '#f97316' },
              { label: 'Watchdog', active: phase.watchdogActive, color: '#a78bfa' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, background: s.active ? '#161928' : '#0d0f18', border: `1px solid ${s.active ? s.color : '#2a2d3e'}`, borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: '#7c8db5' }}>{s.label}</div>
                <div style={{ fontSize: 13, color: s.active ? s.color : '#4a5568', fontWeight: 700 }}>{s.active ? 'ON' : 'OFF'}</div>
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 4 }}>Throughput: <span style={{ color: phase.throughputPct > 70 ? '#76e5b5' : phase.throughputPct > 30 ? '#fbbf24' : '#f87171' }}>{phase.throughputPct}%</span></div>
            <div style={{ height: 10, background: '#161928', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${phase.throughputPct}%`, background: phase.throughputPct > 70 ? '#76e5b5' : phase.throughputPct > 30 ? '#fbbf24' : '#f87171', borderRadius: 5, transition: 'width 0.5s ease, background 0.4s ease' }} />
            </div>
          </div>
        </div>
      </div>

      {isStormPath && phaseIdx < 6 && <div style={{ background: '#2a0f0f', border: '1px solid #f87171', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 11, color: '#f87171' }}>âš  This path occurs when ECN is misconfigured. With correct ECN (min_threshold=500KB), DCQCN rate-limits senders at Phase 3 and the queue never reaches xoff.</div>}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => setPhaseIdx(i => Math.max(0, i - 1))} disabled={phaseIdx === 0} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: phaseIdx === 0 ? 'not-allowed' : 'pointer', background: '#161928', border: '1px solid #2a2d3e', color: phaseIdx === 0 ? '#4a5568' : '#e2e8f0', fontFamily: 'inherit' }}>â† Prev</button>
        <button onClick={() => setAutoPlay(a => !a)} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: autoPlay ? '#f97316' : '#161928', border: `1px solid ${autoPlay ? '#f97316' : '#2a2d3e'}`, color: autoPlay ? '#0f1117' : '#e2e8f0', fontFamily: 'inherit', fontWeight: autoPlay ? 700 : 400 }}>{autoPlay ? 'â¸ Pause' : 'â–¶ Auto-Play'}</button>
        <button onClick={() => setPhaseIdx(i => Math.min(PHASES.length - 1, i + 1))} disabled={phaseIdx === PHASES.length - 1} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: phaseIdx === PHASES.length - 1 ? 'not-allowed' : 'pointer', background: '#161928', border: '1px solid #2a2d3e', color: phaseIdx === PHASES.length - 1 ? '#4a5568' : '#e2e8f0', fontFamily: 'inherit' }}>Next â†’</button>
      </div>
    </div>
  )
}

'use client'
import { useState, useMemo } from 'react'

/**
 * UFMCyberAIViz
 * Mock UFM Cyber-AI dashboard.
 * 24-hour telemetry time series with baseline band and 3 anomaly events.
 * Click anomaly markers to expand detail cards. Acknowledge to dismiss.
 */

interface AnomalyEvent {
  id: string
  timeH: number   // hour on chart (0-24)
  severity: 'Critical' | 'High' | 'Medium'
  title: string
  affected: string
  description: string
  recommendation: string
  acknowledged: boolean
}

const INITIAL_EVENTS: AnomalyEvent[] = [
  {
    id: 'evt1',
    timeH: 6,
    severity: 'Critical',
    title: 'Hardware — Degraded optic detected',
    affected: 'leaf-02 swp7',
    description: 'Port symbol error rate has spiked 8σ above baseline over the past 4 minutes. This pattern is consistent with a dirty or failing QSFP28 optic. The link has not gone down yet but is at risk of err-disable.',
    recommendation: 'Run ibdiagnet -r to confirm BER rate. Check physical connector and clean QSFP if accessible. Schedule optic replacement at next maintenance window. Reference: Lab 9 err-disable recovery.',
    acknowledged: false,
  },
  {
    id: 'evt2',
    timeH: 14,
    severity: 'High',
    title: 'Traffic anomaly — Unusual all-to-one pattern',
    affected: 'tenantB-node-03 → 10.50.0.1',
    description: 'tenantB-node-03 has been sending sustained 380 Gbps to a single destination (10.50.0.1) for 22 minutes. This destination is outside the normal job communication matrix for TenantB. No matching NCCL job is registered.',
    recommendation: 'Verify VRF routing table on leaf-02. Confirm GBP policy is applied. Check what job is running on tenantB-node-03 — this pattern is consistent with unauthorised bulk data copy or misconfigured storage job.',
    acknowledged: false,
  },
  {
    id: 'evt3',
    timeH: 20,
    severity: 'Medium',
    title: 'Fabric health — Coordinated PFC pause increase',
    affected: 'leaf-01 swp1–8 (8 ports)',
    description: 'PFC pause frames on 8 consecutive ports on leaf-01 increased simultaneously at 20:14:38. The synchronised onset (all 8 ports within the same 50ms window) is not consistent with normal training traffic, which produces staggered PFC events.',
    recommendation: 'Check ECN thresholds on leaf-01 with nv show qos ecn profile roce. Verify DSCP 26 is on a lossless queue. Run ib_write_bw between a pair of affected nodes to baseline. Consider whether a new training job started at ~20:14.',
    acknowledged: false,
  },
]

// Generate 24h telemetry data with anomaly spikes
function buildTimeSeries(events: AnomalyEvent[]): { t: number; val: number; baseline: number; upper: number; lower: number }[] {
  return Array.from({ length: 289 }, (_, i) => {
    const t = i / 12  // hours (0..24, step 0.0833h = 5min)
    // Baseline: daily pattern (higher during work hours)
    const hourOfDay = t % 24
    const baseline = 15 + 8 * Math.sin((hourOfDay - 6) * Math.PI / 12) + Math.random() * 2

    let spike = 0
    for (const evt of events) {
      if (!evt.acknowledged) {
        const dt = t - evt.timeH
        if (dt >= 0 && dt < 0.5) {
          const mag = evt.severity === 'Critical' ? 55 : evt.severity === 'High' ? 35 : 20
          spike = mag * Math.exp(-dt * 6)
        }
      }
    }

    return {
      t,
      val: Math.max(0, baseline + spike),
      baseline,
      upper: baseline + 6,
      lower: Math.max(0, baseline - 3),
    }
  })
}

const SEV_COLOR = { Critical: '#f87171', High: '#fbbf24', Medium: '#60a5fa' }
const SEV_BG = { Critical: '#7f1d1d', High: '#451a03', Medium: '#1e3a5f' }

export default function UFMCyberAIViz() {
  const [events, setEvents] = useState<AnomalyEvent[]>(INITIAL_EVENTS)
  const [selectedEvt, setSelectedEvt] = useState<string | null>('evt1')

  const series = useMemo(() => buildTimeSeries(events), [events])

  const activeEvents = events.filter(e => !e.acknowledged)
  const critCount = activeEvents.filter(e => e.severity === 'Critical').length
  const highCount = activeEvents.filter(e => e.severity === 'High').length
  const medCount = activeEvents.filter(e => e.severity === 'Medium').length

  const acknowledge = (id: string) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, acknowledged: true } : e))
    if (selectedEvt === id) setSelectedEvt(null)
  }

  // Chart dimensions
  const W = 560
  const H = 140
  const PAD = { top: 12, right: 20, bottom: 28, left: 44 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom
  const maxVal = 80

  const toX = (t: number) => PAD.left + (t / 24) * cW
  const toY = (v: number) => PAD.top + cH - (v / maxVal) * cH

  const baselinePoly = series.map(d => `${toX(d.t)},${toY(d.upper)}`).join(' ')
    + ' ' + [...series].reverse().map(d => `${toX(d.t)},${toY(d.lower)}`).join(' ')
  const valueLine = series.map(d => `${toX(d.t)},${toY(d.val)}`).join(' ')

  const selectedEvent = events.find(e => e.id === selectedEvt) ?? null

  return (
    <div style={{
      background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 12,
      padding: '20px 24px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: '#e2e8f0', maxWidth: 680, margin: '24px auto',
    }}>
      <div style={{ fontSize: 13, color: '#7c8db5', marginBottom: 4, letterSpacing: '0.08em' }}>INTERACTIVE</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#a78bfa', marginBottom: 4 }}>
        UFM Cyber-AI — Anomaly Detection Dashboard
      </div>

      {/* Summary bar */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap',
        background: '#161928', borderRadius: 8, padding: '8px 14px',
      }}>
        <span style={{ fontSize: 11, color: '#7c8db5' }}>Active events:</span>
        {[
          { label: 'Critical', count: critCount, color: SEV_COLOR.Critical },
          { label: 'High', count: highCount, color: SEV_COLOR.High },
          { label: 'Medium', count: medCount, color: SEV_COLOR.Medium },
        ].map(s => (
          <span key={s.label} style={{ fontSize: 11, color: s.color, fontWeight: 700 }}>
            {s.count} {s.label}
          </span>
        ))}
        {activeEvents.length === 0 && (
          <span style={{ fontSize: 11, color: '#76e5b5' }}>✓ All events acknowledged</span>
        )}
      </div>

      {/* Time series chart */}
      <div style={{ overflowX: 'auto', marginBottom: 12 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: W, maxWidth: W, display: 'block' }}>
        {/* Grid */}
        {[0, 20, 40, 60, 80].map(v => (
          <g key={v}>
            <line x1={PAD.left} y1={toY(v)} x2={PAD.left + cW} y2={toY(v)} stroke="#1e2130" strokeWidth={1} />
            <text x={PAD.left - 6} y={toY(v) + 4} fontSize={8} fill="#4a5568" textAnchor="end">{v}</text>
          </g>
        ))}
        {/* X axis labels */}
        {[0, 6, 12, 18, 24].map(h => (
          <text key={h} x={toX(h)} y={H - 6} fontSize={8} fill="#4a5568" textAnchor="middle">{h}h</text>
        ))}
        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top + cH} x2={PAD.left + cW} y2={PAD.top + cH} stroke="#2a2d3e" />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + cH} stroke="#2a2d3e" />

        {/* Baseline band */}
        <polygon points={baselinePoly} fill="#60a5fa" fillOpacity={0.08} />
        <text x={PAD.left + cW - 4} y={PAD.top + 10} fontSize={8} fill="#60a5fa" textAnchor="end" opacity={0.6}>baseline</text>

        {/* Value line */}
        <polyline points={valueLine} fill="none" stroke="#a78bfa" strokeWidth={1.5} />

        {/* Anomaly markers */}
        {events.map(evt => {
          const x = toX(evt.timeH)
          const color = SEV_COLOR[evt.severity]
          const isSelected = selectedEvt === evt.id
          return (
            <g key={evt.id} style={{ cursor: evt.acknowledged ? 'default' : 'pointer' }}
              onClick={() => !evt.acknowledged && setSelectedEvt(isSelected ? null : evt.id)}>
              {!evt.acknowledged && (
                <>
                  <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + cH}
                    stroke={color} strokeWidth={1.5} strokeDasharray="5 3" opacity={0.7} />
                  <circle cx={x} cy={PAD.top} r={6} fill={color} opacity={isSelected ? 1 : 0.8} />
                  <text x={x} y={PAD.top + 4} fontSize={8} fill="#000" textAnchor="middle" fontWeight="bold">
                    {evt.severity === 'Critical' ? '!' : evt.severity === 'High' ? '▲' : '●'}
                  </text>
                </>
              )}
            </g>
          )
        })}

        {/* Y-axis label */}
        <text x={10} y={PAD.top + cH / 2} fontSize={8} fill="#4a5568" textAnchor="middle"
          transform={`rotate(-90, 10, ${PAD.top + cH / 2})`}>
          error rate
        </text>
      </svg>
      </div>

      {/* Event detail */}
      {selectedEvent && !selectedEvent.acknowledged && (
        <div style={{
          background: SEV_BG[selectedEvent.severity] + '88',
          border: `1px solid ${SEV_COLOR[selectedEvent.severity]}`,
          borderRadius: 10, padding: '14px 16px', marginBottom: 10,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <div>
              <span style={{
                fontSize: 9, fontWeight: 700, color: SEV_COLOR[selectedEvent.severity],
                background: SEV_BG[selectedEvent.severity], borderRadius: 3, padding: '2px 6px', marginRight: 8,
              }}>
                {selectedEvent.severity.toUpperCase()}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>
                {selectedEvent.title}
              </span>
            </div>
            <button onClick={() => acknowledge(selectedEvent.id)}
              style={{
                background: '#064e3b', border: '1px solid #76e5b5', borderRadius: 5,
                color: '#76e5b5', padding: '4px 10px', cursor: 'pointer', fontSize: 11,
                fontFamily: 'inherit',
              }}>
              Acknowledge
            </button>
          </div>
          <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 6 }}>
            Affected: <span style={{ color: '#e2e8f0' }}>{selectedEvent.affected}</span>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6, marginBottom: 8 }}>
            {selectedEvent.description}
          </div>
          <div style={{ background: '#0d0f18', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: '#7c8db5', lineHeight: 1.5 }}>
            <span style={{ color: SEV_COLOR[selectedEvent.severity], fontWeight: 700 }}>Recommended action: </span>
            {selectedEvent.recommendation}
          </div>
        </div>
      )}

      {/* Event list */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {events.map(evt => (
          <button key={evt.id}
            onClick={() => !evt.acknowledged && setSelectedEvt(selectedEvt === evt.id ? null : evt.id)}
            style={{
              background: evt.acknowledged ? '#1a1f2e' : SEV_BG[evt.severity] + '88',
              border: `1px solid ${evt.acknowledged ? '#2a2d3e' : selectedEvt === evt.id ? SEV_COLOR[evt.severity] : SEV_COLOR[evt.severity] + '55'}`,
              borderRadius: 5, color: evt.acknowledged ? '#4a5568' : SEV_COLOR[evt.severity],
              padding: '4px 10px', cursor: evt.acknowledged ? 'default' : 'pointer',
              fontSize: 10, fontFamily: 'inherit',
              textDecoration: evt.acknowledged ? 'line-through' : 'none',
            }}>
            {evt.acknowledged ? '✓ Acknowledged' : `${evt.severity}: ${evt.title.split('—')[0].trim()}`}
          </button>
        ))}
      </div>
    </div>
  )
}

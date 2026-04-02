'use client'
import { useState } from 'react'

const COMPONENTS = [
  {
    id: 'nvue',
    label: 'NVUE',
    sublabel: 'nv set / nv config apply',
    color: '#76e5b5',
    x: 30, y: 80, w: 110, h: 60,
    detail: 'Declarative CLI layer on Cumulus Linux 5.x. All configuration is staged as a candidate JSON document and applied atomically. Rollback to any previous revision: `nv config rollback <rev>`. No partial config states reach the forwarding plane.',
    flow: ['cumulus'],
  },
  {
    id: 'cumulus',
    label: 'Cumulus Linux',
    sublabel: 'FRR · ASIC driver · kernel netlink',
    color: '#60a5fa',
    x: 190, y: 80, w: 120, h: 60,
    detail: 'Linux-native NOS. NVUE config translates into FRR daemon config (/etc/frr/frr.conf) and kernel interface config. ASIC SDK driver programs the Spectrum-4 forwarding tables via the switchdev kernel interface.',
    flow: ['doca', 'spectrum4'],
  },
  {
    id: 'spectrum4',
    label: 'Spectrum-4 ASIC',
    sublabel: 'AR · Buffer · WJH · ECN',
    color: '#f97316',
    x: 360, y: 140, w: 120, h: 60,
    detail: 'Cumulus programs ECMP tables, PFC/ECN thresholds, and QoS queue assignments into the ASIC via SDK. The ASIC AR engine operates autonomously — per-packet queue depth polling requires no Cumulus involvement once the ASIC is programmed.',
    flow: ['netq'],
  },
  {
    id: 'doca',
    label: 'DOCA SDK',
    sublabel: 'Flow · Compress · App Shield',
    color: '#a78bfa',
    x: 360, y: 20, w: 120, h: 60,
    detail: 'DOCA applications run on host Linux and communicate with BF3 via PCIe. DOCA Flow programs eSwitch match-action rules on the BF3. DOCA Compress offloads checkpoint compression. DOCA App Shield monitors host process integrity from the isolated DPU OS. B200 / BF3 only.',
    flow: ['netq'],
  },
  {
    id: 'netq',
    label: 'NetQ',
    sublabel: 'Push events · WJH stream · time-series',
    color: '#fbbf24',
    x: 530, y: 80, w: 120, h: 60,
    detail: 'NetQ agents on every switch and host push state-change events and WJH drop records to the central NetQ server. Push-based model means historical events are queryable without issuing live polls. CI/CD systems query NetQ to detect fabric anomalies before promoting config changes.',
    flow: ['air'],
  },
  {
    id: 'air',
    label: 'NVIDIA Air',
    sublabel: 'Digital twin · CI/CD integration',
    color: '#f87171',
    x: 530, y: 195, w: 120, h: 60,
    detail: 'Import NVUE topology into Air to create a digital twin simulation. Run test traffic, validate BGP policy changes, and tune PFC/ECN thresholds before applying to production. Air exposes an API for CI/CD pipelines — a PR that changes switch config can auto-trigger an Air sim and block merge on failure.',
    flow: [],
  },
]

const FLOW_COLORS: Record<string, string> = {
  nvue: '#76e5b5',
  cumulus: '#60a5fa',
  spectrum4: '#f97316',
  doca: '#a78bfa',
  netq: '#fbbf24',
  air: '#f87171',
}

export default function SpectrumXSoftwareStackViz() {
  const [active, setActive] = useState<string | null>(null)
  const [hovering, setHovering] = useState<string | null>(null)

  const activeComp = COMPONENTS.find(c => c.id === active)

  // Arrow endpoints between components
  const ARROWS = [
    { from: 'nvue', to: 'cumulus', label: 'nv config apply' },
    { from: 'cumulus', to: 'spectrum4', label: 'ASIC SDK' },
    { from: 'cumulus', to: 'doca', label: 'DOCA API' },
    { from: 'spectrum4', to: 'netq', label: 'WJH events' },
    { from: 'doca', to: 'netq', label: 'telemetry' },
    { from: 'netq', to: 'air', label: 'validate' },
  ]

  const getCenter = (id: string) => {
    const c = COMPONENTS.find(c => c.id === id)!
    return { x: c.x + c.w / 2, y: c.y + c.h / 2 }
  }

  const isHighlighted = (id: string) => {
    if (!active) return true
    if (id === active) return true
    const ac = COMPONENTS.find(c => c.id === active)
    if (ac && ac.flow.includes(id)) return true
    // also highlight if this component points to active
    const other = COMPONENTS.find(c => c.id === id)
    if (other && other.flow.includes(active)) return true
    return false
  }

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
        Spectrum-X Software Stack — Component Interactions
      </div>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <svg viewBox="0 0 680 280" style={{ width: '100%', minWidth: 680, maxWidth: 680, display: 'block' }}>
        {/* Arrows */}
        {ARROWS.map(({ from, to, label }) => {
          const f = getCenter(from)
          const t = getCenter(to)
          const fc = COMPONENTS.find(c => c.id === from)!
          const tc = COMPONENTS.find(c => c.id === to)!

          // Adjust to edges
          const fx = f.x + fc.w / 2
          const tx = t.x - tc.w / 2
          const fy = f.y
          const ty = t.y
          const highlighted = !active || isHighlighted(from) || isHighlighted(to)
          return (
            <g key={`${from}-${to}`}>
              <line x1={fx} y1={fy} x2={tx} y2={ty}
                stroke={highlighted ? '#2a2d3e' : '#1a1d2e'}
                strokeWidth={highlighted ? 1.5 : 0.5}
                markerEnd="url(#arrow)" />
              <text x={(fx + tx) / 2} y={(fy + ty) / 2 - 4}
                fill={highlighted ? '#4a5568' : '#2a2d3e'}
                fontSize={8} fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
                {label}
              </text>
            </g>
          )
        })}

        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#2a2d3e" />
          </marker>
        </defs>

        {/* Component boxes */}
        {COMPONENTS.map(c => {
          const highlighted = isHighlighted(c.id)
          const isActive = active === c.id
          return (
            <g key={c.id}
              onClick={() => setActive(isActive ? null : c.id)}
              onMouseEnter={() => setHovering(c.id)}
              onMouseLeave={() => setHovering(null)}
              style={{ cursor: 'pointer' }}>
              <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={8}
                fill={isActive ? `${c.color}20` : '#161928'}
                stroke={isActive ? c.color : highlighted ? '#2a2d3e' : '#1a1d2e'}
                strokeWidth={isActive ? 2 : 1}
                opacity={highlighted ? 1 : 0.3} />
              <text x={c.x + c.w / 2} y={c.y + 24}
                fill={highlighted ? c.color : '#4a5568'}
                fontSize={11} fontFamily="'JetBrains Mono',monospace"
                textAnchor="middle" fontWeight={700}>
                {c.label}
              </text>
              <text x={c.x + c.w / 2} y={c.y + 39}
                fill={highlighted ? '#7c8db5' : '#2a2d3e'}
                fontSize={8} fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
                {c.sublabel.split(' · ')[0]}
              </text>
              <text x={c.x + c.w / 2} y={c.y + 51}
                fill={highlighted ? '#4a5568' : '#1a1d2e'}
                fontSize={8} fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
                {c.sublabel.split(' · ').slice(1).join(' · ')}
              </text>
            </g>
          )
        })}
        </svg>
      </div>

      {activeComp && (
        <div style={{
          marginTop: 10, background: '#161928',
          border: `1px solid ${activeComp.color}40`, borderRadius: 8, padding: '12px 16px',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: activeComp.color, marginBottom: 6 }}>
            {activeComp.label}
          </div>
          <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.7 }}>
            {activeComp.detail}
          </div>
        </div>
      )}

      {!active && (
        <div style={{ fontSize: 11, color: '#4a5568', marginTop: 8 }}>
          Click any component to see detail and highlight its data flow
        </div>
      )}
    </div>
  )
}

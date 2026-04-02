'use client'
import { useState } from 'react'

const LAYERS = [
  {
    id: 'netq',
    label: 'NetQ Telemetry',
    sublabel: 'Push-based fabric events · WJH drop stream · time-series queries',
    color: '#a78bfa',
    icon: '📡',
    detail: 'NetQ agents run on every switch and host. Events push to a central server. Query: "all interfaces with >100 drops in last 10 min" — answered from stored data, not live poll.',
  },
  {
    id: 'doca',
    label: 'DOCA SDK',
    sublabel: 'Flow · Compress · App Shield · SuperNIC mode runtime',
    color: '#60a5fa',
    icon: '🧩',
    detail: 'DOCA applications run on host Linux and communicate with the BF3 ARM cores via PCIe. Host reboots do not require BF3 restart. Available only on DGX B200 (BF3-equipped).',
  },
  {
    id: 'cumulus',
    label: 'Cumulus Linux 5.x + NVUE',
    sublabel: 'FRR routing · nv set/apply · JSON config · rollback',
    color: '#76e5b5',
    icon: '🐧',
    detail: 'Cumulus Linux is Linux-native: full bash, FRR suite (BGP/OSPF/BFD), NVUE declarative API. Config stored as JSON. Two-phase commit (stage → apply) prevents partial config states.',
  },
  {
    id: 'asic',
    label: 'Spectrum-4 ASIC',
    sublabel: '51.2 Tbps · 48 MB buffer · AR engine · WJH · <300 ns cut-through',
    color: '#f97316',
    icon: '⚡',
    detail: 'Hardware adaptive routing reads egress queue depth per packet — no CPU. 48 MB shared buffer (4× Tomahawk 4). WJH captures drops with nanosecond timestamps into a ring buffer.',
  },
  {
    id: 'bf3',
    label: 'BlueField-3 SuperNIC',
    sublabel: 'DGX B200 ONLY · 16× ARM Cortex-A78AE · reorder buffer · eSwitch',
    color: '#fbbf24',
    icon: '🔁',
    detail: 'BF3 in SuperNIC mode holds out-of-order packets in a hardware reorder buffer before delivery to the RDMA QP. This prevents Go-Back-N retransmit storms under per-packet adaptive routing.',
  },
  {
    id: 'cx7',
    label: 'ConnectX-7 HCA',
    sublabel: 'DGX H100 / H200 / GH200 · 8×400 GbE · RoCEv2 · GPUDirect',
    color: '#f87171',
    icon: '🔌',
    detail: 'CX7 is the NIC in DGX H100, H200, and GH200. It does NOT have a reorder buffer. Per-packet adaptive routing with CX7 triggers Go-Back-N retransmits. Use flow-based AR with CX7.',
  },
]

const FABRIC_MAP: Record<string, { training: boolean; storage: boolean; oob: boolean }> = {
  netq: { training: true, storage: true, oob: true },
  doca: { training: true, storage: true, oob: false },
  cumulus: { training: true, storage: true, oob: true },
  asic: { training: true, storage: true, oob: false },
  bf3: { training: true, storage: true, oob: false },
  cx7: { training: true, storage: true, oob: false },
}

export default function SpectrumXStackViz() {
  const [activeLayer, setActiveLayer] = useState<string | null>(null)
  const [activeFabric, setActiveFabric] = useState<'training' | 'storage' | 'oob' | null>(null)

  const isHighlighted = (id: string) => {
    if (activeFabric === null && activeLayer === null) return true
    if (activeLayer === id) return true
    if (activeFabric && FABRIC_MAP[id][activeFabric]) return true
    return false
  }

  const active = LAYERS.find(l => l.id === activeLayer)

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
        Spectrum-X Platform Stack
      </div>

      {/* Fabric filter buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['training', 'storage', 'oob'] as const).map(f => (
          <button
            key={f}
            onClick={() => { setActiveFabric(activeFabric === f ? null : f); setActiveLayer(null) }}
            style={{
              padding: '4px 12px', borderRadius: 6, border: '1px solid #2a2d3e',
              background: activeFabric === f
                ? f === 'training' ? '#76e5b5' : f === 'storage' ? '#60a5fa' : '#a78bfa'
                : '#161928',
              color: activeFabric === f ? '#0f1117' : '#7c8db5',
              fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em',
              fontWeight: activeFabric === f ? 700 : 400,
            }}
          >
            {f.toUpperCase()} FABRIC
          </button>
        ))}
        {(activeFabric || activeLayer) && (
          <button
            onClick={() => { setActiveFabric(null); setActiveLayer(null) }}
            style={{
              padding: '4px 12px', borderRadius: 6, border: '1px solid #f87171',
              background: 'transparent', color: '#f87171', fontSize: 11, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Stack layers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {LAYERS.map((layer, i) => {
          const highlighted = isHighlighted(layer.id)
          const isActive = activeLayer === layer.id
          return (
            <div
              key={layer.id}
              onClick={() => setActiveLayer(isActive ? null : layer.id)}
              style={{
                border: `1px solid ${isActive ? layer.color : highlighted ? '#2a2d3e' : '#1a1d2e'}`,
                borderLeft: `4px solid ${highlighted ? layer.color : '#1a1d2e'}`,
                borderRadius: 8, padding: '10px 14px',
                background: isActive ? `${layer.color}18` : highlighted ? '#161928' : '#0d0f18',
                opacity: highlighted ? 1 : 0.35,
                cursor: 'pointer', transition: 'all 0.18s ease',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <span style={{ fontSize: 18, minWidth: 24 }}>{layer.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: highlighted ? layer.color : '#4a5568' }}>
                  {layer.label}
                </div>
                <div style={{ fontSize: 11, color: '#7c8db5', marginTop: 2 }}>
                  {layer.sublabel}
                </div>
              </div>
              <div style={{ fontSize: 10, color: '#4a5568', letterSpacing: '0.06em' }}>
                L{6 - i}
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail panel */}
      {active && (
        <div style={{
          marginTop: 14, background: '#161928', border: `1px solid ${active.color}40`,
          borderRadius: 8, padding: '12px 16px',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: active.color, marginBottom: 6 }}>
            {active.icon} {active.label}
          </div>
          <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.7 }}>
            {active.detail}
          </div>
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: 11, color: '#4a5568' }}>
        Click a layer to see detail · Filter by fabric type above
      </div>
    </div>
  )
}

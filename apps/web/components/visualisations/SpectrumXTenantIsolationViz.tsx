'use client'
import { useState } from 'react'

/**
 * SpectrumXTenantIsolationViz
 * Two-tenant Spectrum-X fabric diagram.
 * Controls: tenant A/B perspective tab, GBP ON/OFF toggle, simulate attack button.
 * Shows NVUE commands for current state in a code panel.
 */

type Tenant = 'A' | 'B'

export default function SpectrumXTenantIsolationViz() {
  const [activeTenant, setActiveTenant] = useState<Tenant>('A')
  const [gbpEnabled, setGbpEnabled] = useState(false)
  const [attackResult, setAttackResult] = useState<null | 'blocked' | 'success'>(null)
  const [showConfig, setShowConfig] = useState(false)

  const handleAttack = () => {
    setAttackResult(gbpEnabled ? 'blocked' : 'success')
    setTimeout(() => setAttackResult(null), 3500)
  }

  const TA = '#60a5fa'  // Tenant A — blue
  const TB = '#f97316'  // Tenant B — orange
  const ST = '#76e5b5'  // Storage — green
  const activeColor = activeTenant === 'A' ? TA : TB

  // SVG dimensions
  const W = 580
  const H = 300

  // Node positions
  const nodes = {
    // Tenant A
    taNode1: { x: 70, y: 80, label: 'TenantA\nGPU-01', color: TA },
    taNode2: { x: 70, y: 160, label: 'TenantA\nGPU-02', color: TA },
    // Tenant B
    tbNode1: { x: 70, y: 220, label: 'TenantB\nGPU-01', color: TB },
    tbNode2: { x: 70, y: 280, label: 'TenantB\nGPU-02', color: TB },
    // Leaf switches
    leaf01: { x: 220, y: 120, label: 'Leaf-01\n(VRF_A)' },
    leaf02: { x: 220, y: 250, label: 'Leaf-02\n(VRF_B)' },
    // Spine
    spine: { x: 360, y: 185, label: 'Spine-01' },
    // Storage
    storage: { x: 500, y: 120, label: 'Storage\n(VRF_A)' },
  }

  const NR = 28  // node rect half-width
  const NH = 22  // node rect half-height

  const NVUE_NO_GBP = `# VRF isolation only (no GBP):
nv set vrf VRF_A
nv set vrf VRF_B
nv set interface vlan100 ip vrf VRF_A
nv set interface vlan200 ip vrf VRF_B
# Result: Tenant A and B have separate routing tables.
# BUT: within VRF_A, all nodes can reach all others.
# GBP microsegmentation is NOT applied.`

  const NVUE_WITH_GBP = `# VRF isolation + GBP policy:
nv set system global-id group-policy enable on
nv set bridge domain br_default group-policy epg GPU-A id 10
nv set bridge domain br_default group-policy epg GPU-B id 20
nv set bridge domain br_default group-policy epg STORAGE id 30
# Allow TenantA GPUs → Storage:
nv set bridge domain br_default group-policy contract \\
  GPU-A-TO-STORAGE source-epg GPU-A \\
  destination-epg STORAGE action permit
# DENY TenantB GPUs → Storage (TenantA's):
nv set bridge domain br_default group-policy contract \\
  GPU-B-DENY source-epg GPU-B \\
  destination-epg STORAGE action deny
nv config apply`

  return (
    <div style={{
      background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 12,
      padding: '20px 24px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: '#e2e8f0', maxWidth: 680, margin: '24px auto',
    }}>
      <div style={{ fontSize: 13, color: '#7c8db5', marginBottom: 4, letterSpacing: '0.08em' }}>INTERACTIVE</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>
        Spectrum-X Multi-Tenant Isolation
      </div>
      <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 14 }}>
        Toggle GBP policy and simulate a cross-tenant access attempt.
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {/* Tenant tabs */}
        <div style={{ display: 'flex', border: '1px solid #2a2d3e', borderRadius: 6, overflow: 'hidden' }}>
          {(['A', 'B'] as Tenant[]).map(t => (
            <button key={t} onClick={() => setActiveTenant(t)}
              style={{
                background: activeTenant === t ? (t === 'A' ? '#0c2a4a' : '#3a1a0a') : '#161928',
                border: 'none', color: activeTenant === t ? (t === 'A' ? TA : TB) : '#7c8db5',
                padding: '6px 16px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
                fontWeight: activeTenant === t ? 700 : 400,
              }}>
              Tenant {t}
            </button>
          ))}
        </div>

        <button onClick={() => { setGbpEnabled(e => !e); setAttackResult(null) }}
          style={{
            background: gbpEnabled ? '#064e3b' : '#161928',
            border: `1px solid ${gbpEnabled ? '#76e5b5' : '#2a2d3e'}`,
            borderRadius: 6, color: gbpEnabled ? '#76e5b5' : '#7c8db5',
            padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
          }}>
          GBP: {gbpEnabled ? 'ON ✓' : 'OFF'}
        </button>

        <button onClick={handleAttack}
          style={{
            background: '#2d1515', border: '1px solid #f87171',
            borderRadius: 6, color: '#f87171',
            padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
          }}>
          ⚡ Simulate cross-tenant access
        </button>

        <button onClick={() => setShowConfig(c => !c)}
          style={{
            background: showConfig ? '#1e1b4b' : '#161928',
            border: `1px solid ${showConfig ? '#a78bfa' : '#2a2d3e'}`,
            borderRadius: 6, color: showConfig ? '#a78bfa' : '#7c8db5',
            padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
          }}>
          {showConfig ? '▾ Hide config' : '▸ Show NVUE config'}
        </button>
      </div>

      {/* Attack result banner */}
      {attackResult && (
        <div style={{
          marginBottom: 10,
          background: attackResult === 'blocked' ? '#0a2a1a' : '#2a0a0a',
          border: `1px solid ${attackResult === 'blocked' ? '#76e5b5' : '#f87171'}`,
          borderRadius: 8, padding: '10px 14px', fontSize: 12,
          color: attackResult === 'blocked' ? '#76e5b5' : '#f87171',
        }}>
          {attackResult === 'blocked'
            ? '🛡 BLOCKED — GBP TCAM rule denied Tenant B access to storage. Packet dropped at Leaf-01 ingress.'
            : '⚠ VIOLATION — Tenant B reached Tenant A\'s storage. No GBP policy active. Route in VRF_A allowed transit.'}
        </div>
      )}

      {/* Fabric SVG */}
      <svg viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', maxWidth: W, display: 'block', marginBottom: 12, background: '#090b12', borderRadius: 8 }}>

        {/* Background links */}
        {/* TenantA → Leaf01 */}
        <line x1={nodes.taNode1.x + NR} y1={nodes.taNode1.y} x2={nodes.leaf01.x - NR} y2={nodes.leaf01.y} stroke="#1e3a5f" strokeWidth={1.5} />
        <line x1={nodes.taNode2.x + NR} y1={nodes.taNode2.y} x2={nodes.leaf01.x - NR} y2={nodes.leaf01.y} stroke="#1e3a5f" strokeWidth={1.5} />
        {/* TenantB → Leaf02 */}
        <line x1={nodes.tbNode1.x + NR} y1={nodes.tbNode1.y} x2={nodes.leaf02.x - NR} y2={nodes.leaf02.y} stroke="#3a1a0a55" strokeWidth={1.5} />
        <line x1={nodes.tbNode2.x + NR} y1={nodes.tbNode2.y} x2={nodes.leaf02.x - NR} y2={nodes.leaf02.y} stroke="#3a1a0a55" strokeWidth={1.5} />
        {/* Leaves → Spine */}
        <line x1={nodes.leaf01.x + NR} y1={nodes.leaf01.y} x2={nodes.spine.x - NR} y2={nodes.spine.y} stroke="#2a2d3e" strokeWidth={1.5} />
        <line x1={nodes.leaf02.x + NR} y1={nodes.leaf02.y} x2={nodes.spine.x - NR} y2={nodes.spine.y} stroke="#2a2d3e" strokeWidth={1.5} />
        {/* Spine → Storage */}
        <line x1={nodes.spine.x + NR} y1={nodes.spine.y} x2={nodes.storage.x - NR} y2={nodes.storage.y} stroke="#1e3a2a" strokeWidth={1.5} />

        {/* Active tenant path highlight */}
        {activeTenant === 'A' && (
          <>
            <line x1={nodes.taNode1.x + NR} y1={nodes.taNode1.y} x2={nodes.leaf01.x - NR} y2={nodes.leaf01.y} stroke={TA} strokeWidth={2.5} opacity={0.7} />
            <line x1={nodes.leaf01.x + NR} y1={nodes.leaf01.y} x2={nodes.spine.x - NR} y2={nodes.spine.y} stroke={TA} strokeWidth={2.5} opacity={0.7} />
            <line x1={nodes.spine.x + NR} y1={nodes.spine.y} x2={nodes.storage.x - NR} y2={nodes.storage.y} stroke={TA} strokeWidth={2.5} opacity={0.7} />
          </>
        )}

        {/* Cross-tenant attack path (TenantB → Storage via Leaf02 → Spine → Storage) */}
        {attackResult === 'success' && (
          <>
            <line x1={nodes.tbNode1.x + NR} y1={nodes.tbNode1.y} x2={nodes.leaf02.x - NR} y2={nodes.leaf02.y} stroke="#f87171" strokeWidth={3} />
            <line x1={nodes.leaf02.x + NR} y1={nodes.leaf02.y} x2={nodes.spine.x - NR} y2={nodes.spine.y} stroke="#f87171" strokeWidth={3} />
            <line x1={nodes.spine.x + NR} y1={nodes.spine.y} x2={nodes.storage.x - NR} y2={nodes.storage.y} stroke="#f87171" strokeWidth={3} />
          </>
        )}
        {attackResult === 'blocked' && (
          <line x1={nodes.tbNode1.x + NR} y1={nodes.tbNode1.y} x2={nodes.leaf01.x - 10} y2={nodes.leaf01.y}
            stroke="#f87171" strokeWidth={3} strokeDasharray="6 3" opacity={0.6} />
        )}

        {/* Nodes */}
        {Object.entries(nodes).map(([id, n]) => {
          const isSpine = id === 'spine'
          const isLeaf = id.startsWith('leaf')
          const isStorage = id === 'storage'
          const isTenantA = id.startsWith('ta')
          const isTenantB = id.startsWith('tb')
          const nodeColor = isTenantA ? TA : isTenantB ? TB : isStorage ? ST : '#60a5fa'
          const isActive = (isTenantA && activeTenant === 'A') || (isTenantB && activeTenant === 'B')
          const lines = n.label.split('\n')
          return (
            <g key={id}>
              <rect x={n.x - NR} y={n.y - NH} width={NR * 2} height={NH * 2} rx={5}
                fill={isActive ? nodeColor + '22' : '#161928'}
                stroke={isActive ? nodeColor : '#2a2d3e'}
                strokeWidth={isActive ? 2 : 1} />
              {lines.map((line, li) => (
                <text key={li} x={n.x} y={n.y + (li - (lines.length - 1) / 2) * 13}
                  fontSize={8.5} fill={isActive ? nodeColor : '#7c8db5'} textAnchor="middle"
                  fontWeight={isActive ? 700 : 400}>
                  {line}
                </text>
              ))}
              {/* GBP badge on leaf01 */}
              {id === 'leaf01' && gbpEnabled && (
                <g>
                  <rect x={n.x - NR - 2} y={n.y - NH - 14} width={62} height={12} rx={3} fill="#064e3b" />
                  <text x={n.x - NR + 29} y={n.y - NH - 5} fontSize={7.5} fill="#76e5b5" textAnchor="middle" fontWeight={700}>GBP ACTIVE</text>
                </g>
              )}
              {/* BLOCKED marker */}
              {id === 'leaf01' && attackResult === 'blocked' && (
                <g>
                  <circle cx={n.x} cy={n.y + NH + 10} r={8} fill="#f87171" />
                  <text x={n.x} y={n.y + NH + 14} fontSize={9} fill="#fff" textAnchor="middle" fontWeight={700}>✕</text>
                </g>
              )}
            </g>
          )
        })}

        {/* VRF labels */}
        <text x={158} y={80} fontSize={8} fill={TA} opacity={0.6}>VRF_A</text>
        <text x={158} y={262} fontSize={8} fill={TB} opacity={0.6}>VRF_B</text>
      </svg>

      {/* NVUE config panel */}
      {showConfig && (
        <pre style={{
          background: '#0d0f18', border: '1px solid #2a2d3e', borderRadius: 8,
          padding: '12px 14px', fontSize: 10, color: '#94a3b8',
          overflowX: 'auto', margin: '0 0 8px 0', lineHeight: 1.6, whiteSpace: 'pre-wrap',
        }}>
          {gbpEnabled ? NVUE_WITH_GBP : NVUE_NO_GBP}
        </pre>
      )}

      <div style={{ fontSize: 10, color: '#7c8db5' }}>
        <span style={{ color: TA }}>■</span> Tenant A (VRF_A) ·{' '}
        <span style={{ color: TB }}>■</span> Tenant B (VRF_B) ·{' '}
        <span style={{ color: ST }}>■</span> Storage ·{' '}
        {gbpEnabled
          ? <span style={{ color: '#76e5b5' }}>GBP policy active — cross-tenant access blocked at TCAM</span>
          : <span style={{ color: '#fbbf24' }}>No GBP — VRF routing only; within-VRF access uncontrolled</span>}
      </div>
    </div>
  )
}

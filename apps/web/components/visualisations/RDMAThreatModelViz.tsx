'use client'
import { useState } from 'react'

/**
 * RDMAThreatModelViz
 * Annotated layered stack diagram showing where RDMA security enforcement
 * exists or is absent. Five layers, click any to see detail panel.
 * Toggle: Attack path vs Protection path.
 */

interface Layer {
  id: string
  label: string
  sublabel: string
  enforcement: 'protected' | 'bypassed' | 'partial'
  chapter?: string
  mechanisms: string[]
  threats: string[]
  attackNote: string
  protectNote: string
}

const LAYERS: Layer[] = [
  {
    id: 'app',
    label: 'Application / GPU Process',
    sublabel: 'ibv_reg_mr · NCCL · PyTorch',
    enforcement: 'partial',
    chapter: 'Ch23 Act 2',
    mechanisms: ['MR access flags (IBV_ACCESS_REMOTE_*)', 'RKEY token (32-bit)', 'Protection Domain (pd) scope'],
    threats: ['Low-entropy RKEY guessable by attacker', 'RKEY shared over insecure channel'],
    attackNote: 'RKEY is a 32-bit token. If seed is low-entropy, attacker can scan the full range in <1ms at 400GbE speeds.',
    protectNote: 'Ensure kernel ASLR is enabled (randomize_va_space=2). Rotate RKEYs on MR re-registration.',
  },
  {
    id: 'kernel',
    label: 'Kernel Network Stack',
    sublabel: 'iptables · nftables · netfilter',
    enforcement: 'bypassed',
    chapter: 'Ch23 Act 1',
    mechanisms: [],
    threats: ['RDMA bypasses this layer entirely', 'iptables rules have zero effect on RDMA traffic', 'nftables chains never see RDMA packets'],
    attackNote: 'This layer is INVISIBLE to RDMA traffic. No iptables rule, no nftables chain, no socket filter ever sees an RDMA Write or Read. This is by design — it is why RDMA is fast.',
    protectNote: 'Cannot be remediated. Accept that the kernel network stack provides no RDMA protection. Use GID filtering and PKeys instead.',
  },
  {
    id: 'nic',
    label: 'ConnectX-7 NIC ASIC',
    sublabel: 'GID filtering · RKEY validation · QP state machine',
    enforcement: 'protected',
    chapter: 'Ch23 Act 2',
    mechanisms: ['GID filtering: ROCE_ADDR_FILTER_ENABLE', 'RKEY validation in hardware at wire speed', 'QP state machine enforcement (RESET→INIT→RTR→RTS)'],
    threats: ['Default: GID filter DISABLED — any remote GID can connect', 'Once QP is up and RKEY is known, no further NIC-level check'],
    attackNote: 'By default, ROCE_ADDR_FILTER_ENABLE=0. Any remote node can establish a QP. If your cluster shipped from the factory, this is likely not set.',
    protectNote: 'mlxconfig -d /dev/mst/mt4129_pciconf0 s ROCE_ADDR_FILTER_ENABLE=1. This is the single highest-impact hardening action for RoCEv2 multi-tenant clusters.',
  },
  {
    id: 'switch',
    label: 'Spectrum-4 Switch ASIC',
    sublabel: 'GBP TCAM · ECN · PFC · VRF routing',
    enforcement: 'protected',
    chapter: 'Ch23 Act 3',
    mechanisms: ['VRF-per-tenant routing isolation', 'GBP TCAM microsegmentation', 'ECN/PFC rate limiting against incast floods'],
    threats: ['Route leak from misconfigured EVPN RT', 'PFC pause storm from cross-tenant incast'],
    attackNote: 'A misconfigured EVPN route-target can leak Tenant A routes into Tenant B VRF. A tenant-generated incast can flood the switch buffer and trigger PFC pauses into another tenant\'s lossless queue.',
    protectNote: 'Deploy VRF-per-tenant + EVPN RT isolation + GBP policy. Monitor for route leaks with nv show vrf. Check WJH for cross-tenant flood patterns.',
  },
  {
    id: 'physical',
    label: 'Physical Network',
    sublabel: 'fibre · QSFP · patch panels',
    enforcement: 'partial',
    chapter: 'Ch9',
    mechanisms: ['Physical access control to patch panels', 'Cable labelling and documentation'],
    threats: ['Unauthorised patch cable insertion', 'Optical tap on unprotected fibre runs'],
    attackNote: 'Physical access to an unlocked patch panel allows anyone to insert a cable into any port. No amount of software isolation stops a physical tap.',
    protectNote: 'Lock your cages. Label cables. Audit patch panel state periodically. Physical security is out of scope for this chapter — covered in physical security runbooks.',
  },
]

const ENFORCEMENT_COLOR: Record<Layer['enforcement'], string> = {
  protected: '#76e5b5',
  bypassed: '#f87171',
  partial: '#fbbf24',
}

const ENFORCEMENT_LABEL: Record<Layer['enforcement'], string> = {
  protected: 'ENFORCED',
  bypassed: 'BYPASSED',
  partial: 'PARTIAL',
}

export default function RDMAThreatModelViz() {
  const [selected, setSelected] = useState<string>('kernel')
  const [mode, setMode] = useState<'attack' | 'protect'>('attack')

  const selectedLayer = LAYERS.find(l => l.id === selected) ?? LAYERS[1]

  return (
    <div style={{
      background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 12,
      padding: '20px 24px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: '#e2e8f0', maxWidth: 680, margin: '24px auto',
    }}>
      <div style={{ fontSize: 13, color: '#7c8db5', marginBottom: 4, letterSpacing: '0.08em' }}>INTERACTIVE</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#f87171', marginBottom: 4 }}>
        RDMA Threat Model: Where Security Works (and Doesn't)
      </div>
      <div style={{ fontSize: 11, color: '#7c8db5', marginBottom: 14 }}>
        Click any layer to see enforcement detail. Toggle Attack / Protection path.
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {(['attack', 'protect'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            style={{
              background: mode === m ? (m === 'attack' ? '#7f1d1d' : '#064e3b') : '#161928',
              border: `1px solid ${mode === m ? (m === 'attack' ? '#f87171' : '#76e5b5') : '#2a2d3e'}`,
              borderRadius: 6, color: mode === m ? (m === 'attack' ? '#f87171' : '#76e5b5') : '#7c8db5',
              padding: '6px 18px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
              fontWeight: mode === m ? 700 : 400,
            }}>
            {m === 'attack' ? '⚠ Attack Path' : '🛡 Protection Path'}
          </button>
        ))}
      </div>

      {/* Stack diagram */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        {/* Layer stack */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* RDMA path arrow */}
          <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Stack (top = application, bottom = physical)</span>
          </div>
          {LAYERS.map((layer, i) => {
            const color = ENFORCEMENT_COLOR[layer.enforcement]
            const isSelected = selected === layer.id
            const isBypassed = layer.enforcement === 'bypassed'
            return (
              <div key={layer.id} style={{ position: 'relative' }}>
                {/* RDMA bypass indicator */}
                {isBypassed && (
                  <div style={{
                    position: 'absolute', right: -28, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 10, color: '#f87171', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 2,
                  }}>
                    ↷ skip
                  </div>
                )}
                <div
                  onClick={() => setSelected(layer.id)}
                  style={{
                    background: isSelected ? color + '18' : '#161928',
                    border: `${isSelected ? 2 : 1}px solid ${isSelected ? color : isBypassed ? '#f8717144' : '#2a2d3e'}`,
                    borderRadius: 6, padding: '8px 12px', cursor: 'pointer',
                    opacity: isBypassed ? (mode === 'attack' ? 1 : 0.6) : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? color : '#e2e8f0' }}>
                        {layer.label}
                      </span>
                      <span style={{ fontSize: 9, color: '#4a5568', marginLeft: 8 }}>{layer.sublabel}</span>
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: color,
                      background: color + '22', borderRadius: 3, padding: '2px 6px',
                    }}>
                      {ENFORCEMENT_LABEL[layer.enforcement]}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* RDMA path arrow on right */}
        <div style={{ width: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 8, color: '#f97316', marginBottom: 2, writingMode: 'vertical-rl', letterSpacing: 2 }}>RDMA PATH</div>
          <svg viewBox="0 0 24 220" style={{ width: 24, height: 220 }}>
            {/* Solid arrow from app to nic, skipping kernel */}
            <line x1={12} y1={0} x2={12} y2={72} stroke="#f97316" strokeWidth={2} />
            {/* Bypass arc around kernel */}
            <path d={`M 12 72 Q 22 110 12 148`} fill="none" stroke="#f87171" strokeWidth={2} strokeDasharray="4 2" />
            <text x={16} y={112} fontSize={7} fill="#f87171">skip</text>
            {/* Continue from nic down */}
            <line x1={12} y1={148} x2={12} y2={220} stroke="#f97316" strokeWidth={2} />
            <polygon points="6,218 18,218 12,226" fill="#f97316" />
          </svg>
        </div>
      </div>

      {/* Detail panel */}
      <div style={{
        background: '#161928',
        border: `1px solid ${ENFORCEMENT_COLOR[selectedLayer.enforcement]}44`,
        borderRadius: 10, padding: '14px 16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: ENFORCEMENT_COLOR[selectedLayer.enforcement] }}>
              {selectedLayer.label}
            </span>
            {selectedLayer.chapter && (
              <span style={{ fontSize: 10, color: '#4a5568', marginLeft: 8 }}>
                → {selectedLayer.chapter}
              </span>
            )}
          </div>
          <span style={{
            fontSize: 10, color: ENFORCEMENT_COLOR[selectedLayer.enforcement],
            background: ENFORCEMENT_COLOR[selectedLayer.enforcement] + '22',
            borderRadius: 4, padding: '2px 8px', fontWeight: 700,
          }}>
            {ENFORCEMENT_LABEL[selectedLayer.enforcement]}
          </span>
        </div>

        <div style={{ fontSize: 11, color: mode === 'attack' ? '#fca5a5' : '#86efac', lineHeight: 1.6, marginBottom: 10 }}>
          {mode === 'attack' ? selectedLayer.attackNote : selectedLayer.protectNote}
        </div>

        {mode === 'protect' && selectedLayer.mechanisms.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 4 }}>Enforcement mechanisms at this layer:</div>
            {selectedLayer.mechanisms.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 3 }}>
                <span style={{ color: '#76e5b5', fontSize: 10 }}>✓</span>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>{m}</span>
              </div>
            ))}
          </div>
        )}

        {mode === 'attack' && selectedLayer.threats.length > 0 && (
          <div>
            <div style={{ fontSize: 10, color: '#7c8db5', marginBottom: 4 }}>Threat vectors at this layer:</div>
            {selectedLayer.threats.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 3 }}>
                <span style={{ color: '#f87171', fontSize: 10 }}>✗</span>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>{t}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 10, color: '#7c8db5' }}>
        {Object.entries(ENFORCEMENT_COLOR).map(([k, c]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: c, display: 'inline-block' }} />
            {ENFORCEMENT_LABEL[k as Layer['enforcement']]}
          </span>
        ))}
      </div>
    </div>
  )
}

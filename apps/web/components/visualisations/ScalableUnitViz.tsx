'use client'
import { useState } from 'react'

// 8 DGX nodes, 2 leaf switches, 1 storage switch
// Rail wiring: NIC 0,1,4,5 → leaf-01; NIC 2,3,6,7 → leaf-02
// All DGX NICs 7 → storage-01

const LEAF1_COLOR = '#60a5fa'
const LEAF2_COLOR = '#76e5b5'
const STORAGE_COLOR = '#f97316'
const DGX_COLOR = '#a78bfa'
const FAILED_COLOR = '#f87171'

const NICS_TO_LEAF1 = [0, 1, 4, 5]
const NICS_TO_LEAF2 = [2, 3, 6, 7]
const NIC_TO_STORAGE = 7

export default function ScalableUnitViz() {
  const [failedSwitch, setFailedSwitch] = useState<'none' | 'leaf1' | 'leaf2' | 'storage'>('none')
  const [selectedDGX, setSelectedDGX] = useState<number | null>(null)
  const [view, setView] = useState<'topology' | 'basepad'>('topology')

  const DGX_X = 30
  const DGX_START_Y = 40
  const DGX_H = 36
  const DGX_W = 80
  const DGX_GAP = 10

  const LEAF1_X = 240
  const LEAF1_Y = 60
  const LEAF2_X = 240
  const LEAF2_Y = 220

  const STORAGE_X = 360
  const STORAGE_Y = 140

  const SPINE_X = 460
  const SPINE_Y = 140

  const getDGXY = (i: number) => DGX_START_Y + i * (DGX_H + DGX_GAP)

  const nicIsActive = (dgxIdx: number, nicIdx: number) => {
    if (nicIdx === NIC_TO_STORAGE && failedSwitch === 'storage') return false
    if (NICS_TO_LEAF1.includes(nicIdx) && failedSwitch === 'leaf1') return false
    if (NICS_TO_LEAF2.includes(nicIdx) && failedSwitch === 'leaf2') return false
    return true
  }

  const activeDGXNICs = (dgxIdx: number) => {
    const total = 8
    const active = Array.from({ length: total }, (_, i) => i).filter(i => nicIsActive(dgxIdx, i)).length
    return active
  }

  const trainingNICs = (dgxIdx: number) => {
    const active = [0, 1, 2, 3, 4, 5, 6, 7].filter(i => i !== NIC_TO_STORAGE && nicIsActive(dgxIdx, i)).length
    return active
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
        Spectrum-X Scalable Unit Topology
      </div>

      {/* Tab */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {(['topology', 'basepad'] as const).map(t => (
          <button key={t} onClick={() => setView(t)} style={{
            padding: '4px 14px', borderRadius: 6, border: '1px solid #2a2d3e',
            background: view === t ? '#60a5fa' : '#161928',
            color: view === t ? '#0f1117' : '#7c8db5',
            fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: view === t ? 700 : 400,
          }}>
            {t === 'topology' ? 'SCALABLE UNIT' : 'BASEPOD (4×SU)'}
          </button>
        ))}
      </div>

      {view === 'topology' && (
        <>
          {/* Failure simulation buttons */}
          <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#7c8db5' }}>Fail switch:</span>
            {(['none', 'leaf1', 'leaf2', 'storage'] as const).map(sw => (
              <button key={sw} onClick={() => setFailedSwitch(sw)} style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11,
                border: `1px solid ${failedSwitch === sw ? '#f87171' : '#2a2d3e'}`,
                background: failedSwitch === sw ? '#f8717130' : '#161928',
                color: failedSwitch === sw ? '#f87171' : '#7c8db5',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {sw === 'none' ? 'No failure' : sw === 'leaf1' ? 'leaf-01' : sw === 'leaf2' ? 'leaf-02' : 'storage-01'}
              </button>
            ))}
          </div>

          <svg viewBox="0 0 560 340" style={{ width: '100%', maxWidth: 560, display: 'block' }}>
            {/* Draw wires from DGX to leaf1 */}
            {Array.from({ length: 8 }, (_, i) => {
              const dgxY = getDGXY(i) + DGX_H / 2
              const active = failedSwitch !== 'leaf1'
              return NICS_TO_LEAF1.map((nic, ni) => (
                <line key={`l1-${i}-${nic}`}
                  x1={DGX_X + DGX_W} y1={dgxY}
                  x2={LEAF1_X} y2={LEAF1_Y + 30}
                  stroke={active ? `${LEAF1_COLOR}50` : `${FAILED_COLOR}30`}
                  strokeWidth={0.7} strokeDasharray={active ? '' : '3,3'} />
              ))
            })}

            {/* Draw wires from DGX to leaf2 */}
            {Array.from({ length: 8 }, (_, i) => {
              const dgxY = getDGXY(i) + DGX_H / 2
              const active = failedSwitch !== 'leaf2'
              return NICS_TO_LEAF2.map((nic, ni) => (
                <line key={`l2-${i}-${nic}`}
                  x1={DGX_X + DGX_W} y1={dgxY}
                  x2={LEAF2_X} y2={LEAF2_Y + 30}
                  stroke={active ? `${LEAF2_COLOR}50` : `${FAILED_COLOR}30`}
                  strokeWidth={0.7} strokeDasharray={active ? '' : '3,3'} />
              ))
            })}

            {/* Storage wires */}
            {Array.from({ length: 8 }, (_, i) => {
              const dgxY = getDGXY(i) + DGX_H / 2
              const active = failedSwitch !== 'storage'
              return (
                <line key={`s-${i}`}
                  x1={DGX_X + DGX_W} y1={dgxY}
                  x2={STORAGE_X} y2={STORAGE_Y + 20}
                  stroke={active ? `${STORAGE_COLOR}40` : `${FAILED_COLOR}25`}
                  strokeWidth={0.5} strokeDasharray={active ? '2,4' : '3,6'} />
              )
            })}

            {/* Leaf to spine uplinks */}
            <line x1={LEAF1_X + 80} y1={LEAF1_Y + 30} x2={SPINE_X} y2={SPINE_Y}
              stroke="#60a5fa60" strokeWidth={2} />
            <line x1={LEAF2_X + 80} y1={LEAF2_Y + 30} x2={SPINE_X} y2={SPINE_Y}
              stroke="#76e5b560" strokeWidth={2} />

            {/* DGX nodes */}
            {Array.from({ length: 8 }, (_, i) => {
              const y = getDGXY(i)
              const isSelected = selectedDGX === i
              const activeNICs = trainingNICs(i)
              const totalNICs = 7
              const degraded = activeNICs < totalNICs

              return (
                <g key={i} onClick={() => setSelectedDGX(isSelected ? null : i)} style={{ cursor: 'pointer' }}>
                  <rect x={DGX_X} y={y} width={DGX_W} height={DGX_H} rx={6}
                    fill={isSelected ? '#a78bfa28' : '#161928'}
                    stroke={degraded ? '#fbbf24' : (isSelected ? DGX_COLOR : '#2a2d3e')}
                    strokeWidth={isSelected ? 2 : 1} />
                  <text x={DGX_X + 8} y={y + 14} fill={DGX_COLOR} fontSize={9}
                    fontFamily="'JetBrains Mono',monospace" fontWeight={700}>
                    DGX-{String(i + 1).padStart(2, '0')}
                  </text>
                  <text x={DGX_X + 8} y={y + 26} fill={degraded ? '#fbbf24' : '#7c8db5'} fontSize={8}
                    fontFamily="'JetBrains Mono',monospace">
                    {activeNICs}/{totalNICs} NICs active
                  </text>
                </g>
              )
            })}

            {/* Leaf-01 */}
            <rect x={LEAF1_X} y={LEAF1_Y} width={80} height={60} rx={8}
              fill={failedSwitch === 'leaf1' ? '#f8717120' : '#60a5fa18'}
              stroke={failedSwitch === 'leaf1' ? FAILED_COLOR : LEAF1_COLOR}
              strokeWidth={failedSwitch === 'leaf1' ? 2 : 1} strokeDasharray={failedSwitch === 'leaf1' ? '4,2' : ''} />
            <text x={LEAF1_X + 40} y={LEAF1_Y + 22} fill={failedSwitch === 'leaf1' ? FAILED_COLOR : LEAF1_COLOR}
              fontSize={10} fontFamily="'JetBrains Mono',monospace" textAnchor="middle" fontWeight={700}>
              {failedSwitch === 'leaf1' ? '✕' : ''}leaf-01
            </text>
            <text x={LEAF1_X + 40} y={LEAF1_Y + 37} fill="#7c8db5"
              fontSize={8} fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
              SN5600
            </text>
            <text x={LEAF1_X + 40} y={LEAF1_Y + 50} fill="#4a5568"
              fontSize={8} fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
              NICs 0,1,4,5
            </text>

            {/* Leaf-02 */}
            <rect x={LEAF2_X} y={LEAF2_Y} width={80} height={60} rx={8}
              fill={failedSwitch === 'leaf2' ? '#f8717120' : '#76e5b518'}
              stroke={failedSwitch === 'leaf2' ? FAILED_COLOR : LEAF2_COLOR}
              strokeWidth={failedSwitch === 'leaf2' ? 2 : 1} strokeDasharray={failedSwitch === 'leaf2' ? '4,2' : ''} />
            <text x={LEAF2_X + 40} y={LEAF2_Y + 22} fill={failedSwitch === 'leaf2' ? FAILED_COLOR : LEAF2_COLOR}
              fontSize={10} fontFamily="'JetBrains Mono',monospace" textAnchor="middle" fontWeight={700}>
              {failedSwitch === 'leaf2' ? '✕' : ''}leaf-02
            </text>
            <text x={LEAF2_X + 40} y={LEAF2_Y + 37} fill="#7c8db5"
              fontSize={8} fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
              SN5600
            </text>
            <text x={LEAF2_X + 40} y={LEAF2_Y + 50} fill="#4a5568"
              fontSize={8} fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
              NICs 2,3,6,7
            </text>

            {/* Storage-01 */}
            <rect x={STORAGE_X} y={STORAGE_Y} width={80} height={42} rx={8}
              fill={failedSwitch === 'storage' ? '#f8717120' : '#f9731618'}
              stroke={failedSwitch === 'storage' ? FAILED_COLOR : STORAGE_COLOR}
              strokeWidth={failedSwitch === 'storage' ? 2 : 1} strokeDasharray={failedSwitch === 'storage' ? '4,2' : ''} />
            <text x={STORAGE_X + 40} y={STORAGE_Y + 16} fill={failedSwitch === 'storage' ? FAILED_COLOR : STORAGE_COLOR}
              fontSize={10} fontFamily="'JetBrains Mono',monospace" textAnchor="middle" fontWeight={700}>
              storage-01
            </text>
            <text x={STORAGE_X + 40} y={STORAGE_Y + 30} fill="#7c8db5"
              fontSize={8} fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
              SN4600C
            </text>

            {/* Spine */}
            <rect x={SPINE_X} y={SPINE_Y - 20} width={80} height={40} rx={8}
              fill="#16192840" stroke="#2a2d3e" strokeWidth={1} />
            <text x={SPINE_X + 40} y={SPINE_Y - 4} fill="#4a5568"
              fontSize={9} fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
              SPINE ↑
            </text>
            <text x={SPINE_X + 40} y={SPINE_Y + 10} fill="#4a5568"
              fontSize={8} fontFamily="'JetBrains Mono',monospace" textAnchor="middle">
              BasePOD
            </text>
          </svg>

          {/* Failure impact summary */}
          {failedSwitch !== 'none' && (
            <div style={{
              marginTop: 10, background: '#161928', border: '1px solid #f8717140',
              borderRadius: 8, padding: '10px 14px', fontSize: 12,
            }}>
              <span style={{ color: '#f87171', fontWeight: 700 }}>Failure impact ({failedSwitch}): </span>
              <span style={{ color: '#e2e8f0' }}>
                {failedSwitch === 'leaf1' && 'NICs 0,1,4,5 offline on all 8 DGX nodes (4/8 NICs each). Training continues at ~50% bandwidth. No node fully isolated.'}
                {failedSwitch === 'leaf2' && 'NICs 2,3,6,7 offline on all 8 DGX nodes (4/8 NICs each). Training continues at ~50% bandwidth. No node fully isolated.'}
                {failedSwitch === 'storage' && 'NIC 7 (storage) offline on all 8 DGX nodes. Training traffic unaffected. Checkpoint writes and dataset reads fail until storage switch recovers.'}
              </span>
            </div>
          )}

          {/* Selected DGX rail detail */}
          {selectedDGX !== null && (
            <div style={{
              marginTop: 10, background: '#161928', border: '1px solid #a78bfa40',
              borderRadius: 8, padding: '10px 14px', fontSize: 12,
            }}>
              <div style={{ color: '#a78bfa', fontWeight: 700, marginBottom: 6 }}>
                DGX-{String(selectedDGX + 1).padStart(2, '0')} rail wiring
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[0, 1, 2, 3, 4, 5, 6, 7].map(nic => {
                  const dest = nic === 7 ? 'storage-01' : NICS_TO_LEAF1.includes(nic) ? 'leaf-01' : 'leaf-02'
                  const color = nic === 7 ? STORAGE_COLOR : NICS_TO_LEAF1.includes(nic) ? LEAF1_COLOR : LEAF2_COLOR
                  const active = nicIsActive(selectedDGX, nic)
                  return (
                    <div key={nic} style={{
                      padding: '4px 8px', borderRadius: 4,
                      border: `1px solid ${active ? color : '#f87171'}`,
                      background: active ? `${color}15` : '#f8717115',
                      fontSize: 10, color: active ? color : '#f87171',
                    }}>
                      NIC{nic}→{dest} {!active && '✕'}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {view === 'basepad' && (
        <div>
          <svg viewBox="0 0 600 200" style={{ width: '100%', maxWidth: 600, display: 'block' }}>
            {/* 4 SUs arranged in a row */}
            {[0, 1, 2, 3].map(su => {
              const sx = 20 + su * 140
              return (
                <g key={su}>
                  <rect x={sx} y={20} width={120} height={120} rx={8}
                    fill="#161928" stroke="#2a2d3e" strokeWidth={1} />
                  <text x={sx + 60} y={40} fill="#a78bfa" fontSize={10}
                    fontFamily="'JetBrains Mono',monospace" textAnchor="middle" fontWeight={700}>
                    SU-{su + 1}
                  </text>
                  {/* Mini DGX nodes */}
                  {[0, 1, 2, 3, 4, 5, 6, 7].map(d => (
                    <rect key={d} x={sx + 8 + (d % 4) * 26} y={50 + Math.floor(d / 4) * 22}
                      width={22} height={16} rx={3} fill="#a78bfa20" stroke="#a78bfa" strokeWidth={0.5} />
                  ))}
                  {/* Leaf switches */}
                  <rect x={sx + 10} y={102} width={44} height={22} rx={4}
                    fill="#60a5fa20" stroke="#60a5fa" strokeWidth={1} />
                  <rect x={sx + 66} y={102} width={44} height={22} rx={4}
                    fill="#76e5b520" stroke="#76e5b5" strokeWidth={1} />
                  <text x={sx + 32} y={116} fill="#60a5fa" fontSize={8}
                    fontFamily="'JetBrains Mono',monospace" textAnchor="middle">L01</text>
                  <text x={sx + 88} y={116} fill="#76e5b5" fontSize={8}
                    fontFamily="'JetBrains Mono',monospace" textAnchor="middle">L02</text>
                  {/* Spine uplinks */}
                  <line x1={sx + 32} y1={124} x2={sx + 60} y2={160} stroke="#60a5fa40" strokeWidth={1} />
                  <line x1={sx + 88} y1={124} x2={sx + 60} y2={160} stroke="#76e5b540" strokeWidth={1} />
                </g>
              )
            })}
            {/* Spine switches */}
            {[0, 1, 2, 3].map(sp => (
              <g key={sp}>
                <rect x={80 + sp * 120} y={155} width={80} height={30} rx={6}
                  fill="#f9731618" stroke="#f97316" strokeWidth={1} />
                <text x={80 + sp * 120 + 40} y={174} fill="#f97316" fontSize={9}
                  fontFamily="'JetBrains Mono',monospace" textAnchor="middle" fontWeight={700}>
                  SPINE-{sp + 1}
                </text>
              </g>
            ))}
          </svg>
          <div style={{ marginTop: 10, fontSize: 11, color: '#7c8db5', lineHeight: 1.7 }}>
            <strong style={{ color: '#e2e8f0' }}>BasePOD = 4 × Scalable Units</strong><br />
            32 DGX nodes · 8 SN5600 leaf switches · 4 SN4600C storage switches · 4 SN5600 spine switches<br />
            Each SU leaf has 4 uplinks to each spine = 16 total uplinks per leaf (non-blocking with 2:1 oversubscription)
          </div>
        </div>
      )}
    </div>
  )
}

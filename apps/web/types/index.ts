export interface RailState {
  id: number
  nicName: string
  nicState: 'up' | 'down'
  switchPort: 'up' | 'down' | 'error-disabled' | 'admin-down'
  guid: string
}

export interface TopologyState {
  nic: {
    name: string
    speed: number
    state: 'up' | 'down'
  }
  pfcEnabled: boolean
  ecnEnabled: boolean
  congestionDetected: boolean
  silentCongestion: boolean
  pauseStorm?: boolean
  pfcPriority?: number
  opticReplaced?: boolean
  unevenSpine?: boolean
  lbMode?: 'hash' | 'adaptive' | 'per-packet'
  bufferUtilPct: number
  rails?: RailState[]
  ncclTransport?: 'socket' | 'net'
  ncclIbHca?: string
  ncclSocketIfname?: string
  ncclTestsBusbw?: number
  ncclTestsFixed?: boolean
  proposalAInspected?: boolean
  proposalBInspected?: boolean
  proposalACalculated?: boolean
  proposalBCalculated?: boolean
  recommendationMade?: boolean
  srtePolicyActive?: boolean
  segmentListConfigured?: boolean
  routeMapApplied?: boolean
  isisAdjVerified?: boolean
  gidFilterEnabled?: boolean
  rkeyRotated?: boolean
  clVersionVerified?: boolean
  portsAudited?: boolean
  asicHealthChecked?: boolean
  mtuVerified?: boolean
  bgpClean?: boolean
  auditReportComplete?: boolean
  leaf01PortsChecked?: boolean
  leaf02PortsChecked?: boolean
  storagePortsChecked?: boolean
  leaf01EepromChecked?: boolean
  storageEepromChecked?: boolean
  netstatChecked?: boolean
  leaf01ProductName?: string
  leaf02ProductName?: string
  storage01ProductName?: string
  leaf01PortsUp?: number
  leaf02PortsUp?: number
  storage01PortsUp?: number
  leaf01MtuCurrent?: number
  bgpPeersConfigured?: number
  leaf01PortsExpected?: number
  leaf02PortsExpected?: number
  storagePortsExpected?: number
  leaf02MtuCurrent?: number
  storage01MtuCurrent?: number
  roceShorthandApplied?: boolean
  dscpTrustVerified?: boolean
  ecnThresholdsVerified?: boolean
  pfcConfigVerified?: boolean
  bwVerified?: boolean
  latencyVerified?: boolean
  configApplied?: boolean
  mtu?: number
  ecnMinThreshold?: number
  ecnMaxThreshold?: number
  ibWriteBwResult?: number | null
  ibWriteLatP99?: number | null
  ecnMarkingActive?: boolean
  thresholdInspected?: boolean
  problemIdentified?: boolean
  thresholdFixed?: boolean
  ecnMarkingVerified?: boolean
  losslessBufferBytes?: number
}

export interface LabState {
  labId: string | null
  conditions: Record<string, boolean>
  verifiedConditions: Set<string>
  mistakeCount: number
  nearMissCount: number
  hintsUsed: number
  shownHintLevels: Set<number>
  startTime: number | null
  isComplete: boolean
  score: number | null
}

export interface KnowledgeConcept {
  id: string
  title: string
  summary: string
  content: string
  relatedCommands: string[]
  relatedConcepts: string[]
}

export interface CommandResult {
  output: string
  conceptId?: string
  type: 'success' | 'error' | 'info'
}

export interface LabHint {
  level: 1 | 2 | 3
  triggerAfterMistakes: number
  triggerAfterSeconds: number
  text: string
}

export interface LabConfig {
  id: string
  title: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  scenario: string
  expectedMinutes: number
  initialTopology: Partial<TopologyState>
  requiredConditions: string[]
  hints: LabHint[]
}

export interface ClassifiedCommand {
  type: 'exact' | 'near-miss' | 'exploratory' | 'gibberish'
  handler?: string
  suggestion?: string
  penalty: 'none' | 'light' | 'full'
}

export type DeviceType = 'dgx' | 'leaf-switch' | 'spine-switch' | 'ufm-server'

export interface LabDevice {
  id: string
  type: DeviceType
  label: string
  sublabel?: string
  prompt: string
  osLabel: string
  allowedCommands: string[]
  position: { x: number; y: number }
  status: 'up' | 'down' | 'error-disabled' | 'degraded'
  railId?: number
}

export interface DeviceSession {
  deviceId: string
  history: Array<{
    type: 'input' | 'output' | 'error' | 'info'
    text: string
    timestamp: number
  }>
  isActive: boolean
}

export interface MultiDeviceLabConfig {
  devices: LabDevice[]
  initialActiveDeviceId: string
}

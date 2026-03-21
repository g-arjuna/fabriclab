export interface TopologyState {
  nic: {
    name: string
    speed: number
    state: 'up' | 'down'
  }
  pfcEnabled: boolean
  ecnEnabled: boolean
  congestionDetected: boolean
  bufferUtilPct: number
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

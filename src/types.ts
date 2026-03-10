export interface ActionLogEntry {
  playerId: number
  player: string
  action: 'pass' | 'take'
  card?: number
  chipsCollected?: number
  newCard?: number
  chipsOnCardAfter?: number
  opponentCardsAfter?: number[]
}

export interface OpponentView {
  id: number
  name: string
  cards: number[]
  chipCount: string
}

export interface FinalScore {
  id: number
  name: string
  score: number
  rank: number
}

export interface ClientView {
  you: { chips: number; cards: number[]; score: number }
  opponents: OpponentView[]
  currentCard: number | null
  chipsOnCard: number
  phase: 'playing' | 'finished'
  isYourTurn: boolean
  validActions: string[]
  actionLog: ActionLogEntry[]
  finalScores?: FinalScore[]
}

/** A flying element currently being animated across the board */
export interface FlyingElement {
  id: number
  type: 'chip' | 'card'
  cardValue?: number
  startX: number
  startY: number
  endX: number
  endY: number
  phase: 'placed' | 'flying'
}

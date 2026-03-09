import { OpponentView } from '../types'
import Card from './Card'
import ChipPile from './ChipPile'

interface OpponentZoneProps {
  opponent: OpponentView
  chipRef: React.Ref<HTMLDivElement>
  cardsRef: React.Ref<HTMLDivElement>
}

function groupIntoRuns(cards: number[]): number[][] {
  if (cards.length === 0) return []
  const sorted = [...cards].sort((a, b) => a - b)
  const runs: number[][] = [[sorted[0]]]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      runs[runs.length - 1].push(sorted[i])
    } else {
      runs.push([sorted[i]])
    }
  }
  return runs
}

export default function OpponentZone({ opponent, chipRef, cardsRef }: OpponentZoneProps) {
  const runs = groupIntoRuns(opponent.cards)

  return (
    <div className="opponent-zone">
      <div className="opponent-header">
        <span className="opponent-name">{opponent.name}</span>
        <div ref={chipRef}>
          <ChipPile count={0} hidden />
        </div>
      </div>
      <div className="opponent-cards" ref={cardsRef}>
        {runs.length === 0 && <span className="no-cards">No cards</span>}
        {runs.map((run, ri) => (
          <div key={ri} className={`run ${run.length > 1 ? 'run-grouped' : ''}`}>
            {run.map((card) => (
              <Card key={card} value={card} size="small" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

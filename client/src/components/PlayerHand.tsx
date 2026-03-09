import Card from './Card'
import ChipPile from './ChipPile'

interface PlayerHandProps {
  cards: number[]
  chips: number
  score: number
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

export default function PlayerHand({ cards, chips, score, chipRef, cardsRef }: PlayerHandProps) {
  const runs = groupIntoRuns(cards)

  return (
    <div className="player-hand">
      <div className="hand-info">
        <div ref={chipRef}>
          <ChipPile count={chips} />
        </div>
        <span className="score">Score: {score}</span>
      </div>
      <div className="hand-cards" ref={cardsRef}>
        {runs.length === 0 && (
          <span className="no-cards">No cards yet</span>
        )}
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

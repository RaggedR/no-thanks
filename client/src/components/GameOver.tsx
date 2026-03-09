import { FinalScore } from '../types'

interface GameOverProps {
  scores: FinalScore[]
  onPlayAgain: () => void
}

export default function GameOver({ scores, onPlayAgain }: GameOverProps) {
  const winner = scores[0]
  const isHumanWinner = winner.id === 0

  return (
    <div className="game-over">
      <h1>Game Over!</h1>
      <div className={`winner-banner ${isHumanWinner ? 'you-won' : 'you-lost'}`}>
        {isHumanWinner ? 'You Won!' : `${winner.name} Wins!`}
      </div>
      <div className="final-scores">
        {scores.map((s) => (
          <div
            key={s.id}
            className={`score-row ${s.id === 0 ? 'score-you' : ''}`}
          >
            <span className="rank">#{s.rank}</span>
            <span className="name">{s.name}</span>
            <span className="score">{s.score} pts</span>
          </div>
        ))}
      </div>
      <button className="btn btn-primary btn-large" onClick={onPlayAgain}>
        Play Again
      </button>
    </div>
  )
}

import { useState, useCallback, useRef } from 'react'
import { ClientView, ActionLogEntry, FlyingElement } from './types'
import GameBoard, { GameBoardHandle } from './components/GameBoard'
import GameOver from './components/GameOver'

type GamePhase = 'menu' | 'playing' | 'finished'

let flyId = 0

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('menu')
  const [gameState, setGameState] = useState<ClientView | null>(null)
  const [message, setMessage] = useState<string>('')
  const [animating, setAnimating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flyingElements, setFlyingElements] = useState<FlyingElement[]>([])
  const animationRef = useRef(false)
  const boardRef = useRef<GameBoardHandle>(null)

  type Zone = 'center' | 'player-chips' | 'player-cards' | 'opp1-chips' | 'opp1-cards' | 'opp2-chips' | 'opp2-cards'

  // Helper: get center point of a zone
  const getCenter = useCallback((zone: Zone) => {
    const rect = boardRef.current?.getRect(zone)
    if (!rect) return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }, [])

  // Helper: map playerId to zone prefix
  const playerZone = useCallback((playerId: number): 'player' | 'opp1' | 'opp2' => {
    if (playerId === 0) return 'player'
    if (playerId === 1) return 'opp1'
    return 'opp2'
  }, [])

  // Animate a chip flying from source to target
  const animateChip = useCallback(async (fromZone: Zone, toZone: Zone) => {
    const from = getCenter(fromZone)
    const to = getCenter(toZone)
    const id = ++flyId

    // Place at start
    const el: FlyingElement = {
      id, type: 'chip',
      startX: from.x - 12, startY: from.y - 12,
      endX: to.x - 12, endY: to.y - 12,
      phase: 'placed',
    }
    setFlyingElements(prev => [...prev, el])

    // Next frame: start flying
    await frame()
    setFlyingElements(prev =>
      prev.map(e => e.id === id ? { ...e, phase: 'flying' as const } : e)
    )

    // Wait for transition
    await delay(420)

    // Remove
    setFlyingElements(prev => prev.filter(e => e.id !== id))
  }, [getCenter])

  // Animate a card flying from center to a player zone
  const animateCard = useCallback(async (cardValue: number, toZone: Zone) => {
    const from = getCenter('center')
    const to = getCenter(toZone)
    const id = ++flyId

    const el: FlyingElement = {
      id, type: 'card', cardValue,
      startX: from.x - 18, startY: from.y - 24,
      endX: to.x - 18, endY: to.y - 24,
      phase: 'placed',
    }
    setFlyingElements(prev => [...prev, el])

    await frame()
    setFlyingElements(prev =>
      prev.map(e => e.id === id ? { ...e, phase: 'flying' as const } : e)
    )

    await delay(450)
    setFlyingElements(prev => prev.filter(e => e.id !== id))
  }, [getCenter])

  // Animate multiple chips flying from center to a player (for take)
  const animateChipsToPlayer = useCallback(async (count: number, toZone: Zone) => {
    if (count <= 0) return
    const visible = Math.min(count, 5) // cap visual chips
    const promises: Promise<void>[] = []
    for (let i = 0; i < visible; i++) {
      promises.push(
        delay(i * 60).then(() => animateChip('center', toZone))
      )
    }
    await Promise.all(promises)
  }, [animateChip])

  const startNewGame = useCallback(async () => {
    try {
      setError(null)
      setFlyingElements([])
      const res = await fetch('/api/game/new', { method: 'POST' })
      const data: ClientView = await res.json()
      setGameState(data)
      setPhase('playing')
      setMessage('')

      if (data.actionLog.length > 0) {
        await replayActions(data.actionLog, data)
      }
    } catch {
      setError('Failed to start game. Is the server running?')
    }
  }, [])

  const submitAction = useCallback(async (action: 'take' | 'pass') => {
    if (animating || !gameState) return
    setError(null)

    const prevScore = gameState.you.score

    // Optimistic animation for the human's action
    setAnimating(true)
    animationRef.current = true

    if (action === 'pass') {
      // Animate chip from player to center
      await animateChip('player-chips', 'center')
      // Update local state optimistically
      setGameState(prev => prev ? {
        ...prev,
        you: { ...prev.you, chips: prev.you.chips - 1 },
        chipsOnCard: prev.chipsOnCard + 1,
      } : prev)
    } else {
      // Animate card from center to player
      if (gameState.currentCard !== null) {
        // Animate card sliding to hand
        await animateCard(gameState.currentCard, 'player-cards')
        // Animate chips to player (if any)
        if (gameState.chipsOnCard > 0) {
          await animateChipsToPlayer(gameState.chipsOnCard, 'player-chips')
        }
      }
    }

    try {
      const res = await fetch('/api/game/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data: ClientView = await res.json()

      if (!res.ok) {
        setError((data as unknown as { error: string }).error)
        animationRef.current = false
        setAnimating(false)
        return
      }

      // Show score delta feedback when human takes a card
      if (action === 'take') {
        const scoreDelta = data.you.score - prevScore
        if (scoreDelta === 0) {
          setMessage('Extends run!')
        } else {
          setMessage(`+${scoreDelta} pts`)
        }
        // Clear the message after a brief display
        setTimeout(() => setMessage(''), 1200)
      }

      if (data.actionLog.length > 0) {
        // Apply the state before AI turns (human action result)
        // Then replay AI actions
        await replayActions(data.actionLog, data)
      } else {
        setGameState(data)
        if (data.phase === 'finished') setPhase('finished')
        animationRef.current = false
        setAnimating(false)
      }
    } catch {
      setError('Failed to send action.')
      animationRef.current = false
      setAnimating(false)
    }
  }, [animating, gameState, animateChip, animateCard, animateChipsToPlayer])

  const replayActions = async (
    log: ActionLogEntry[],
    finalState: ClientView
  ) => {
    if (!animationRef.current) {
      animationRef.current = true
      setAnimating(true)
    }

    for (let i = 0; i < log.length; i++) {
      const entry = log[i]
      const zone = playerZone(entry.playerId)

      // Show "thinking" message
      setMessage(`${entry.player} is thinking...`)
      await delay(600 + Math.random() * 400)

      if (entry.action === 'pass') {
        // Animate chip from opponent to center
        setMessage(`${entry.player} passed`)
        await animateChip(`${zone}-chips`, 'center')

        // Update chips on card visually
        setGameState(prev => prev ? {
          ...prev,
          chipsOnCard: entry.chipsOnCardAfter ?? prev.chipsOnCard + 1,
        } : prev)

        await delay(300)
      } else {
        // Take animation
        const chipText =
          entry.chipsCollected && entry.chipsCollected > 0
            ? ` (+${entry.chipsCollected} chips)`
            : ''
        setMessage(`${entry.player} took the ${entry.card}!${chipText}`)

        // Animate card to opponent
        if (entry.card !== undefined) {
          await animateCard(entry.card, `${zone}-cards`)
        }

        // Animate chips to opponent
        if (entry.chipsCollected && entry.chipsCollected > 0) {
          await animateChipsToPlayer(entry.chipsCollected, `${zone}-chips`)
        }

        // Update intermediate state: show new card, update opponent cards
        setGameState(prev => {
          if (!prev) return prev
          const newOpponents = prev.opponents.map(opp => {
            if (opp.id === entry.playerId && entry.opponentCardsAfter) {
              return { ...opp, cards: entry.opponentCardsAfter }
            }
            return opp
          })
          return {
            ...prev,
            opponents: newOpponents,
            currentCard: entry.newCard ?? null,
            chipsOnCard: 0,
          }
        })

        if (entry.newCard) {
          await delay(400)
        }
      }
    }

    // Apply final server state
    setGameState(finalState)
    setMessage('')
    if (finalState.phase === 'finished') setPhase('finished')

    animationRef.current = false
    setAnimating(false)
  }

  if (phase === 'menu') {
    return (
      <div className="app">
        <div className="menu">
          <h1>No Thanks!</h1>
          <p className="subtitle">The card game where less is more.</p>
          <button className="btn btn-primary btn-large" onClick={startNewGame}>
            New Game
          </button>
          <div className="rules">
            <h3>How to play</h3>
            <ul>
              <li>Each turn, a card is revealed (3–35).</li>
              <li>Say <strong>"No Thanks!"</strong> to pass — costs 1 chip.</li>
              <li>Or <strong>take</strong> the card + any chips on it.</li>
              <li>Consecutive cards (runs) only score the lowest.</li>
              <li><strong>Lowest score wins!</strong></li>
            </ul>
          </div>
          {error && <div className="error">{error}</div>}
        </div>
      </div>
    )
  }

  if (phase === 'finished' && gameState?.finalScores) {
    return (
      <div className="app">
        <GameOver scores={gameState.finalScores} onPlayAgain={startNewGame} />
      </div>
    )
  }

  return (
    <div className="app">
      {gameState && (
        <GameBoard
          ref={boardRef}
          state={gameState}
          onAction={submitAction}
          animating={animating}
          message={message}
          flyingElements={flyingElements}
        />
      )}
      {error && <div className="error">{error}</div>}
    </div>
  )
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function frame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

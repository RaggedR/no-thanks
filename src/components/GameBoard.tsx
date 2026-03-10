import { useRef, useCallback, useImperativeHandle, forwardRef } from 'react'
import { ClientView, FlyingElement } from '../types'
import Card from './Card'
import PlayerHand from './PlayerHand'
import OpponentZone from './OpponentZone'

interface GameBoardProps {
  state: ClientView
  onAction: (action: 'take' | 'pass') => void
  animating: boolean
  message: string
  flyingElements: FlyingElement[]
}

export interface GameBoardHandle {
  getRect: (zone: 'center' | 'player-chips' | 'player-cards' | 'opp1-chips' | 'opp1-cards' | 'opp2-chips' | 'opp2-cards') => DOMRect | null
}

const GameBoard = forwardRef<GameBoardHandle, GameBoardProps>(
  function GameBoard({ state, onAction, animating, message, flyingElements }, ref) {
    const canPass = state.validActions.includes('pass')
    const canTake = state.validActions.includes('take')
    const buttonsEnabled = state.isYourTurn && !animating

    // Refs for animation targets
    const centerRef = useRef<HTMLDivElement>(null)
    const playerChipsRef = useRef<HTMLDivElement>(null)
    const playerCardsRef = useRef<HTMLDivElement>(null)
    const opp1ChipsRef = useRef<HTMLDivElement>(null)
    const opp1CardsRef = useRef<HTMLDivElement>(null)
    const opp2ChipsRef = useRef<HTMLDivElement>(null)
    const opp2CardsRef = useRef<HTMLDivElement>(null)

    const getRect = useCallback((zone: string): DOMRect | null => {
      const refMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
        'center': centerRef,
        'player-chips': playerChipsRef,
        'player-cards': playerCardsRef,
        'opp1-chips': opp1ChipsRef,
        'opp1-cards': opp1CardsRef,
        'opp2-chips': opp2ChipsRef,
        'opp2-cards': opp2CardsRef,
      }
      return refMap[zone]?.current?.getBoundingClientRect() ?? null
    }, [])

    useImperativeHandle(ref, () => ({ getRect }), [getRect])

    // Chips on card as visual tokens around the card
    const chipsOnCardTokens = state.chipsOnCard

    return (
      <div className="game-board">
        {/* Animation overlay */}
        {flyingElements.length > 0 && (
          <div className="animation-overlay">
            {flyingElements.map((el) => {
              const style: React.CSSProperties = {
                position: 'fixed',
                left: el.phase === 'placed' ? el.startX : el.endX,
                top: el.phase === 'placed' ? el.startY : el.endY,
                transition: 'left 0.4s ease-in-out, top 0.4s ease-in-out',
                zIndex: 1000,
                pointerEvents: 'none',
              }

              if (el.type === 'chip') {
                return (
                  <div key={el.id} className="chip-token flying-chip" style={style} />
                )
              } else {
                // Flying card matches the new white card + ring design
                const t = ((el.cardValue ?? 20) - 3) / 32
                const hue = 120 - t * 120
                return (
                  <div
                    key={el.id}
                    className="card card-small flying-card"
                    style={style}
                  >
                    <span className="card-ring" style={{ borderColor: `hsl(${hue}, 60%, 50%)` }}>
                      <span className="card-value">{el.cardValue}</span>
                    </span>
                  </div>
                )
              }
            })}
          </div>
        )}

        {/* Opponents at top */}
        <div className="opponents-row">
          {state.opponents.map((opp, i) => (
            <OpponentZone
              key={opp.id}
              opponent={opp}
              chipRef={i === 0 ? opp1ChipsRef : opp2ChipsRef}
              cardsRef={i === 0 ? opp1CardsRef : opp2CardsRef}
            />
          ))}
        </div>

        {/* Center: current card + chips only (no buttons) */}
        <div className="center-area">
          {message && <div className="action-message">{message}</div>}

          {state.currentCard !== null ? (
            <div className="current-card-area" ref={centerRef}>
              <Card value={state.currentCard} size="large" />
              {chipsOnCardTokens > 0 && (
                <div className="chips-on-card-pile">
                  {Array.from({ length: chipsOnCardTokens }).map((_, i) => (
                    <div
                      key={i}
                      className="chip-token chip-on-card"
                      style={{
                        position: 'absolute',
                        left: `${50 + (i % 5) * 14 - 28}%`,
                        bottom: `${-8 - Math.floor(i / 5) * 14}px`,
                      }}
                    />
                  ))}
                  {/* chip tokens speak for themselves — no count label */}
                </div>
              )}
            </div>
          ) : (
            <div className="no-card" ref={centerRef}>No card</div>
          )}

          {!state.isYourTurn && !animating && state.phase === 'playing' && (
            <div className="waiting">Waiting for opponents...</div>
          )}
        </div>

        {/* Player hand at bottom */}
        <div className="player-area">
          <PlayerHand
            cards={state.you.cards}
            chips={state.you.chips}
            score={state.you.score}
            chipRef={playerChipsRef}
            cardsRef={playerCardsRef}
            isYourTurn={state.isYourTurn}
          />
        </div>

        {/* Round action buttons below player area */}
        <div className="action-buttons-bottom">
          <button
            className="btn btn-pass"
            disabled={!buttonsEnabled || !canPass}
            onClick={() => onAction('pass')}
          >
            Pass
            {buttonsEnabled && canPass && (
              <span className="btn-hint">&minus;1 chip</span>
            )}
          </button>
          <button
            className="btn btn-take"
            disabled={!buttonsEnabled || !canTake}
            onClick={() => onAction('take')}
          >
            Take
            {buttonsEnabled && canTake && state.chipsOnCard > 0 && (
              <span className="btn-hint">+{state.chipsOnCard} chips</span>
            )}
          </button>
        </div>
      </div>
    )
  }
)

export default GameBoard

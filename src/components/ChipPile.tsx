import { forwardRef } from 'react'

interface ChipPileProps {
  count: number
  hidden?: boolean  // show as face-down (for opponents)
  max?: number      // max visible chips before collapsing
}

/**
 * Visual pile of golden chip tokens.
 * Shows actual circles instead of a number.
 * When hidden, shows stacked grey chips with "?" label.
 */
const ChipPile = forwardRef<HTMLDivElement, ChipPileProps>(
  function ChipPile({ count, hidden = false, max = 11 }, ref) {
    if (hidden) {
      return (
        <div className="chip-pile chip-pile-hidden" ref={ref}>
          <div className="chip-stack-hidden">
            {Array.from({ length: Math.min(3, 3) }).map((_, i) => (
              <div key={i} className="chip-token chip-hidden" style={{ marginLeft: i * 6 }} />
            ))}
          </div>
          <span className="chip-label">???</span>
        </div>
      )
    }

    const visible = Math.min(count, max)
    // Arrange chips in a compact cluster
    return (
      <div className="chip-pile" ref={ref}>
        <div className="chip-stack">
          {Array.from({ length: visible }).map((_, i) => (
            <div
              key={i}
              className="chip-token"
              style={{
                marginLeft: i === 0 ? 0 : -8,
                zIndex: i,
              }}
            />
          ))}
        </div>
        <span className="chip-label">{count}</span>
      </div>
    )
  }
)

export default ChipPile

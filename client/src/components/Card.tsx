import { forwardRef } from 'react'

interface CardProps {
  value: number
  size?: 'small' | 'medium' | 'large'
  highlighted?: boolean
  className?: string
}

/**
 * White/cream card with a colored ring around the number.
 * Ring color maps value 3–35 from green (low) → red (high) for semantic meaning.
 */
const Card = forwardRef<HTMLDivElement, CardProps>(
  function Card({ value, size = 'small', highlighted = false, className = '' }, ref) {
    const t = (value - 3) / 32
    const hue = 120 - t * 120

    return (
      <div
        ref={ref}
        className={`card card-${size} ${highlighted ? 'card-highlighted' : ''} ${className}`}
      >
        <span className="card-ring" style={{ borderColor: `hsl(${hue}, 60%, 50%)` }}>
          <span className="card-value">{value}</span>
        </span>
      </div>
    )
  }
)

export default Card

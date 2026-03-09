import { forwardRef } from 'react'

interface CardProps {
  value: number
  size?: 'small' | 'large'
  highlighted?: boolean
  className?: string
}

/**
 * Color-coded card: green (low/good) → red (high/bad).
 * Uses HSL with hue from 120 (green) to 0 (red) based on card value 3–35.
 */
const Card = forwardRef<HTMLDivElement, CardProps>(
  function Card({ value, size = 'small', highlighted = false, className = '' }, ref) {
    const t = (value - 3) / 32
    const hue = 120 - t * 120
    const bg = `hsl(${hue}, 70%, ${size === 'large' ? '45%' : '40%'})`

    return (
      <div
        ref={ref}
        className={`card card-${size} ${highlighted ? 'card-highlighted' : ''} ${className}`}
        style={{ backgroundColor: bg }}
      >
        <span className="card-value">{value}</span>
      </div>
    )
  }
)

export default Card

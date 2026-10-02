import { memo } from 'react'

const CONFETTI_COLORS = ['#5b5bd6', '#8b5cf6', '#ff6b9d', '#0bbf9a', '#ffd166', '#ff9f68']

const PIECES = Array.from({ length: 40 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: ((i * 53) % 100) / 100,
  duration: 2.4 + ((i * 29) % 10) / 10,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  size: 6 + (i % 3) * 3,
  rotate: (i * 71) % 360,
  round: i % 3 === 0,
}))

export const Confetti = memo(function Confetti({ count = 36 }: { count?: number }) {
  return (
    <div className="confetti" aria-hidden="true">
      {PIECES.slice(0, count).map((piece, i) => (
        <span
          key={i}
          className={`confetti__piece${piece.round ? ' confetti__piece--round' : ''}`}
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size * (piece.round ? 1 : 0.6),
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            transform: `rotate(${piece.rotate}deg)`,
          }}
        />
      ))}
    </div>
  )
})

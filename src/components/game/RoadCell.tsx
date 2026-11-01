import React from 'react'

interface RoadCellProps {
  // Connections to orthogonal road neighbors
  hasNorth: boolean
  hasSouth: boolean
  hasEast: boolean
  hasWest: boolean
}

export const RoadCell: React.FC<RoadCellProps> = ({
  hasNorth,
  hasSouth,
  hasEast,
  hasWest,
}) => {
  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[var(--asphalt)]">
      {/* Curbs on borders with no road neighbor */}
      {!hasNorth && <div className="absolute top-0 left-0 right-0 h-2 bg-[var(--curb)] z-10 shadow-sm" />}
      {!hasSouth && <div className="absolute bottom-0 left-0 right-0 h-2 bg-[var(--curb)] z-10 shadow-sm" />}
      {!hasWest && <div className="absolute top-0 bottom-0 left-0 w-2 bg-[var(--curb)] z-10 shadow-sm" />}
      {!hasEast && <div className="absolute top-0 bottom-0 right-0 w-2 bg-[var(--curb)] z-10 shadow-sm" />}

      {/* SVG-based prominent dashed lane markings */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Horizontal lane dash if connecting East or West */}
        {(hasEast || hasWest) && (
          <line
            x1={hasWest ? '0' : '50'}
            y1="50"
            x2={hasEast ? '100' : '50'}
            y2="50"
            stroke="var(--lane-paint)"
            strokeWidth="3.5"
            strokeDasharray="14 10"
            strokeLinecap="round"
            opacity="0.85"
          />
        )}

        {/* Vertical lane dash if connecting North or South */}
        {(hasNorth || hasSouth) && (
          <line
            x1="50"
            y1={hasNorth ? '0' : '50'}
            x2="50"
            y2={hasSouth ? '100' : '50'}
            stroke="var(--lane-paint)"
            strokeWidth="3.5"
            strokeDasharray="14 10"
            strokeLinecap="round"
            opacity="0.85"
          />
        )}
      </svg>
    </div>
  )
}

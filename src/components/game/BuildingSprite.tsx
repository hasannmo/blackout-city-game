import React from 'react'

interface BuildingProps {
  variant: string
  isLit: boolean
  isPowered: boolean
}

export const BuildingSprite: React.FC<BuildingProps> = ({ isLit }) => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-1 select-none pointer-events-none">
      {/* 2.5D Isometric Roof */}
      <div
        className="w-10 h-7 rounded-lg border-2 border-[var(--outline)] relative shadow-md transition-colors duration-300"
        style={{
          backgroundColor: isLit ? 'var(--roof-red-lit)' : 'var(--roof-unlit)',
        }}
      >
        {/* Roof ridge / highlight highlight */}
        <div className="absolute top-1 left-1.5 right-1.5 h-1.5 bg-white/25 rounded-sm" />
      </div>

      {/* House Front Wall */}
      <div
        className="w-9 h-6 -mt-1 rounded-b-md border-2 border-[var(--outline)] border-t-0 relative flex items-center justify-around px-1 transition-colors duration-300 shadow-sm"
        style={{
          backgroundColor: isLit ? 'var(--wall-lit)' : 'var(--wall-unlit)',
        }}
      >
        {/* Window 1 */}
        <div
          className="w-2.5 h-2.5 rounded-sm border border-[var(--outline)] transition-colors duration-300"
          style={{
            backgroundColor: isLit ? 'var(--power-yellow)' : 'var(--window-unlit)',
            boxShadow: isLit ? '0 0 6px var(--power-yellow)' : 'none',
          }}
        />

        {/* Door */}
        <div className="w-2 h-3.5 bg-[var(--outline)] rounded-t-sm self-end" />

        {/* Window 2 */}
        <div
          className="w-2.5 h-2.5 rounded-sm border border-[var(--outline)] transition-colors duration-300"
          style={{
            backgroundColor: isLit ? 'var(--power-yellow)' : 'var(--window-unlit)',
            boxShadow: isLit ? '0 0 6px var(--power-yellow)' : 'none',
          }}
        />
      </div>
    </div>
  )
}

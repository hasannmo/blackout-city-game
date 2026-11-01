import React from 'react'

export const TreeSprite: React.FC = () => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-1 select-none pointer-events-none">
      {/* Top Foliage */}
      <div className="w-8 h-8 rounded-full bg-[var(--tree)] border-2 border-[var(--outline)] relative shadow-md flex items-center justify-center">
        <div className="w-4 h-4 rounded-full bg-emerald-400/30" />
      </div>
      {/* Trunk */}
      <div className="w-2 h-2.5 bg-amber-900 border-x border-b border-[var(--outline)] rounded-b-sm -mt-0.5" />
    </div>
  )
}


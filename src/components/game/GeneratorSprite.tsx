import React from 'react'

export const GeneratorSprite: React.FC = () => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-1 select-none pointer-events-none">
      <div className="w-10 h-10 rounded-xl bg-[var(--power-yellow)] border-2 border-[var(--outline)] shadow-md flex flex-col items-center justify-center relative overflow-hidden">
        {/* Top ventilation / detail */}
        <div className="absolute top-1 w-6 h-1 bg-[var(--outline)]/20 rounded-full" />
        {/* Zap Icon */}
        <img src="/icons/zap.svg" alt="Generator" className="w-6 h-6 mt-1 drop-shadow-sm" />
      </div>
    </div>
  )
}


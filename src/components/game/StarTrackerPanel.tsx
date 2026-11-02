import React from 'react'
import { useGameStore } from '../../stores/gameStore'
import {
  computeLiveStarState,
  getObjectiveDescription,
} from '../../engine/objectives/objectiveEvaluator'

export const StarTrackerPanel: React.FC = () => {
  const level = useGameStore((s) => s.level)
  const buildingDefinitions = useGameStore((s) => s.buildingDefinitions)
  const gameState = useGameStore((s) => s.gameState)

  const activeIds = gameState.activeBuildingIds

  const { star1Satisfied, star2Satisfied, star3Satisfied, starCount, currentScore } =
    computeLiveStarState(level, buildingDefinitions, activeIds)

  const objectiveText = getObjectiveDescription(level.objective)

  return (
    <aside className="hidden lg:flex flex-col gap-3 w-72 select-none">
      {/* Star Progress Bar Card */}
      <div className="bg-[var(--panel)] border-4 border-[var(--outline)] rounded-3xl p-5 shadow-lg flex flex-col items-center">
        <span className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2">
          Star Progress
        </span>

        {/* 3 Stars Visual Indicator */}
        <div className="flex items-center justify-center gap-3 my-2 w-full">
          {/* Star 1 */}
          <div
            className={`flex flex-col items-center transition-all duration-300 ${
              star1Satisfied ? 'scale-110 drop-shadow-md' : 'opacity-40 grayscale'
            }`}
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-[var(--outline)] transition-colors ${
                star1Satisfied ? 'bg-[var(--power-yellow)]' : 'bg-gray-200'
              }`}
            >
              <img
                src="/icons/star.svg"
                alt="Star 1"
                className={`w-8 h-8 ${star1Satisfied ? 'text-[var(--star-on)]' : 'text-gray-400'}`}
              />
            </div>
            <span className="text-[10px] font-black mt-1 text-[var(--ink)]">STAR 1</span>
          </div>

          {/* Star 2 */}
          <div
            className={`flex flex-col items-center transition-all duration-300 ${
              star2Satisfied ? 'scale-110 drop-shadow-md' : 'opacity-40 grayscale'
            }`}
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-[var(--outline)] transition-colors ${
                star2Satisfied ? 'bg-[var(--power-yellow)]' : 'bg-gray-200'
              }`}
            >
              <img
                src="/icons/star.svg"
                alt="Star 2"
                className={`w-8 h-8 ${star2Satisfied ? 'text-[var(--star-on)]' : 'text-gray-400'}`}
              />
            </div>
            <span className="text-[10px] font-black mt-1 text-[var(--ink)]">STAR 2</span>
          </div>

          {/* Star 3 */}
          <div
            className={`flex flex-col items-center transition-all duration-300 ${
              star3Satisfied ? 'scale-110 drop-shadow-md' : 'opacity-40 grayscale'
            }`}
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-[var(--outline)] transition-colors ${
                star3Satisfied ? 'bg-[var(--power-yellow)]' : 'bg-gray-200'
              }`}
            >
              <img
                src="/icons/star.svg"
                alt="Star 3"
                className={`w-8 h-8 ${star3Satisfied ? 'text-[var(--star-on)]' : 'text-gray-400'}`}
              />
            </div>
            <span className="text-[10px] font-black mt-1 text-[var(--ink)]">STAR 3</span>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="mt-3 w-full bg-white/80 rounded-xl border-2 border-[var(--outline)] py-1.5 px-3 flex items-center justify-between text-xs font-black">
          <span className="text-gray-600">Current Stars:</span>
          <span className="text-amber-900 font-extrabold">{starCount} / 3 ⭐</span>
        </div>
      </div>

      {/* Requirement Details Card */}
      <div className="bg-[var(--panel)] border-4 border-[var(--outline)] rounded-3xl p-5 shadow-lg flex flex-col gap-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">
          Level Requirements
        </h3>

        {/* 1-Star Requirement: Building Objective */}
        <div
          className={`flex items-start gap-2.5 p-3 rounded-2xl border-2 transition-all ${
            star1Satisfied
              ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
              : 'bg-white/80 border-[var(--outline)] text-[var(--ink)]'
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {star1Satisfied ? (
              <img src="/icons/check.svg" alt="Complete" className="w-5 h-5 text-emerald-600" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-400 flex items-center justify-center text-[10px] font-black text-gray-500">
                1
              </div>
            )}
          </div>
          <div className="flex-1 text-left">
            <span className="text-xs font-extrabold block">★ 1 Star: Objective</span>
            <p className="text-[11px] font-bold text-gray-700 leading-snug mt-0.5">
              {objectiveText}
            </p>
          </div>
        </div>

        {/* 2-Star Requirement: Score Threshold */}
        <div
          className={`flex items-start gap-2.5 p-3 rounded-2xl border-2 transition-all ${
            star2Satisfied
              ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
              : 'bg-white/80 border-[var(--outline)] text-[var(--ink)]'
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {star2Satisfied ? (
              <img src="/icons/check.svg" alt="Complete" className="w-5 h-5 text-emerald-600" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-400 flex items-center justify-center text-[10px] font-black text-gray-500">
                2
              </div>
            )}
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold block">★★ 2 Stars: Score</span>
              <span className="text-[10px] font-black text-gray-500">
                {currentScore}/{level.stars.two} PTS
              </span>
            </div>
            <p className="text-[11px] font-bold text-gray-700 leading-snug mt-0.5">
              Reach at least <strong>{level.stars.two}</strong> points
            </p>
          </div>
        </div>

        {/* 3-Star Requirement: Score Threshold */}
        <div
          className={`flex items-start gap-2.5 p-3 rounded-2xl border-2 transition-all ${
            star3Satisfied
              ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
              : 'bg-white/80 border-[var(--outline)] text-[var(--ink)]'
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {star3Satisfied ? (
              <img src="/icons/check.svg" alt="Complete" className="w-5 h-5 text-emerald-600" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-400 flex items-center justify-center text-[10px] font-black text-gray-500">
                3
              </div>
            )}
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold block">★★★ 3 Stars: Score</span>
              <span className="text-[10px] font-black text-gray-500">
                {currentScore}/{level.stars.three} PTS
              </span>
            </div>
            <p className="text-[11px] font-bold text-gray-700 leading-snug mt-0.5">
              Reach at least <strong>{level.stars.three}</strong> points
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}

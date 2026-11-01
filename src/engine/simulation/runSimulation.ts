import type { GameState, SimulationResult } from '../../types'
import type { LevelIndex } from '../connectivity/networkAssignment'
import { evaluateObjective, computeScore, computeStars } from '../objectives/objectiveEvaluator'

export function runSimulation(index: LevelIndex, state: GameState): SimulationResult {
  const poweredSet = new Set(state.activeBuildingIds)
  const allBuildingIds = index.level.buildings.map((b) => b.id)
  const unpoweredBuildingIds = allBuildingIds.filter((id) => !poweredSet.has(id))

  const mandatoryMet = evaluateObjective(
    index.level.objective,
    index.level,
    index.buildingDefinitions,
    poweredSet
  )

  const score = computeScore(index.level, poweredSet)
  const stars = computeStars(
    mandatoryMet,
    score,
    index.level.stars.two,
    index.level.stars.three
  )

  return {
    completed: mandatoryMet,
    mandatoryMet,
    score,
    stars,
    poweredBuildingIds: Array.from(poweredSet),
    unpoweredBuildingIds,
  }
}


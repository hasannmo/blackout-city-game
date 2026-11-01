import type { LevelDefinition, BuildingDefinitionsMap, ObjectiveCondition } from '../../types'

export function evaluateObjective(
  condition: ObjectiveCondition,
  level: LevelDefinition,
  buildingDefinitions: BuildingDefinitionsMap,
  poweredBuildingIds: Set<string>
): boolean {
  switch (condition.type) {
    case 'buildingPowered':
      return poweredBuildingIds.has(condition.buildingId)

    case 'allBuildingsPowered':
      return level.buildings.every((b) => poweredBuildingIds.has(b.id))

    case 'minTotalPowered':
      return poweredBuildingIds.size >= condition.min

    case 'categoryCount': {
      let count = 0
      for (const b of level.buildings) {
        if (poweredBuildingIds.has(b.id)) {
          const def = buildingDefinitions[b.variant]
          if (def && def.category === condition.category) {
            count++
          }
        }
      }
      return count >= condition.min
    }

    case 'and':
      return condition.children.every((child) =>
        evaluateObjective(child, level, buildingDefinitions, poweredBuildingIds)
      )

    case 'or':
      return condition.children.some((child) =>
        evaluateObjective(child, level, buildingDefinitions, poweredBuildingIds)
      )
  }
}

export function computeScore(level: LevelDefinition, poweredBuildingIds: Set<string>): number {
  let score = 0
  for (const b of level.buildings) {
    if (poweredBuildingIds.has(b.id)) {
      score += b.score
    }
  }
  return score
}

export function computeStars(
  mandatoryMet: boolean,
  score: number,
  twoStarThreshold: number,
  threeStarThreshold: number
): number {
  if (!mandatoryMet) return 0
  if (score >= threeStarThreshold) return 3
  if (score >= twoStarThreshold) return 2
  return 1
}


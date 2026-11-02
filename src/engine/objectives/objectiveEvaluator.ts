import type {
  LevelDefinition,
  BuildingDefinitionsMap,
  ObjectiveCondition,
} from "../../types";

export function getObjectiveDescription(
  condition: ObjectiveCondition,
): string {
  switch (condition.type) {
    case "allBuildingsPowered":
      return "Power all buildings in the district";
    case "buildingPowered":
      return `Power required building (${condition.buildingId})`;
    case "minTotalPowered":
      return `Power at least ${condition.min} building${condition.min > 1 ? "s" : ""}`;
    case "categoryCount": {
      const cat = condition.category;
      const formatted = cat.charAt(0).toUpperCase() + cat.slice(1);
      return `Power at least ${condition.min} ${formatted} building${condition.min > 1 ? "s" : ""}`;
    }
    case "and":
      return condition.children
        .map((c) => getObjectiveDescription(c))
        .join(" and ");
    case "or":
      return condition.children
        .map((c) => getObjectiveDescription(c))
        .join(" or ");
  }
}

export function evaluateObjective(
  condition: ObjectiveCondition,
  level: LevelDefinition,
  buildingDefinitions: BuildingDefinitionsMap,
  poweredBuildingIds: Set<string>,
): boolean {
  switch (condition.type) {
    case "buildingPowered":
      return poweredBuildingIds.has(condition.buildingId);

    case "allBuildingsPowered":
      return level.buildings.every((b) => poweredBuildingIds.has(b.id));

    case "minTotalPowered":
      return poweredBuildingIds.size >= condition.min;

    case "categoryCount": {
      let count = 0;
      for (const b of level.buildings) {
        if (poweredBuildingIds.has(b.id)) {
          const def = buildingDefinitions[b.variant];
          if (def && def.category === condition.category) {
            count++;
          }
        }
      }
      return count >= condition.min;
    }

    case "and":
      return condition.children.every((child) =>
        evaluateObjective(
          child,
          level,
          buildingDefinitions,
          poweredBuildingIds,
        ),
      );

    case "or":
      return condition.children.some((child) =>
        evaluateObjective(
          child,
          level,
          buildingDefinitions,
          poweredBuildingIds,
        ),
      );
  }
}

export function computeScore(
  level: LevelDefinition,
  poweredBuildingIds: Set<string>,
): number {
  let score = 0;
  for (const b of level.buildings) {
    if (poweredBuildingIds.has(b.id)) {
      score += b.score;
    }
  }
  return score;
}

export function computeStars(
  mandatoryMet: boolean,
  score: number,
  twoStarThreshold: number,
  threeStarThreshold: number,
): number {
  if (!mandatoryMet) return 0;
  if (score >= threeStarThreshold) return 3;
  if (score >= twoStarThreshold) return 2;
  return 1;
}

export function computeLiveStarState(
  level: LevelDefinition,
  buildingDefinitions: BuildingDefinitionsMap,
  poweredBuildingIds: Set<string>,
): {
  star1Satisfied: boolean;
  star2Satisfied: boolean;
  star3Satisfied: boolean;
  starCount: number;
  currentScore: number;
} {
  const star1Satisfied = evaluateObjective(
    level.objective,
    level,
    buildingDefinitions,
    poweredBuildingIds,
  );
  const currentScore = computeScore(level, poweredBuildingIds);
  const star2Satisfied = star1Satisfied && currentScore >= level.stars.two;
  const star3Satisfied = star1Satisfied && currentScore >= level.stars.three;

  const starCount = star3Satisfied ? 3 : star2Satisfied ? 2 : star1Satisfied ? 1 : 0;

  return {
    star1Satisfied,
    star2Satisfied,
    star3Satisfied,
    starCount,
    currentScore,
  };
}

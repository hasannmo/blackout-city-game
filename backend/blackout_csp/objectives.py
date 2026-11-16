from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Set

from .models import BuildingDefinition, LevelDefinition

def evaluate_objective(
    condition: Dict[str, Any],
    level: LevelDefinition,
    building_definitions: Dict[str, BuildingDefinition],
    powered_ids: Set[str],
) -> bool:
    ctype = condition.get("type")

    if ctype == "buildingPowered":
        return condition["buildingId"] in powered_ids

    if ctype == "allBuildingsPowered":
        return all(b.id in powered_ids for b in level.buildings)

    if ctype == "minTotalPowered":
        return len(powered_ids) >= condition["min"]

    if ctype == "categoryCount":
        count = 0
        for b in level.buildings:
            if b.id in powered_ids:
                definition = building_definitions.get(b.variant)
                if definition is not None and definition.category == condition["category"]:
                    count += 1
        return count >= condition["min"]

    if ctype == "and":
        return all(
            evaluate_objective(child, level, building_definitions, powered_ids)
            for child in condition["children"]
        )

    if ctype == "or":
        return any(
            evaluate_objective(child, level, building_definitions, powered_ids)
            for child in condition["children"]
        )

    raise ValueError(f"Tipe objective tidak dikenal: {ctype!r}")

def compute_score(level: LevelDefinition, powered_ids: Set[str]) -> int:
    return sum(b.score for b in level.buildings if b.id in powered_ids)

@dataclass(frozen=True)
class LiveStarState:
    star1_satisfied: bool
    star2_satisfied: bool
    star3_satisfied: bool
    star_count: int
    current_score: int

def compute_live_star_state(
    level: LevelDefinition,
    building_definitions: Dict[str, BuildingDefinition],
    powered_ids: Set[str],
) -> LiveStarState:
    star1 = evaluate_objective(level.objective, level, building_definitions, powered_ids)
    score = compute_score(level, powered_ids)
    star2 = star1 and score >= level.star_two
    star3 = star1 and score >= level.star_three

    if star3:
        count = 3
    elif star2:
        count = 2
    elif star1:
        count = 1
    else:
        count = 0

    return LiveStarState(star1, star2, star3, count, score)

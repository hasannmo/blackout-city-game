from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, NamedTuple

class Coordinate(NamedTuple):
    x: int
    y: int

    def to_dict(self) -> Dict[str, int]:
        return {"x": self.x, "y": self.y}

@dataclass(frozen=True)
class BuildingDefinition:
    name: str
    category: str
    width: int
    height: int
    demand: int
    output: int

@dataclass(frozen=True)
class BuildingInstance:
    id: str
    variant: str
    origin: Coordinate
    score: int

@dataclass(frozen=True)
class LevelDefinition:
    id: str
    name: str
    grid_width: int
    grid_height: int
    roads: List[Coordinate]
    terrain: List[Coordinate]
    buildings: List[BuildingInstance]
    inventory: Dict[str, int]
    objective: Dict[str, Any]
    star_two: int
    star_three: int

def _require(data: Dict[str, Any], key: str, where: str) -> Any:
    if not isinstance(data, dict) or key not in data:
        raise ValueError(f"Field '{key}' tidak ditemukan pada {where}")
    return data[key]

def _parse_coordinate(data: Dict[str, Any], where: str) -> Coordinate:
    return Coordinate(int(_require(data, "x", where)), int(_require(data, "y", where)))

def parse_building_definitions(data: Dict[str, Any]) -> Dict[str, BuildingDefinition]:
    if not isinstance(data, dict):
        raise ValueError("buildingDefinitions harus berupa object")
    result: Dict[str, BuildingDefinition] = {}
    for key, d in data.items():
        where = f"buildingDefinitions.{key}"
        result[key] = BuildingDefinition(
            name=str(_require(d, "name", where)),
            category=str(_require(d, "category", where)),
            width=int(_require(d, "width", where)),
            height=int(_require(d, "height", where)),
            demand=int(_require(d, "demand", where)),
            output=int(_require(d, "output", where)),
        )
    return result


def parse_level(data: Dict[str, Any]) -> LevelDefinition:
    grid = _require(data, "grid", "level")
    stars = _require(data, "stars", "level")
    buildings = [
        BuildingInstance(
            id=str(_require(b, "id", "level.buildings[]")),
            variant=str(_require(b, "variant", "level.buildings[]")),
            origin=_parse_coordinate(
                _require(b, "origin", "level.buildings[]"), "level.buildings[].origin"
            ),
            score=int(_require(b, "score", "level.buildings[]")),
        )
        for b in _require(data, "buildings", "level")
    ]
    return LevelDefinition(
        id=str(_require(data, "id", "level")),
        name=str(data.get("name", data.get("id", ""))),
        grid_width=int(_require(grid, "width", "level.grid")),
        grid_height=int(_require(grid, "height", "level.grid")),
        roads=[_parse_coordinate(r, "level.roads[]") for r in _require(data, "roads", "level")],
        terrain=[_parse_coordinate(t, "level.terrain[]") for t in data.get("terrain", [])],
        buildings=buildings,
        inventory={str(k): int(v) for k, v in _require(data, "inventory", "level").items()},
        objective=_require(data, "objective", "level"),
        star_two=int(_require(stars, "two", "level.stars")),
        star_three=int(_require(stars, "three", "level.stars")),
    )

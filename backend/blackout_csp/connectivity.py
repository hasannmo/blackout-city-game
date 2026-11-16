from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from .footprint import (
    get_footprint_boundary_neighbors,
    get_footprint_cells,
    get_orthogonal_neighbors,
)
from .models import BuildingDefinition, Coordinate, LevelDefinition

@dataclass
class RoadComponent:
    id: str
    cells: List[Coordinate]

def compute_road_components(
    roads: List[Coordinate],
) -> Tuple[List[RoadComponent], Dict[Coordinate, str]]:
    road_set = set(roads)
    visited = set()
    components: List[RoadComponent] = []
    cell_to_component_id: Dict[Coordinate, str] = {}

    for road in roads:
        if road in visited:
            continue

        queue = deque([road])
        visited.add(road)
        cells: List[Coordinate] = []
        component_id = chr(65 + len(components))

        while queue:
            current = queue.popleft()
            cells.append(current)
            cell_to_component_id[current] = component_id
            for n in get_orthogonal_neighbors(current):
                if n in road_set and n not in visited:
                    visited.add(n)
                    queue.append(n)

        components.append(RoadComponent(id=component_id, cells=cells))

    return components, cell_to_component_id

@dataclass
class LevelIndex:
    level: LevelDefinition
    building_definitions: Dict[str, BuildingDefinition]
    road_components: List[RoadComponent]
    road_cell_to_component_id: Dict[Coordinate, str]
    building_to_network_id: Dict[str, Optional[str]]
    occupied_cells: Dict[Coordinate, str]

def build_level_index(
    level: LevelDefinition, building_definitions: Dict[str, BuildingDefinition]
) -> LevelIndex:
    components, cell_to_component_id = compute_road_components(level.roads)
    building_to_network_id: Dict[str, Optional[str]] = {}
    occupied: Dict[Coordinate, str] = {}

    for road in level.roads:
        occupied[road] = "road"
    for t in level.terrain:
        occupied[t] = "terrain"

    for b in level.buildings:
        definition = building_definitions.get(b.variant)
        if definition is None:
            continue

        for c in get_footprint_cells(b.origin, definition.width, definition.height):
            occupied[c] = "building"

        touching = set()
        for neighbor in get_footprint_boundary_neighbors(
            b.origin, definition.width, definition.height
        ):
            net_id = cell_to_component_id.get(neighbor)
            if net_id:
                touching.add(net_id)

        building_to_network_id[b.id] = next(iter(touching)) if len(touching) == 1 else None

    return LevelIndex(
        level=level,
        building_definitions=building_definitions,
        road_components=components,
        road_cell_to_component_id=cell_to_component_id,
        building_to_network_id=building_to_network_id,
        occupied_cells=occupied,
    )

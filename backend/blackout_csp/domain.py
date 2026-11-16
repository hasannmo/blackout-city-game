from __future__ import annotations

from dataclasses import dataclass
from typing import List

from .connectivity import LevelIndex
from .footprint import get_footprint_boundary_neighbors, get_footprint_cells
from .models import Coordinate

@dataclass(frozen=True)
class PlacementCandidate:
    origin: Coordinate
    network_id: str

def get_connected_generator_candidates(
    level_index: LevelIndex, gen_width: int, gen_height: int
) -> List[PlacementCandidate]:
    candidates: List[PlacementCandidate] = []
    grid_w = level_index.level.grid_width
    grid_h = level_index.level.grid_height

    for y in range(grid_h - gen_height + 1):
        for x in range(grid_w - gen_width + 1):
            origin = Coordinate(x, y)

            if any(
                cell in level_index.occupied_cells
                for cell in get_footprint_cells(origin, gen_width, gen_height)
            ):
                continue

            touching = {
                level_index.road_cell_to_component_id[b]
                for b in get_footprint_boundary_neighbors(origin, gen_width, gen_height)
                if b in level_index.road_cell_to_component_id
            }

            if len(touching) == 1:
                candidates.append(PlacementCandidate(origin, next(iter(touching))))

    return candidates

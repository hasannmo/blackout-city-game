from __future__ import annotations

from typing import List

from .models import Coordinate

def get_orthogonal_neighbors(coord: Coordinate) -> List[Coordinate]:
    return [
        Coordinate(coord.x + 1, coord.y),
        Coordinate(coord.x - 1, coord.y),
        Coordinate(coord.x, coord.y + 1),
        Coordinate(coord.x, coord.y - 1),
    ]

def get_footprint_cells(origin: Coordinate, width: int, height: int) -> List[Coordinate]:
    return [
        Coordinate(origin.x + dx, origin.y + dy)
        for dy in range(height)
        for dx in range(width)
    ]

def get_footprint_boundary_neighbors(
    origin: Coordinate, width: int, height: int
) -> List[Coordinate]:
    footprint = set(get_footprint_cells(origin, width, height))
    boundary: dict = {}  
    for cell in footprint:
        for n in get_orthogonal_neighbors(cell):
            if n not in footprint:
                boundary[n] = None
    return list(boundary)

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional

from .models import Coordinate

SolverAlgorithm = Literal["backtracking", "mrv", "mrv_forward_checking", "mrv_nc", "mrv_ac3"]
SolverMode = Literal["feasibility", "optimization"]

ALGORITHMS = ("backtracking", "mrv", "mrv_forward_checking", "mrv_nc", "mrv_ac3")
MODES = ("feasibility", "optimization")

@dataclass
class PlacedGenerator:
    type_id: str
    origin: Coordinate

    def to_dict(self) -> Dict[str, Any]:
        return {"typeId": self.type_id, "origin": self.origin.to_dict()}

@dataclass
class NetworkCapacity:
    network_id: str
    generation: int
    demand: int
    remaining: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "networkId": self.network_id,
            "generation": self.generation,
            "demand": self.demand,
            "remaining": self.remaining,
        }

@dataclass
class Solution:
    generators: List[PlacedGenerator]
    active_building_ids: List[str]
    powered_building_ids: List[str]
    network_capacities: List[NetworkCapacity]
    score: int
    stars: int
    is_complete: bool

    def to_dict(self) -> Dict[str, Any]:
        return {
            "generators": [g.to_dict() for g in self.generators],
            "activeBuildingIds": self.active_building_ids,
            "poweredBuildingIds": self.powered_building_ids,
            "networkCapacities": [c.to_dict() for c in self.network_capacities],
            "score": self.score,
            "stars": self.stars,
            "isComplete": self.is_complete,
        }

@dataclass
class BenchmarkStats:
    algorithm: str
    nodes_visited: int
    backtracks: int
    duration_ms: int
    solution_found: bool
    score: int
    is_timeout: bool

    def to_dict(self) -> Dict[str, Any]:
        return {
            "algorithm": self.algorithm,
            "nodesVisited": self.nodes_visited,
            "backtracks": self.backtracks,
            "durationMs": self.duration_ms,
            "solutionFound": self.solution_found,
            "score": self.score,
            "isTimeout": self.is_timeout,
        }

@dataclass
class SolverResult:
    stats: BenchmarkStats
    solution: Optional[Solution]
    comparison: Optional[List[BenchmarkStats]] = None

    def to_dict(self) -> Dict[str, Any]:
        data: Dict[str, Any] = {
            "stats": self.stats.to_dict(),
            "solution": self.solution.to_dict() if self.solution else None,
        }
        if self.comparison is not None:
            data["comparison"] = [s.to_dict() for s in self.comparison]
        return data

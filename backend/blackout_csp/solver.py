"""CSP Solver untuk Blackout City

Model CSP
---------
Variabel  : tiap generator di inventory (mis. 4 generator -> 4 variabel).
Domain    : kandidat origin dari ``get_connected_generator_candidates``.
Constraint: footprint generator tidak boleh bertabrakan satu sama lain
            (generator ke-k hanya boleh memilih kandidat dengan index > generator ke-(k-1)
            -> symmetry breaking, urutan penempatan tidak dihitung ulang).
Yujuan    : setelah generator ditempatkan, pilih subset bangunan yang dinyalakan
            (knapsack per jaringan) lalu cek objective; mode optimization mencari
            skor tertinggi, mode feasibility berhenti di solusi valid pertama.

Lima algoritma (urutan pemilihan kandidat / pruning berbeda):
1. backtracking          : kandidat berurutan index.
2. mrv                   : jaringan dengan kandidat paling sedikit (Minimum Remaining Values) duluan.
3. mrv_forward_checking  : MRV + pruning domain jaringan yang sudah cukup dayanya.
4. mrv_nc                : MRV + k=1 (node consistency). Domain dibangun eksplisit dari
                           seluruh sel grid lewat consistency.node_consistency, tanpa FC.
5. mrv_ac3               : MRV + k=2 (node consistency + AC-3 di setiap node / MAC), tanpa FC.
                           Kandidat generator berikutnya yang tidak arc-consistent dibuang.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Dict, List, Optional, Set, Tuple

from .connectivity import LevelIndex
from .csp_types import (
    ALGORITHMS,
    BenchmarkStats,
    NetworkCapacity,
    PlacedGenerator,
    Solution,
    SolverAlgorithm,
    SolverMode,
    SolverResult,
)
from .consistency import Domains, ac3, build_generator_csp, node_consistency
from .domain import PlacementCandidate, get_connected_generator_candidates
from .footprint import get_footprint_cells
from .models import BuildingDefinition, BuildingInstance, Coordinate
from .objectives import compute_live_star_state

DEFAULT_GENERATOR = BuildingDefinition(
    name="Generator", category="generator", width=1, height=1, demand=0, output=5
)

@dataclass
class _NetworkInfo:
    net_id: str
    buildings: List[BuildingInstance]
    demands: List[int]
    total_demand: int

@dataclass
class _Activation:
    active_building_ids: List[str]
    powered_building_ids: List[str]
    score: int
    stars: int
    is_complete: bool
    network_capacities: List[NetworkCapacity]

def _js_round(value: float) -> int:
    return int(value + 0.5)

class _CSPSearch:
    def __init__(
        self,
        level_index: LevelIndex,
        algorithm: SolverAlgorithm,
        mode: SolverMode,
        timeout_ms: float,
    ) -> None:
        self.level_index = level_index
        self.algorithm = algorithm
        self.mode = mode
        self.timeout_ms = timeout_ms

        defs = level_index.building_definitions
        self.gen_def: BuildingDefinition = defs.get("generator") or DEFAULT_GENERATOR
        self.inventory_count: int = level_index.level.inventory.get("generator", 0)

        self.uses_consistency = algorithm in ("mrv_nc", "mrv_ac3")
        if self.uses_consistency:
            self.candidates = self._node_consistent_candidates()
        else:
            self.candidates: List[PlacementCandidate] = get_connected_generator_candidates(
                level_index, self.gen_def.width, self.gen_def.height
            )

        self.networks: List[_NetworkInfo] = []
        for comp in level_index.road_components:
            blds = [
                b
                for b in level_index.level.buildings
                if level_index.building_to_network_id.get(b.id) == comp.id
            ]
            demands = []
            for b in blds:
                d = defs.get(b.variant)
                demands.append(d.demand if d else 0)
            self.networks.append(_NetworkInfo(comp.id, blds, demands, sum(demands)))

        self.net_candidates: Dict[str, List[int]] = {n.net_id: [] for n in self.networks}
        for idx, cand in enumerate(self.candidates):
            lst = self.net_candidates.get(cand.network_id)
            if lst is not None:
                lst.append(idx)

        self.occupied: Set[Coordinate] = set()
        self.placements: List[PlacedGenerator] = []
        self.net_gen: Dict[str, int] = {n.net_id: 0 for n in self.networks}

        self.nodes_visited = 0
        self.backtracks = 0
        self.start_time = time.perf_counter() * 1000.0
        self.is_timeout = False
        self.best_solution: Optional[Solution] = None
        self.best_score = -1

        self.max_possible_score = sum(b.score for b in level_index.level.buildings)

        self._knapsack_cache: Dict[Tuple[str, int], Tuple[List[str], int]] = {}

        self.ac3_vars = 0
        if algorithm == "mrv_ac3":
            self._setup_ac3()

    def _node_consistent_candidates(self) -> List[PlacementCandidate]:
        # k=1: mulai dari seluruh sel grid, buang yang melanggar constraint unary.
        csp = build_generator_csp(self.level_index, 1)
        nc = node_consistency(csp)
        return [
            PlacementCandidate(origin, next(iter(csp.touching_networks(origin))))
            for origin in nc.domains[0]
        ]

    def _setup_ac3(self) -> None:
        # Jumlah variabel = generator terbanyak yang masih bisa dipasang. Jika AC-3
        # gagal (domain kosong) untuk n generator, n pasti tidak bisa dipasang semua.
        origins = [c.origin for c in self.candidates]
        n = min(self.inventory_count, len(origins))
        while n > 0:
            csp = build_generator_csp(self.level_index, n)
            if ac3(csp, {v: list(origins) for v in range(n)}).consistent:
                break
            n -= 1
        self.ac3_vars = n
        self.ac3_csp = build_generator_csp(self.level_index, n)
        self.ac3_origins = origins

    def _ac3_allowed(self) -> Optional[Set[Coordinate]]:
        """Domain generator berikutnya setelah AC-3, atau None jika ada domain kosong."""
        placed = len(self.placements)
        if placed >= self.ac3_vars:
            return None
        domains: Domains = {}
        for v in range(self.ac3_vars):
            domains[v] = [self.placements[v].origin] if v < placed else list(self.ac3_origins)
        res = ac3(self.ac3_csp, domains)
        if not res.consistent:
            return None
        return set(res.domains[placed])

    def _best_subset(self, info: _NetworkInfo, gen: int) -> Tuple[List[str], int]:
        key = (info.net_id, gen)
        cached = self._knapsack_cache.get(key)
        if cached is not None:
            return cached

        best_subset: List[str] = []
        best_score = -1
        best_demand = 0

        n = len(info.buildings)
        for mask in range(1 << n):
            demand = 0
            score = 0
            ids: List[str] = []
            for i in range(n):
                if mask & (1 << i):
                    demand += info.demands[i]
                    score += info.buildings[i].score
                    ids.append(info.buildings[i].id)

            if demand <= gen and (
                score > best_score or (score == best_score and demand < best_demand)
            ):
                best_score = score
                best_demand = demand
                best_subset = ids

        result = (best_subset, best_demand)
        self._knapsack_cache[key] = result
        return result

    def _solve_activation(self) -> _Activation:
        active_ids: List[str] = []
        capacities: List[NetworkCapacity] = []

        for info in self.networks:
            gen = self.net_gen.get(info.net_id, 0)

            if gen >= info.total_demand:
                active_ids.extend(b.id for b in info.buildings)
                capacities.append(
                    NetworkCapacity(info.net_id, gen, info.total_demand, gen - info.total_demand)
                )
            else:
                subset, used = self._best_subset(info, gen)
                active_ids.extend(subset)
                capacities.append(NetworkCapacity(info.net_id, gen, used, gen - used))

        powered = list(dict.fromkeys(active_ids))
        sim = compute_live_star_state(
            self.level_index.level, self.level_index.building_definitions, set(powered)
        )
        return _Activation(
            active_building_ids=active_ids,
            powered_building_ids=powered,
            score=sim.current_score,
            stars=sim.star_count,
            is_complete=sim.star1_satisfied,
            network_capacities=capacities,
        )

    def _ordered_candidates(self, min_cand_index: int) -> List[int]:
        if self.algorithm == "backtracking":
            return list(range(min_cand_index, len(self.candidates)))

        priorities: List[Tuple[int, int, List[int]]] = []
        forward_checking = self.algorithm == "mrv_forward_checking"

        for info in self.networks:
            current_gen = self.net_gen.get(info.net_id, 0)
            deficit = max(0, info.total_demand - current_gen)
            indices = [i for i in self.net_candidates.get(info.net_id, []) if i >= min_cand_index]

            if forward_checking and current_gen >= info.total_demand and info.total_demand > 0:
                indices = []

            priorities.append((len(indices), deficit, indices))

        priorities.sort(key=lambda p: (p[0], -p[1]))

        ordered: List[int] = []
        for _, _, indices in priorities:
            ordered.extend(indices)

        if self.algorithm == "mrv_ac3":
            allowed = self._ac3_allowed()
            if allowed is None:
                return []
            ordered = [i for i in ordered if self.candidates[i].origin in allowed]
        return ordered

    def _elapsed_ms(self) -> float:
        return time.perf_counter() * 1000.0 - self.start_time

    def _backtrack(self, placed_count: int, min_cand_index: int) -> bool:
        self.nodes_visited += 1

        if self._elapsed_ms() > self.timeout_ms:
            self.is_timeout = True
            return True

        ev = self._solve_activation()
        if ev.is_complete:
            if (
                self.best_solution is None
                or ev.score > self.best_score
                or (ev.score == self.best_score and ev.stars > self.best_solution.stars)
            ):
                self.best_score = ev.score
                self.best_solution = Solution(
                    generators=[PlacedGenerator(p.type_id, p.origin) for p in self.placements],
                    active_building_ids=ev.active_building_ids,
                    powered_building_ids=ev.powered_building_ids,
                    network_capacities=ev.network_capacities,
                    score=ev.score,
                    stars=ev.stars,
                    is_complete=ev.is_complete,
                )

                if self.mode == "feasibility":
                    return True
                if ev.stars == 3:
                    return True

        if placed_count >= self.inventory_count:
            return False

        for cand_idx in self._ordered_candidates(min_cand_index):
            cand = self.candidates[cand_idx]
            footprint = get_footprint_cells(cand.origin, self.gen_def.width, self.gen_def.height)

            if any(cell in self.occupied for cell in footprint):
                continue

            self.occupied.update(footprint)
            self.placements.append(PlacedGenerator("generator", cand.origin))
            self.net_gen[cand.network_id] = (
                self.net_gen.get(cand.network_id, 0) + self.gen_def.output
            )

            if self._backtrack(placed_count + 1, cand_idx + 1):
                return True

            self.backtracks += 1
            self.occupied.difference_update(footprint)
            self.placements.pop()
            self.net_gen[cand.network_id] -= self.gen_def.output

        return False

    def run(self) -> SolverResult:
        self._backtrack(0, 0)
        duration_ms = _js_round(self._elapsed_ms())

        stats = BenchmarkStats(
            algorithm=self.algorithm,
            nodes_visited=self.nodes_visited,
            backtracks=self.backtracks,
            duration_ms=duration_ms,
            solution_found=self.best_solution is not None,
            score=self.best_score if self.best_score >= 0 else 0,
            is_timeout=self.is_timeout,
        )
        return SolverResult(stats=stats, solution=self.best_solution)

def solve_csp_level(
    level_index: LevelIndex,
    algorithm: Optional[SolverAlgorithm] = None,
    mode: Optional[SolverMode] = None,
    timeout_ms: Optional[float] = None,
) -> SolverResult:
    algorithm = algorithm or "mrv_forward_checking"
    mode = mode or "optimization"
    if timeout_ms is None:
        timeout_ms = 5000 if mode == "feasibility" else 15000
    return _CSPSearch(level_index, algorithm, mode, timeout_ms).run()


def run_csp_benchmark_comparison(
    level_index: LevelIndex, mode: SolverMode = "optimization"
) -> SolverResult:
    algorithms: List[SolverAlgorithm] = list(ALGORITHMS)

    comparison: List[BenchmarkStats] = []
    best: Optional[SolverResult] = None

    for algo in algorithms:
        res = solve_csp_level(level_index, algorithm=algo, mode=mode)
        comparison.append(res.stats)
        if best is None or (res.solution and not best.solution):
            best = res
        elif res.solution and best.solution and res.solution.score > best.solution.score:
            best = res

    return SolverResult(
        stats=best.stats if best else comparison[-1],
        solution=best.solution if best else None,
        comparison=comparison,
    )

"""Checker konsistensi CSP Blackout City: node (k=1), arc (k=2) dan path (k=3).

Model CSP yang dicek sama dengan solver.py (hanya constraint keras):
  Variabel : G1..Gn, satu per generator di inventory.
  Domain   : semua origin (x, y) di grid tempat footprint generator muat.
  Unary    : footprint tidak menimpa jalan/terrain/bangunan dan menyentuh
             tepat 1 jaringan jalan (aturan yang sama dengan domain.py).
  Binary   : untuk i < j -> urutan(Gi) < urutan(Gj), urutan = baris lalu kolom
             (symmetry breaking di solver), dan footprint Gi, Gj tidak bertabrakan.

Definisi (materi CSP, hal. 43 dan 49):
  1-consistency (node) : setiap nilai di domain memenuhi constraint unary.
  2-consistency (arc)  : untuk setiap nilai Xi selalu ada nilai Xj yang konsisten.
  3-consistency (path) : untuk setiap pasangan nilai (Xi, Xj) yang konsisten,
                         setiap variabel ketiga Xk punya nilai yang konsisten
                         dengan keduanya.
  Strongly k-consistent: j-consistent untuk semua j = 1..k.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Any, Dict, FrozenSet, List, Optional, Tuple

from .connectivity import LevelIndex
from .footprint import get_footprint_boundary_neighbors, get_footprint_cells
from .models import BuildingDefinition, Coordinate

DEFAULT_GENERATOR = BuildingDefinition(
    name="Generator", category="generator", width=1, height=1, demand=0, output=5
)

Domains = Dict[int, List[Coordinate]]


class GeneratorCSP:
    """Representasi CSP penempatan generator untuk satu level."""

    def __init__(
        self, level_index: LevelIndex, gen_width: int, gen_height: int, n_vars: int
    ) -> None:
        self.level_index = level_index
        self.gen_width = gen_width
        self.gen_height = gen_height
        self.n_vars = n_vars
        self._fp_cache: Dict[Coordinate, FrozenSet[Coordinate]] = {}

    @property
    def variables(self) -> List[str]:
        return [f"G{i + 1}" for i in range(self.n_vars)]

    def name(self, var: int) -> str:
        return f"G{var + 1}"

    def footprint(self, origin: Coordinate) -> FrozenSet[Coordinate]:
        fp = self._fp_cache.get(origin)
        if fp is None:
            fp = frozenset(get_footprint_cells(origin, self.gen_width, self.gen_height))
            self._fp_cache[origin] = fp
        return fp

    def raw_domain(self) -> List[Coordinate]:
        lvl = self.level_index.level
        return [
            Coordinate(x, y)
            for y in range(lvl.grid_height - self.gen_height + 1)
            for x in range(lvl.grid_width - self.gen_width + 1)
        ]

    def raw_domains(self) -> Domains:
        raw = self.raw_domain()
        return {v: list(raw) for v in range(self.n_vars)}

    def unary_violation(self, origin: Coordinate) -> Optional[str]:
        """None jika origin lolos constraint unary, selain itu alasan penolakan."""
        occupied = self.level_index.occupied_cells
        for cell in self.footprint(origin):
            if cell in occupied:
                return f"menimpa {occupied[cell]}"
        nets = self.touching_networks(origin)
        if not nets:
            return "tidak menyentuh jalan"
        if len(nets) > 1:
            return "menyentuh >1 jaringan"
        return None

    def touching_networks(self, origin: Coordinate) -> set:
        road = self.level_index.road_cell_to_component_id
        return {
            road[n]
            for n in get_footprint_boundary_neighbors(origin, self.gen_width, self.gen_height)
            if n in road
        }

    def binary_ok(self, i: int, a: Coordinate, j: int, b: Coordinate) -> bool:
        """Constraint biner antara Gi=a dan Gj=b (i != j)."""
        ka, kb = (a.y, a.x), (b.y, b.x)
        if i < j:
            if not ka < kb:
                return False
        elif not kb < ka:
            return False
        return not (self.footprint(a) & self.footprint(b))


def build_generator_csp(level_index: LevelIndex, n_vars: Optional[int] = None) -> GeneratorCSP:
    defs = level_index.building_definitions
    gen = defs.get("generator") or DEFAULT_GENERATOR
    if n_vars is None:
        n_vars = level_index.level.inventory.get("generator", 0)
    return GeneratorCSP(level_index, gen.width, gen.height, n_vars)


# ---------------------------------------------------------------------------
# k = 1 : Node consistency
# ---------------------------------------------------------------------------

@dataclass
class NodeConsistencyResult:
    domains: Domains
    removed_by_reason: Dict[str, int]


def node_consistency(csp: GeneratorCSP, domains: Optional[Domains] = None) -> NodeConsistencyResult:
    """Buang nilai yang melanggar constraint unary dari setiap domain."""
    domains = domains if domains is not None else csp.raw_domains()
    reasons: Dict[str, int] = {}
    result: Domains = {}
    verdict: Dict[Coordinate, Optional[str]] = {}
    for var, values in domains.items():
        kept = []
        for v in values:
            if v not in verdict:
                verdict[v] = csp.unary_violation(v)
                if verdict[v] is not None:
                    reasons[verdict[v]] = reasons.get(verdict[v], 0) + 1
            if verdict[v] is None:
                kept.append(v)
        result[var] = kept
    return NodeConsistencyResult(result, reasons)


def node_violations(
    csp: GeneratorCSP, domains: Domains, limit: Optional[int] = None
) -> List[Tuple[int, Coordinate, str]]:
    out: List[Tuple[int, Coordinate, str]] = []
    for var, values in domains.items():
        for v in values:
            reason = csp.unary_violation(v)
            if reason is not None:
                out.append((var, v, reason))
                if limit is not None and len(out) >= limit:
                    return out
    return out


# ---------------------------------------------------------------------------
# k = 2 : Arc consistency (AC-3)
# ---------------------------------------------------------------------------

@dataclass
class AC3Result:
    consistent: bool
    domains: Domains
    revisions: int
    removed: Dict[int, List[Coordinate]] = field(default_factory=dict)
    wiped_out: Optional[int] = None


def revise(csp: GeneratorCSP, domains: Domains, i: int, j: int) -> List[Coordinate]:
    """REVISE(Xi, Xj): hapus nilai Xi yang tidak punya pasangan di Xj."""
    removed = [
        a for a in domains[i] if not any(csp.binary_ok(i, a, j, b) for b in domains[j])
    ]
    if removed:
        drop = set(removed)
        domains[i] = [a for a in domains[i] if a not in drop]
    return removed


def ac3(
    csp: GeneratorCSP,
    domains: Domains,
    arcs: Optional[List[Tuple[int, int]]] = None,
) -> AC3Result:
    """AC-3. Domain input tidak diubah; hasil pruning ada di AC3Result.domains."""
    doms: Domains = {k: list(v) for k, v in domains.items()}
    removed: Dict[int, List[Coordinate]] = {k: [] for k in doms}
    if arcs is None:
        arcs = [(i, j) for i in doms for j in doms if i != j]
    queue = deque(arcs)
    in_queue = set(arcs)
    revisions = 0

    for var, values in doms.items():
        if not values:
            return AC3Result(False, doms, revisions, removed, var)

    while queue:
        i, j = queue.popleft()
        in_queue.discard((i, j))
        revisions += 1
        dropped = revise(csp, doms, i, j)
        if not dropped:
            continue
        removed[i].extend(dropped)
        if not doms[i]:
            return AC3Result(False, doms, revisions, removed, i)
        for k in doms:
            if k != i and k != j and (k, i) not in in_queue:
                queue.append((k, i))
                in_queue.add((k, i))

    return AC3Result(True, doms, revisions, removed, None)


def arc_violations(
    csp: GeneratorCSP, domains: Domains, limit: Optional[int] = None
) -> List[Tuple[int, Coordinate, int]]:
    """(i, a, j): nilai Gi=a tidak punya pasangan konsisten di Gj."""
    out: List[Tuple[int, Coordinate, int]] = []
    for i in domains:
        for j in domains:
            if i == j:
                continue
            for a in domains[i]:
                if not any(csp.binary_ok(i, a, j, b) for b in domains[j]):
                    out.append((i, a, j))
                    if limit is not None and len(out) >= limit:
                        return out
    return out


# ---------------------------------------------------------------------------
# k = 3 : Path consistency
# ---------------------------------------------------------------------------

def path_violations(
    csp: GeneratorCSP, domains: Domains, limit: Optional[int] = None
) -> List[Tuple[int, Coordinate, int, Coordinate, int]]:
    """(i, a, j, b, k): Gi=a dan Gj=b konsisten, tapi Gk tidak punya nilai yang cocok."""
    out: List[Tuple[int, Coordinate, int, Coordinate, int]] = []
    vars_ = sorted(domains)
    for p, i in enumerate(vars_):
        for j in vars_[p + 1:]:
            for a in domains[i]:
                for b in domains[j]:
                    if not csp.binary_ok(i, a, j, b):
                        continue
                    for k in vars_:
                        if k in (i, j):
                            continue
                        if not any(
                            csp.binary_ok(i, a, k, c) and csp.binary_ok(j, b, k, c)
                            for c in domains[k]
                        ):
                            out.append((i, a, j, b, k))
                            if limit is not None and len(out) >= limit:
                                return out
    return out


# ---------------------------------------------------------------------------
# Wrapper k-consistency
# ---------------------------------------------------------------------------

def k_consistency_violations(
    csp: GeneratorCSP, domains: Domains, k: int, limit: Optional[int] = None
) -> list:
    if k == 1:
        return node_violations(csp, domains, limit)
    if k == 2:
        return arc_violations(csp, domains, limit)
    if k == 3:
        return path_violations(csp, domains, limit)
    raise ValueError("k hanya didukung untuk 1 (node), 2 (arc), 3 (path)")


def is_k_consistent(csp: GeneratorCSP, domains: Domains, k: int) -> bool:
    return not k_consistency_violations(csp, domains, k, limit=1)


def is_strongly_k_consistent(csp: GeneratorCSP, domains: Domains, k: int) -> bool:
    return all(is_k_consistent(csp, domains, j) for j in range(1, k + 1))


def strong_consistency_level(csp: GeneratorCSP, domains: Domains, max_k: int = 3) -> int:
    """k terbesar (<= max_k) sehingga CSP strongly k-consistent, 0 jika bukan 1-consistent."""
    level = 0
    for k in range(1, max_k + 1):
        if not is_k_consistent(csp, domains, k):
            break
        level = k
    return level


def format_violation(csp: GeneratorCSP, k: int, v: tuple) -> str:
    def c(p: Coordinate) -> str:
        return f"({p.x},{p.y})"

    if k == 1:
        var, val, reason = v
        return f"{csp.name(var)}={c(val)} {reason}"
    if k == 2:
        i, a, j = v
        return f"{csp.name(i)}={c(a)} tidak punya pasangan di {csp.name(j)}"
    i, a, j, b, kk = v
    return (
        f"{csp.name(i)}={c(a)} & {csp.name(j)}={c(b)} konsisten, "
        f"tapi {csp.name(kk)} tidak punya nilai yang cocok"
    )


# ---------------------------------------------------------------------------
# Laporan per level
# ---------------------------------------------------------------------------

@dataclass
class StageReport:
    name: str
    domain_sizes: Dict[str, int]
    k_consistent: Dict[int, bool]
    strong_k: int
    violation_counts: Dict[int, int]
    examples: Dict[int, List[str]]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "domainSizes": self.domain_sizes,
            "kConsistent": self.k_consistent,
            "strongK": self.strong_k,
            "violationCounts": self.violation_counts,
            "examples": self.examples,
        }


@dataclass
class ConsistencyReport:
    level_id: str
    variables: List[str]
    raw_domain_size: int
    node_removed_by_reason: Dict[str, int]
    ac3_consistent: bool
    ac3_revisions: int
    ac3_removed: Dict[str, List[Tuple[int, int]]]
    ac3_wiped_out: Optional[str]
    stages: List[StageReport]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "levelId": self.level_id,
            "variables": self.variables,
            "rawDomainSize": self.raw_domain_size,
            "nodeRemovedByReason": self.node_removed_by_reason,
            "ac3": {
                "consistent": self.ac3_consistent,
                "revisions": self.ac3_revisions,
                "removed": self.ac3_removed,
                "wipedOut": self.ac3_wiped_out,
            },
            "stages": [s.to_dict() for s in self.stages],
        }


def _stage(
    csp: GeneratorCSP, name: str, domains: Domains, examples: int, max_k: int
) -> StageReport:
    k_ok: Dict[int, bool] = {}
    counts: Dict[int, int] = {}
    ex: Dict[int, List[str]] = {}
    for k in range(1, max_k + 1):
        viol = k_consistency_violations(csp, domains, k)
        k_ok[k] = not viol
        counts[k] = len(viol)
        ex[k] = [format_violation(csp, k, v) for v in viol[:examples]]
    strong = 0
    for k in range(1, max_k + 1):
        if not k_ok[k]:
            break
        strong = k
    return StageReport(
        name=name,
        domain_sizes={csp.name(v): len(vals) for v, vals in domains.items()},
        k_consistent=k_ok,
        strong_k=strong,
        violation_counts=counts,
        examples=ex,
    )


def check_level_consistency(
    level_index: LevelIndex, examples: int = 3, max_k: int = 3
) -> ConsistencyReport:
    """Cek k-consistency (k=1..max_k) di 3 tahap: domain mentah, setelah NC, setelah AC-3."""
    csp = build_generator_csp(level_index)
    raw = csp.raw_domains()
    nc = node_consistency(csp, raw)
    ac = ac3(csp, nc.domains)

    stages = [
        _stage(csp, "raw", raw, examples, max_k),
        _stage(csp, "node", nc.domains, examples, max_k),
        _stage(csp, "ac3", ac.domains, examples, max_k),
    ]
    return ConsistencyReport(
        level_id=level_index.level.id,
        variables=csp.variables,
        raw_domain_size=len(csp.raw_domain()),
        node_removed_by_reason=nc.removed_by_reason,
        ac3_consistent=ac.consistent,
        ac3_revisions=ac.revisions,
        ac3_removed={
            csp.name(v): [(p.x, p.y) for p in vals] for v, vals in ac.removed.items()
        },
        ac3_wiped_out=csp.name(ac.wiped_out) if ac.wiped_out is not None else None,
        stages=stages,
    )

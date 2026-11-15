import type { LevelIndex } from "../connectivity/networkAssignment";
import type { Coordinate } from "../../types";
import { cellKey, getFootprintCells } from "../grid/footprint";
import { computeLiveStarState } from "../objectives/objectiveEvaluator";
import { getConnectedGeneratorCandidates } from "./domain";
import type {
  CSPSolverAlgorithm,
  CSPSolverMode,
  CSPSolution,
  CSPBenchmarkStats,
  CSPSolverResult,
} from "./types";

interface InternalState {
  nodesVisited: number;
  backtracks: number;
  startTime: number;
  timeoutMs: number;
  isTimeout: boolean;
  bestSolution: CSPSolution | null;
  bestScore: number;
}

/**
 * Solve optimal building activation subset for given network capacities.
 */
function solveActivationForCapacities(
  levelIndex: LevelIndex,
  netGenMap: Map<string, number>,
): {
  activeBuildingIds: string[];
  poweredBuildingIds: string[];
  score: number;
  stars: number;
  isComplete: boolean;
  networkCapacities: {
    networkId: string;
    generation: number;
    demand: number;
    remaining: number;
  }[];
} {
  const activeBuildingIds: string[] = [];
  const networkCapacities: {
    networkId: string;
    generation: number;
    demand: number;
    remaining: number;
  }[] = [];

  for (const comp of levelIndex.roadComponents) {
    const netId = comp.id;
    const gen = netGenMap.get(netId) ?? 0;
    const netBuildings = levelIndex.level.buildings.filter(
      (b) => levelIndex.buildingToNetworkId.get(b.id) === netId,
    );

    let totalDemand = 0;
    for (const b of netBuildings) {
      const def = levelIndex.buildingDefinitions[b.variant];
      totalDemand += def ? def.demand : 0;
    }

    if (gen >= totalDemand) {
      // Power all buildings in this network
      for (const b of netBuildings) activeBuildingIds.push(b.id);
      networkCapacities.push({
        networkId: netId,
        generation: gen,
        demand: totalDemand,
        remaining: gen - totalDemand,
      });
    } else {
      // Knapsack subset of buildings to maximize score within generation capacity
      let bestSubset: string[] = [];
      let bestSubsetScore = -1;
      let bestSubsetDemand = 0;

      const n = netBuildings.length;
      const numCombos = 1 << n;
      for (let mask = 0; mask < numCombos; mask++) {
        let currentDemand = 0;
        let currentScore = 0;
        const currentIds: string[] = [];

        for (let i = 0; i < n; i++) {
          if (mask & (1 << i)) {
            const b = netBuildings[i];
            const def = levelIndex.buildingDefinitions[b.variant];
            const dem = def ? def.demand : 0;
            currentDemand += dem;
            currentScore += b.score;
            currentIds.push(b.id);
          }
        }

        if (currentDemand <= gen) {
          if (
            currentScore > bestSubsetScore ||
            (currentScore === bestSubsetScore &&
              currentDemand < bestSubsetDemand)
          ) {
            bestSubsetScore = currentScore;
            bestSubsetDemand = currentDemand;
            bestSubset = currentIds;
          }
        }
      }

      for (const id of bestSubset) activeBuildingIds.push(id);
      networkCapacities.push({
        networkId: netId,
        generation: gen,
        demand: bestSubsetDemand,
        remaining: gen - bestSubsetDemand,
      });
    }
  }

  const activeSet = new Set(activeBuildingIds);
  const sim = computeLiveStarState(
    levelIndex.level,
    levelIndex.buildingDefinitions,
    activeSet,
  );

  return {
    activeBuildingIds,
    poweredBuildingIds: Array.from(activeSet),
    score: sim.currentScore,
    stars: sim.starCount,
    isComplete: sim.star1Satisfied,
    networkCapacities,
  };
}

export function solveCSPLevel(
  levelIndex: LevelIndex,
  options: {
    algorithm?: CSPSolverAlgorithm;
    mode?: CSPSolverMode;
    timeoutMs?: number;
  } = {},
): CSPSolverResult {
  const algorithm = options.algorithm ?? "mrv_forward_checking";
  const mode = options.mode ?? "optimization";
  const timeoutMs =
    options.timeoutMs ?? (mode === "feasibility" ? 5000 : 15000);

  const genDef = levelIndex.buildingDefinitions["generator"] ?? {
    width: 1,
    height: 1,
    output: 5,
  };
  const inventoryCount = levelIndex.level.inventory["generator"] ?? 0;

  const candidates = getConnectedGeneratorCandidates(
    levelIndex,
    genDef.width,
    genDef.height,
  );

  const internal: InternalState = {
    nodesVisited: 0,
    backtracks: 0,
    startTime: performance.now(),
    timeoutMs,
    isTimeout: false,
    bestSolution: null,
    bestScore: -1,
  };

  // Group candidate indices by network for MRV & forward checking
  const netCandidatesMap = new Map<string, number[]>();
  for (const comp of levelIndex.roadComponents) {
    netCandidatesMap.set(comp.id, []);
  }
  candidates.forEach((cand, idx) => {
    const list = netCandidatesMap.get(cand.networkId);
    if (list) list.push(idx);
  });

  const occupiedSet = new Set<string>();
  const currentPlacements: { typeId: string; origin: Coordinate }[] = [];
  const currentNetGen = new Map<string, number>();
  for (const comp of levelIndex.roadComponents) {
    currentNetGen.set(comp.id, 0);
  }

  // Pre-calculate total maximum score possible
  let maxPossibleScore = 0;
  for (const b of levelIndex.level.buildings) maxPossibleScore += b.score;

  function backtrack(placedCount: number, minCandIndex: number): boolean {
    internal.nodesVisited++;

    if (performance.now() - internal.startTime > internal.timeoutMs) {
      internal.isTimeout = true;
      return true; // Halt search on timeout
    }

    // Evaluate current placement
    const evalRes = solveActivationForCapacities(levelIndex, currentNetGen);
    if (evalRes.isComplete) {
      if (
        !internal.bestSolution ||
        evalRes.score > internal.bestScore ||
        (evalRes.score === internal.bestScore &&
          evalRes.stars > internal.bestSolution.stars)
      ) {
        internal.bestScore = evalRes.score;
        internal.bestSolution = {
          generators: currentPlacements.map((p) => ({ ...p })),
          activeBuildingIds: evalRes.activeBuildingIds,
          poweredBuildingIds: evalRes.poweredBuildingIds,
          networkCapacities: evalRes.networkCapacities,
          score: evalRes.score,
          stars: evalRes.stars,
          isComplete: evalRes.isComplete,
        };

        // If feasibility mode, stop at first valid solution
        if (mode === "feasibility") {
          return true;
        }

        // If full 3-star max score reached in optimization mode, we can terminate early
        if (evalRes.score >= maxPossibleScore && evalRes.stars === 3) {
          return true;
        }
      }
    }

    // Base condition: all inventory generators placed
    if (placedCount >= inventoryCount) {
      return false;
    }

    // Determine candidate ordering based on algorithm
    let candidateIndices: number[] = [];

    if (algorithm === "backtracking") {
      // Pure sequential backtracking
      for (let i = minCandIndex; i < candidates.length; i++) {
        candidateIndices.push(i);
      }
    } else if (algorithm === "mrv") {
      // MRV heuristic: order networks by smallest remaining deficit / most constrained
      const networkDeficits: {
        netId: string;
        deficit: number;
        count: number;
      }[] = [];
      for (const comp of levelIndex.roadComponents) {
        const netId = comp.id;
        const netBuildings = levelIndex.level.buildings.filter(
          (b) => levelIndex.buildingToNetworkId.get(b.id) === netId,
        );
        let demand = 0;
        for (const b of netBuildings) {
          const def = levelIndex.buildingDefinitions[b.variant];
          demand += def ? def.demand : 0;
        }
        const currentGen = currentNetGen.get(netId) ?? 0;
        const deficit = Math.max(0, demand - currentGen);
        const availCands = (netCandidatesMap.get(netId) ?? []).filter(
          (cIdx) => cIdx >= minCandIndex,
        ).length;
        networkDeficits.push({ netId, deficit, count: availCands });
      }

      // Sort by fewest available candidate spots first (classic MRV), then deficit
      networkDeficits.sort(
        (a, b) => a.count - b.count || b.deficit - a.deficit,
      );

      for (const item of networkDeficits) {
        const list = netCandidatesMap.get(item.netId) ?? [];
        for (const cIdx of list) {
          if (cIdx >= minCandIndex) candidateIndices.push(cIdx);
        }
      }
    } else {
      // MRV with Forward Checking (pruning redundant capacity & impossible paths)
      const networkPriorities: {
        netId: string;
        deficit: number;
        count: number;
      }[] = [];
      for (const comp of levelIndex.roadComponents) {
        const netId = comp.id;
        const netBuildings = levelIndex.level.buildings.filter(
          (b) => levelIndex.buildingToNetworkId.get(b.id) === netId,
        );
        let demand = 0;
        for (const b of netBuildings) {
          const def = levelIndex.buildingDefinitions[b.variant];
          demand += def ? def.demand : 0;
        }
        const currentGen = currentNetGen.get(netId) ?? 0;
        const deficit = Math.max(0, demand - currentGen);

        // Forward check: if network already has surplus generation >= demand + generatorOutput,
        // adding more generators here is redundant and pruned
        const list = netCandidatesMap.get(netId) ?? [];
        const validIndices = list.filter((cIdx) => {
          if (cIdx < minCandIndex) return false;
          if (currentGen >= demand && demand > 0) return false; // Forward checking prune
          return true;
        });

        networkPriorities.push({
          netId,
          deficit,
          count: validIndices.length,
        });
      }

      // Sort MRV
      networkPriorities.sort(
        (a, b) => a.count - b.count || b.deficit - a.deficit,
      );

      for (const item of networkPriorities) {
        const list = netCandidatesMap.get(item.netId) ?? [];
        for (const cIdx of list) {
          if (cIdx >= minCandIndex) candidateIndices.push(cIdx);
        }
      }
    }

    // Symmetry breaking: try valid placements
    for (const candIdx of candidateIndices) {
      const cand = candidates[candIdx];
      const footprint = getFootprintCells(
        cand.origin,
        genDef.width,
        genDef.height,
      );

      let conflict = false;
      for (const cell of footprint) {
        if (occupiedSet.has(cellKey(cell))) {
          conflict = true;
          break;
        }
      }
      if (conflict) continue;

      // Assign variable
      for (const cell of footprint) occupiedSet.add(cellKey(cell));
      currentPlacements.push({ typeId: "generator", origin: cand.origin });
      currentNetGen.set(
        cand.networkId,
        (currentNetGen.get(cand.networkId) ?? 0) + genDef.output,
      );

      // Recurse
      const done = backtrack(placedCount + 1, candIdx + 1);
      if (done) return true;

      // Unassign & Backtrack
      internal.backtracks++;
      for (const cell of footprint) occupiedSet.delete(cellKey(cell));
      currentPlacements.pop();
      currentNetGen.set(
        cand.networkId,
        (currentNetGen.get(cand.networkId) ?? 0) - genDef.output,
      );
    }

    return false;
  }

  backtrack(0, 0);

  const durationMs = Math.round(performance.now() - internal.startTime);

  const stats: CSPBenchmarkStats = {
    algorithm,
    nodesVisited: internal.nodesVisited,
    backtracks: internal.backtracks,
    durationMs,
    solutionFound: internal.bestSolution !== null,
    score: internal.bestScore >= 0 ? internal.bestScore : 0,
    isTimeout: internal.isTimeout,
  };

  return {
    stats,
    solution: internal.bestSolution,
  };
}

/**
 * Runs all 3 CSP algorithms on the level to compare benchmark stats
 */
export function runCSPBenchmarkComparison(
  levelIndex: LevelIndex,
  mode: CSPSolverMode = "optimization",
): CSPSolverResult {
  const algorithms: CSPSolverAlgorithm[] = [
    "backtracking",
    "mrv",
    "mrv_forward_checking",
  ];

  const comparisonStats: CSPBenchmarkStats[] = [];
  let bestOverallResult: CSPSolverResult | null = null;

  for (const algo of algorithms) {
    const res = solveCSPLevel(levelIndex, { algorithm: algo, mode });
    comparisonStats.push(res.stats);
    if (!bestOverallResult || (res.solution && !bestOverallResult.solution)) {
      bestOverallResult = res;
    } else if (
      res.solution &&
      bestOverallResult.solution &&
      res.solution.score > bestOverallResult.solution.score
    ) {
      bestOverallResult = res;
    }
  }

  return {
    stats: bestOverallResult
      ? bestOverallResult.stats
      : comparisonStats[comparisonStats.length - 1],
    solution: bestOverallResult ? bestOverallResult.solution : null,
    comparison: comparisonStats,
  };
}

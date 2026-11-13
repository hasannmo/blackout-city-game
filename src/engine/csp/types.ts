import type { Coordinate } from "../../types";

export interface CSPPlacementCandidate {
  origin: Coordinate;
  networkId: string;
}

export type CSPSolverAlgorithm = "backtracking" | "mrv" | "mrv_forward_checking";
export type CSPSolverMode = "feasibility" | "optimization";

export interface CSPSolverOptions {
  algorithm: CSPSolverAlgorithm;
  mode: CSPSolverMode;
  timeoutMs?: number;
}

export interface CSPSolution {
  generators: { typeId: string; origin: Coordinate }[];
  activeBuildingIds: string[];
  poweredBuildingIds: string[];
  networkCapacities: {
    networkId: string;
    generation: number;
    demand: number;
    remaining: number;
  }[];
  score: number;
  stars: number;
  isComplete: boolean;
}

export interface CSPBenchmarkStats {
  algorithm: CSPSolverAlgorithm;
  nodesVisited: number;
  backtracks: number;
  durationMs: number;
  solutionFound: boolean;
  score: number;
  isTimeout: boolean;
}

export interface CSPSolverResult {
  stats: CSPBenchmarkStats;
  solution: CSPSolution | null;
  // Multi-algorithm comparison if run in benchmark mode
  comparison?: CSPBenchmarkStats[];
}

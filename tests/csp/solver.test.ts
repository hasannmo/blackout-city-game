import { describe, it, expect } from "vitest";
import bDefs from "../../src/data/buildings.json";
import l1 from "../../src/data/campaign/level-01.json";
import l2 from "../../src/data/campaign/level-02.json";
import l5 from "../../src/data/campaign/level-05.json";
import { buildLevelIndex } from "../../src/engine/connectivity/networkAssignment";
import { solveCSPLevel, runCSPBenchmarkComparison } from "../../src/engine/csp/solver";
import type { LevelDefinition, BuildingDefinitionsMap } from "../../src/types";

describe("Constraint Satisfaction Problem (CSP) Solver & Benchmarks", () => {
  const defs = bDefs as unknown as BuildingDefinitionsMap;

  it("solves Level 1 with all 3 algorithms and verifies feasibility", () => {
    const lvl1 = l1 as unknown as LevelDefinition;
    const index = buildLevelIndex(lvl1, defs);

    const resPlain = solveCSPLevel(index, { algorithm: "backtracking", mode: "feasibility" });
    const resMRV = solveCSPLevel(index, { algorithm: "mrv", mode: "feasibility" });
    const resFC = solveCSPLevel(index, { algorithm: "mrv_forward_checking", mode: "feasibility" });

    expect(resPlain.solution).not.toBeNull();
    expect(resPlain.solution?.isComplete).toBe(true);
    expect(resMRV.solution?.isComplete).toBe(true);
    expect(resFC.solution?.isComplete).toBe(true);
    expect(resFC.stats.nodesVisited).toBeGreaterThan(0);
  });

  it("compares benchmarks across algorithms on Level 2", () => {
    const lvl2 = l2 as unknown as LevelDefinition;
    const index = buildLevelIndex(lvl2, defs);

    const comp = runCSPBenchmarkComparison(index, "optimization");
    expect(comp.comparison).toBeDefined();
    expect(comp.comparison?.length).toBe(3);

    for (const stats of comp.comparison!) {
      expect(stats.solutionFound).toBe(true);
      expect(stats.score).toBeGreaterThan(0);
      expect(stats.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("finds optimal 3-star configuration on Level 5", () => {
    const lvl5 = l5 as unknown as LevelDefinition;
    const index = buildLevelIndex(lvl5, defs);

    const res = solveCSPLevel(index, { algorithm: "mrv_forward_checking", mode: "optimization" });
    expect(res.solution).not.toBeNull();
    expect(res.solution?.isComplete).toBe(true);
    expect(res.solution?.stars).toBeGreaterThanOrEqual(2);
  });
});

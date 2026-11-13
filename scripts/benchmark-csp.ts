import bDefs from "../src/data/buildings.json";
import l1 from "../src/data/campaign/level-01.json";
import l2 from "../src/data/campaign/level-02.json";
import l3 from "../src/data/campaign/level-03.json";
import l4 from "../src/data/campaign/level-04.json";
import l5 from "../src/data/campaign/level-05.json";
import l6 from "../src/data/campaign/level-06.json";
import l7 from "../src/data/campaign/level-07.json";
import l8 from "../src/data/campaign/level-08.json";
import l9 from "../src/data/campaign/level-09.json";
import l10 from "../src/data/campaign/level-10.json";
import { buildLevelIndex } from "../src/engine/connectivity/networkAssignment";
import { solveCSPLevel } from "../src/engine/csp/solver";
import type { LevelDefinition, BuildingDefinitionsMap } from "../src/types";
import type { CSPSolverAlgorithm } from "../src/engine/csp/types";

const levels = [l1, l2, l3, l4, l5, l6, l7, l8, l9, l10] as unknown as LevelDefinition[];
const defs = bDefs as unknown as BuildingDefinitionsMap;
const algorithms: CSPSolverAlgorithm[] = ["backtracking", "mrv", "mrv_forward_checking"];

console.log("==========================================================================================================");
console.log("                        BLACKOUT CITY - CSP ALGORITHMS ACADEMIC BENCHMARK                               ");
console.log("==========================================================================================================");
console.log("Level,Algorithm,DurationMs,NodesVisited,Backtracks,SolutionFound,Score");

const rows: string[] = [];
rows.push("Level,Algorithm,DurationMs,NodesVisited,Backtracks,SolutionFound,Score");

for (const lvl of levels) {
  const index = buildLevelIndex(lvl, defs);
  for (const algo of algorithms) {
    const res = solveCSPLevel(index, { algorithm: algo, mode: "optimization" });
    const line = `${lvl.id},${algo},${res.stats.durationMs},${res.stats.nodesVisited},${res.stats.backtracks},${res.stats.solutionFound},${res.stats.score}`;
    console.log(line);
    rows.push(line);
  }
}
console.log("==========================================================================================================");
console.log("Benchmark complete!");

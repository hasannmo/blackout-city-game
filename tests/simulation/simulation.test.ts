import { describe, it, expect } from "vitest";
import level1Data from "../../src/data/campaign/level-01.json";
import buildingDefinitions from "../../src/data/buildings.json";
import {
  LevelDefinitionSchema,
  BuildingDefinitionsMapSchema,
  type GameState,
} from "../../src/types";
import { buildLevelIndex } from "../../src/engine/connectivity/networkAssignment";
import { evaluatePlacement } from "../../src/engine/placement/evaluatePlacement";
import { placeGenerator } from "../../src/engine/placement/generatorActions";
import { computeCapacityReport } from "../../src/engine/simulation/capacity";
import { enterActivation } from "../../src/engine/simulation/activation";
import { runSimulation } from "../../src/engine/simulation/runSimulation";
import {
  computeLiveStarState,
  getObjectiveDescription,
} from "../../src/engine/objectives/objectiveEvaluator";

describe("Level 1: 4x4 Grid with House, Tree, L-Road Layout & 5-Zap Generator", () => {
  it("validates 4x4 level 1 JSON against schemas", () => {
    const parsedLevel = LevelDefinitionSchema.parse(level1Data);
    const parsedBuildings =
      BuildingDefinitionsMapSchema.parse(buildingDefinitions);
    expect(parsedLevel.id).toBe("level-01");
    expect(parsedLevel.grid.width).toBe(4);
    expect(parsedLevel.grid.height).toBe(4);
    expect(parsedBuildings.generator.output).toBe(5);
  });

  it("verifies level 1 layout and connectivity with e | r | e | e on last row", () => {
    const index = buildLevelIndex(level1Data as any, buildingDefinitions as any);
    // 4 road cells: (1,2), (2,2), (3,2) and (1,3) connected together in one single network A
    expect(index.roadComponents).toHaveLength(1);
    expect(index.roadComponents[0].id).toBe("A");
    expect(index.roadComponents[0].cells).toHaveLength(4);

    // House at (2,1) is adjacent to road at (2,2) -> assigned to network A
    expect(index.buildingToNetworkId.get("b1")).toBe("A");
  });

  it("tracks dynamic star requirements: 1 star for building objective, 2 and 3 stars for score", () => {
    const parsedLevel = LevelDefinitionSchema.parse(level1Data);
    const parsedBuildings =
      BuildingDefinitionsMapSchema.parse(buildingDefinitions);

    const desc = getObjectiveDescription(
      parsedLevel.objective,
    );
    expect(desc).toBe("Power all buildings in the district");

    // Initially with 0 powered buildings: 0 stars
    const initialStars = computeLiveStarState(
      parsedLevel,
      parsedBuildings,
      new Set(),
    );
    expect(initialStars.star1Satisfied).toBe(false);
    expect(initialStars.star2Satisfied).toBe(false);
    expect(initialStars.star3Satisfied).toBe(false);
    expect(initialStars.starCount).toBe(0);

    // When house 'b1' is powered (score 10): 1-star (objective) satisfied, and 2-star (10 pts) + 3-star (10 pts) light up
    const poweredStars = computeLiveStarState(
      parsedLevel,
      parsedBuildings,
      new Set(["b1"]),
    );
    expect(poweredStars.star1Satisfied).toBe(true);
    expect(poweredStars.star2Satisfied).toBe(true);
    expect(poweredStars.star3Satisfied).toBe(true);
    expect(poweredStars.starCount).toBe(3);
  });

  it("successfully places generator (output 5 zap) and powers the house", () => {
    const index = buildLevelIndex(level1Data as any, buildingDefinitions as any);
    let state: GameState = {
      phase: "placement",
      generators: [],
      activeBuildingIds: new Set(),
      result: null,
    };

    // Place generator at (0, 2) adjacent to road cell (1, 2) in network A
    const evalRes = evaluatePlacement(
      index,
      state.generators,
      "generator",
      { x: 0, y: 2 },
    );
    expect(evalRes.valid).toBe(true);
    if (evalRes.valid) {
      expect(evalRes.connected).toBe(true);
      expect(evalRes.networkId).toBe("A");
    }

    const placeRes = placeGenerator(index, state, "generator", {
      x: 0,
      y: 2,
    });
    expect(placeRes.success).toBe(true);
    if (placeRes.success) state = placeRes.newState;

    // Check capacity: Network A output is 5 zap, demand is 2 zap -> surplus +3 zap, canPowerAll = true
    const cap = computeCapacityReport(index, state);
    expect(cap.get("A")?.generation).toBe(5);
    expect(cap.get("A")?.demand).toBe(2);
    expect(cap.get("A")?.surplus).toBe(3);
    expect(cap.get("A")?.canPowerAll).toBe(true);

    // Enter activation -> auto-powers house 'b1'
    state = enterActivation(index, state);
    expect(state.phase).toBe("activation");
    expect(state.activeBuildingIds.has("b1")).toBe(true);

    // Run simulation
    const sim = runSimulation(index, state);
    expect(sim.completed).toBe(true);
    expect(sim.mandatoryMet).toBe(true);
    expect(sim.score).toBe(10);
    expect(sim.stars).toBe(3);
  });
});

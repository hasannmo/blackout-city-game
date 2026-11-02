import { describe, it, expect } from "vitest";
import level1Data from "../../src/data/campaign/level-01.json";
import level2Data from "../../src/data/campaign/level-02.json";
import level3Data from "../../src/data/campaign/level-03.json";
import level4Data from "../../src/data/campaign/level-04.json";
import level5Data from "../../src/data/campaign/level-05.json";
import buildingDefinitions from "../../src/data/buildings.json";
import {
  LevelDefinitionSchema,
  BuildingDefinitionsMapSchema,
  type GameState,
} from "../../src/types";
import { buildLevelIndex } from "../../src/engine/connectivity/networkAssignment";
import { placeGenerator } from "../../src/engine/placement/generatorActions";
import { computeCapacityReport } from "../../src/engine/simulation/capacity";
import { enterActivation } from "../../src/engine/simulation/activation";
import { runSimulation } from "../../src/engine/simulation/runSimulation";

describe("Campaign Levels 1 through 5 Validation & Gameplay", () => {
  const levels = [level1Data, level2Data, level3Data, level4Data, level5Data];

  it("validates all 5 campaign levels against Zod schemas", () => {
    const parsedBuildings = BuildingDefinitionsMapSchema.parse(buildingDefinitions);
    expect(parsedBuildings.house.demand).toBe(2);
    expect(parsedBuildings.generator.output).toBe(5);

    levels.forEach((lvl, idx) => {
      const parsed = LevelDefinitionSchema.parse(lvl);
      expect(parsed.id).toBe(`level-0${idx + 1}`);
      // All buildings are exclusively houses
      expect(parsed.buildings.every((b) => b.variant === "house")).toBe(true);
      // Inventory uses only plain 1x1 generators
      expect(Object.keys(parsed.inventory)).toEqual(["generator"]);
    });
  });

  it("verifies multi-network independence across levels 2, 3, 4, 5", () => {
    // Level 2 has 2 road systems (A and B)
    const idx2 = buildLevelIndex(level2Data as any, buildingDefinitions as any);
    expect(idx2.roadComponents).toHaveLength(2);
    expect(idx2.roadComponents.map((c) => c.id)).toEqual(["A", "B"]);

    // Level 3 has 2 road systems
    const idx3 = buildLevelIndex(level3Data as any, buildingDefinitions as any);
    expect(idx3.roadComponents).toHaveLength(2);

    // Level 4 has 3 road systems (A, B, C)
    const idx4 = buildLevelIndex(level4Data as any, buildingDefinitions as any);
    expect(idx4.roadComponents).toHaveLength(3);
    expect(idx4.roadComponents.map((c) => c.id)).toEqual(["A", "B", "C"]);

    // Level 5 has 4 road systems (A, B, C, D)
    const idx5 = buildLevelIndex(level5Data as any, buildingDefinitions as any);
    expect(idx5.roadComponents).toHaveLength(4);
    expect(idx5.roadComponents.map((c) => c.id)).toEqual(["A", "B", "C", "D"]);
  });

  it("verifies Level 2 3-star solution path", () => {
    const index = buildLevelIndex(level2Data as any, buildingDefinitions as any);
    let state: GameState = {
      phase: "placement",
      generators: [],
      activeBuildingIds: new Set(),
      result: null,
    };

    // Place generator on network A at (2, 0) adjacent to road (2, 1)
    const p1 = placeGenerator(index, state, "generator", { x: 2, y: 0 });
    expect(p1.success).toBe(true);
    if (p1.success) state = p1.newState;

    // Place generator on network B at (1, 4) adjacent to road (1, 3)
    const p2 = placeGenerator(index, state, "generator", { x: 1, y: 4 });
    expect(p2.success).toBe(true);
    if (p2.success) state = p2.newState;

    // Check capacity: Network A has 2 houses (demand 4 <= 5), Network B has 1 house (demand 2 <= 5)
    const cap = computeCapacityReport(index, state);
    expect(cap.get("A")?.canPowerAll).toBe(true);
    expect(cap.get("B")?.canPowerAll).toBe(true);

    // Enter activation -> all 3 houses auto-activate
    state = enterActivation(index, state);
    expect(state.activeBuildingIds.size).toBe(3);

    // Run simulation -> 30 pts (3 stars!)
    const sim = runSimulation(index, state);
    expect(sim.completed).toBe(true);
    expect(sim.score).toBe(30);
    expect(sim.stars).toBe(3);
  });
});

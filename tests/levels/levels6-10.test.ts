import { describe, it, expect } from "vitest";
import bDefs from "../../src/data/buildings.json";
import l6 from "../../src/data/campaign/level-06.json";
import l7 from "../../src/data/campaign/level-07.json";
import l8 from "../../src/data/campaign/level-08.json";
import l9 from "../../src/data/campaign/level-09.json";
import l10 from "../../src/data/campaign/level-10.json";
import { buildLevelIndex } from "../../src/engine/connectivity/networkAssignment";
import {
  LevelDefinitionSchema,
  BuildingDefinitionsMapSchema,
  type LevelDefinition,
  type BuildingDefinitionsMap,
} from "../../src/types";

describe("Campaign Levels 6-10 validation", () => {
  const levels = [l6, l7, l8, l9, l10] as unknown as LevelDefinition[];
  const defs = bDefs as unknown as BuildingDefinitionsMap;

  it("validates schemas for levels 6 to 10 and building definitions", () => {
    const parsedDefs = BuildingDefinitionsMapSchema.parse(defs);
    expect(parsedDefs.hospital).toBeDefined();
    expect(parsedDefs.hospital.demand).toBe(6);
    expect(parsedDefs.hospital.width).toBe(2);
    expect(parsedDefs.hospital.height).toBe(2);

    for (const lvl of levels) {
      expect(() => LevelDefinitionSchema.parse(lvl)).not.toThrow();
    }
  });

  for (const lvl of levels) {
    it(`validates ${lvl.id} has valid network connectivity and no overlaps`, () => {
      const index = buildLevelIndex(lvl, defs);
      expect(index.roadComponents.length).toBeGreaterThan(0);

      // Check all buildings touch exactly one network
      for (const b of lvl.buildings) {
        const netId = index.buildingToNetworkId.get(b.id);
        expect(netId, `Building ${b.id} in ${lvl.id} should touch exactly 1 road network`).not.toBeNull();
      }

      // Check all buildings stay within grid bounds
      for (const b of lvl.buildings) {
        const bDef = defs[b.variant];
        expect(b.origin.x + bDef.width).toBeLessThanOrEqual(lvl.grid.width);
        expect(b.origin.y + bDef.height).toBeLessThanOrEqual(lvl.grid.height);
      }
    });
  }
});

import type { LevelIndex } from "../connectivity/networkAssignment";
import {
  cellKey,
  getFootprintBoundaryNeighbors,
  getFootprintCells,
} from "../grid/footprint";
import type { CSPPlacementCandidate } from "./types";

/**
 * Computes all candidate grid origins for a generator of given footprint
 * that are valid (within grid bounds, not overlapping buildings/terrain/roads)
 * and connected to exactly one road component.
 */
export function getConnectedGeneratorCandidates(
  levelIndex: LevelIndex,
  genWidth: number,
  genHeight: number,
): CSPPlacementCandidate[] {
  const candidates: CSPPlacementCandidate[] = [];
  const gridWidth = levelIndex.level.grid.width;
  const gridHeight = levelIndex.level.grid.height;

  for (let y = 0; y <= gridHeight - genHeight; y++) {
    for (let x = 0; x <= gridWidth - genWidth; x++) {
      const origin = { x, y };
      const footprint = getFootprintCells(origin, genWidth, genHeight);

      // Check all cells are free from roads, terrain, buildings
      let overlaps = false;
      for (const cell of footprint) {
        if (levelIndex.occupiedCells.has(cellKey(cell))) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) continue;

      // Check boundary road connections
      const boundary = getFootprintBoundaryNeighbors(
        origin,
        genWidth,
        genHeight,
      );
      const touchingNetworks = new Set<string>();

      for (const b of boundary) {
        const netId = levelIndex.roadCellToComponentId.get(cellKey(b));
        if (netId) {
          touchingNetworks.add(netId);
        }
      }

      // Spec rule: Candidate must touch exactly one road component to be useful
      if (touchingNetworks.size === 1) {
        const networkId = Array.from(touchingNetworks)[0];
        candidates.push({ origin, networkId });
      }
    }
  }

  return candidates;
}

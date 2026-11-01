import type { Coordinate, PlacedGenerator } from '../../types'
import type { LevelIndex } from '../connectivity/networkAssignment'
import { cellKey, getFootprintBoundaryNeighbors, getFootprintCells } from '../grid/footprint'

export type PlacementValidity =
  | { valid: true; connected: true; networkId: string }
  | { valid: true; connected: false; networkId: null }
  | { valid: false; reason: 'multi_network' | 'out_of_bounds' | 'overlap' }

export function evaluatePlacement(
  index: LevelIndex,
  placedGenerators: PlacedGenerator[],
  typeId: string,
  origin: Coordinate,
  ignoreInstanceId?: string
): PlacementValidity {
  const def = index.buildingDefinitions[typeId]
  if (!def) {
    return { valid: false, reason: 'overlap' }
  }

  const cells = getFootprintCells(origin, def.width, def.height)

  for (const c of cells) {
    if (c.x < 0 || c.x >= index.level.grid.width || c.y < 0 || c.y >= index.level.grid.height) {
      return { valid: false, reason: 'out_of_bounds' }
    }
    if (index.occupiedCells.has(cellKey(c))) {
      return { valid: false, reason: 'overlap' }
    }
  }

  for (const gen of placedGenerators) {
    if (ignoreInstanceId && gen.instanceId === ignoreInstanceId) continue
    const genDef = index.buildingDefinitions[gen.typeId]
    if (!genDef) continue
    const genCells = getFootprintCells(gen.origin, genDef.width, genDef.height)
    const genCellKeys = new Set(genCells.map(cellKey))
    for (const c of cells) {
      if (genCellKeys.has(cellKey(c))) {
        return { valid: false, reason: 'overlap' }
      }
    }
  }

  const boundary = getFootprintBoundaryNeighbors(origin, def.width, def.height)
  const touchingNetworks = new Set<string>()

  for (const neighbor of boundary) {
    const netId = index.roadCellToComponentId.get(cellKey(neighbor))
    if (netId) {
      touchingNetworks.add(netId)
    }
  }

  if (touchingNetworks.size > 1) {
    return { valid: false, reason: 'multi_network' }
  }

  if (touchingNetworks.size === 1) {
    return { valid: true, connected: true, networkId: Array.from(touchingNetworks)[0] }
  }

  return { valid: true, connected: false, networkId: null }
}


import type { LevelDefinition, BuildingDefinitionsMap } from '../../types'
import { computeRoadComponents, type RoadComponent } from './connectedComponents'
import { cellKey, getFootprintBoundaryNeighbors, getFootprintCells } from '../grid/footprint'

export interface LevelIndex {
  level: LevelDefinition
  buildingDefinitions: BuildingDefinitionsMap
  roadComponents: RoadComponent[]
  roadCellToComponentId: Map<string, string>
  buildingToNetworkId: Map<string, string | null>
  occupiedCells: Map<string, { type: 'road' | 'terrain' | 'building'; id?: string }>
}

export function buildLevelIndex(
  level: LevelDefinition,
  buildingDefinitions: BuildingDefinitionsMap
): LevelIndex {
  const { components, cellToComponentId } = computeRoadComponents(level.roads)
  const buildingToNetworkId = new Map<string, string | null>()
  const occupiedCells = new Map<string, { type: 'road' | 'terrain' | 'building'; id?: string }>()

  for (const road of level.roads) {
    occupiedCells.set(cellKey(road), { type: 'road' })
  }

  for (const t of level.terrain) {
    occupiedCells.set(cellKey(t), { type: 'terrain' })
  }

  for (const b of level.buildings) {
    const def = buildingDefinitions[b.variant]
    if (!def) continue

    const cells = getFootprintCells(b.origin, def.width, def.height)
    for (const c of cells) {
      occupiedCells.set(cellKey(c), { type: 'building', id: b.id })
    }

    const boundary = getFootprintBoundaryNeighbors(b.origin, def.width, def.height)
    const touchingNetworks = new Set<string>()

    for (const neighbor of boundary) {
      const netId = cellToComponentId.get(cellKey(neighbor))
      if (netId) {
        touchingNetworks.add(netId)
      }
    }

    if (touchingNetworks.size === 1) {
      buildingToNetworkId.set(b.id, Array.from(touchingNetworks)[0])
    } else {
      buildingToNetworkId.set(b.id, null)
    }
  }

  return {
    level,
    buildingDefinitions,
    roadComponents: components,
    roadCellToComponentId: cellToComponentId,
    buildingToNetworkId,
    occupiedCells,
  }
}

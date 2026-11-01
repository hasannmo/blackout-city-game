import type { GameState } from '../../types'
import type { LevelIndex } from '../connectivity/networkAssignment'
import { computeCapacityReport, computeActivationReport } from './capacity'

export function enterActivation(index: LevelIndex, state: GameState): GameState {
  if (state.phase !== 'placement') return state

  const capacityReport = computeCapacityReport(index, state)
  const autoActiveIds = new Set<string>()

  for (const b of index.level.buildings) {
    const netId = index.buildingToNetworkId.get(b.id)
    if (netId) {
      const cap = capacityReport.get(netId)
      if (cap && cap.canPowerAll) {
        autoActiveIds.add(b.id)
      }
    }
  }

  return {
    ...state,
    phase: 'activation',
    activeBuildingIds: autoActiveIds,
  }
}

export function activateBuilding(
  index: LevelIndex,
  state: GameState,
  buildingId: string
): { success: true; newState: GameState } | { success: false; reason: string } {
  if (state.phase !== 'activation') {
    return { success: false, reason: 'Action only allowed in activation phase' }
  }

  if (state.activeBuildingIds.has(buildingId)) {
    return { success: true, newState: state }
  }

  const building = index.level.buildings.find((b) => b.id === buildingId)
  if (!building) {
    return { success: false, reason: 'Building not found' }
  }

  const netId = index.buildingToNetworkId.get(buildingId)
  if (!netId) {
    return { success: false, reason: 'Building has no road connection' }
  }

  const actReports = computeActivationReport(index, state)
  const netReport = actReports.get(netId)
  const def = index.buildingDefinitions[building.variant]

  if (!netReport || !def || netReport.remaining < def.demand) {
    return { success: false, reason: 'Insufficient capacity in this network' }
  }

  const nextActive = new Set(state.activeBuildingIds)
  nextActive.add(buildingId)

  return {
    success: true,
    newState: {
      ...state,
      activeBuildingIds: nextActive,
    },
  }
}

export function deactivateBuilding(
  state: GameState,
  buildingId: string
): { success: true; newState: GameState } | { success: false; reason: string } {
  if (state.phase !== 'activation') {
    return { success: false, reason: 'Action only allowed in activation phase' }
  }

  const nextActive = new Set(state.activeBuildingIds)
  nextActive.delete(buildingId)

  return {
    success: true,
    newState: {
      ...state,
      activeBuildingIds: nextActive,
    },
  }
}

export function goBack(state: GameState): GameState {
  if (state.phase === 'activation') {
    return {
      ...state,
      phase: 'placement',
      activeBuildingIds: new Set(),
    }
  }
  if (state.phase === 'result') {
    return {
      ...state,
      phase: 'activation',
    }
  }
  return state
}


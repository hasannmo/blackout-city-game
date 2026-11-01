import type { Coordinate, GameState, PlacedGenerator } from '../../types'
import type { LevelIndex } from '../connectivity/networkAssignment'
import { evaluatePlacement } from './evaluatePlacement'

let nextGenId = 1
export function generateInstanceId(): string {
  return `gen_${nextGenId++}`
}

export function placeGenerator(
  index: LevelIndex,
  state: GameState,
  typeId: string,
  origin: Coordinate
): { success: true; newState: GameState } | { success: false; reason: string } {
  if (state.phase !== 'placement') {
    return { success: false, reason: 'Action only allowed in placement phase' }
  }

  const placedCount = state.generators.filter((g) => g.typeId === typeId).length
  const totalAvailable = index.level.inventory[typeId] ?? 0
  if (placedCount >= totalAvailable) {
    return { success: false, reason: 'No inventory remaining for this generator' }
  }

  const evalResult = evaluatePlacement(index, state.generators, typeId, origin)
  if (!evalResult.valid) {
    if (evalResult.reason === 'multi_network') {
      return { success: false, reason: 'A generator cannot touch multiple separate road networks' }
    }
    return { success: false, reason: 'Invalid placement location' }
  }

  const newGenerator: PlacedGenerator = {
    instanceId: generateInstanceId(),
    typeId,
    origin,
  }

  return {
    success: true,
    newState: {
      ...state,
      generators: [...state.generators, newGenerator],
    },
  }
}

export function moveGenerator(
  index: LevelIndex,
  state: GameState,
  instanceId: string,
  newOrigin: Coordinate
): { success: true; newState: GameState } | { success: false; reason: string } {
  if (state.phase !== 'placement') {
    return { success: false, reason: 'Action only allowed in placement phase' }
  }

  const generator = state.generators.find((g) => g.instanceId === instanceId)
  if (!generator) {
    return { success: false, reason: 'Generator not found' }
  }

  const evalResult = evaluatePlacement(index, state.generators, generator.typeId, newOrigin, instanceId)
  if (!evalResult.valid) {
    if (evalResult.reason === 'multi_network') {
      return { success: false, reason: 'A generator cannot touch multiple separate road networks' }
    }
    return { success: false, reason: 'Invalid destination location' }
  }

  return {
    success: true,
    newState: {
      ...state,
      generators: state.generators.map((g) =>
        g.instanceId === instanceId ? { ...g, origin: newOrigin } : g
      ),
    },
  }
}

export function removeGenerator(
  state: GameState,
  instanceId: string
): { success: true; newState: GameState } | { success: false; reason: string } {
  if (state.phase !== 'placement') {
    return { success: false, reason: 'Action only allowed in placement phase' }
  }

  return {
    success: true,
    newState: {
      ...state,
      generators: state.generators.filter((g) => g.instanceId !== instanceId),
    },
  }
}

export function resetLevel(_state: GameState): GameState {
  return {
    phase: 'placement',
    generators: [],
    activeBuildingIds: new Set(),
    result: null,
  }
}

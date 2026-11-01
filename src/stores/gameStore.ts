import { create } from 'zustand'
import level1Data from '../data/campaign/level-01.json'
import buildingDefinitionsData from '../data/buildings.json'
import type {
  Coordinate,
  GameState,
  LevelDefinition,
  BuildingDefinitionsMap,
} from '../types'
import { buildLevelIndex, type LevelIndex } from '../engine/connectivity/networkAssignment'
import { placeGenerator, moveGenerator, removeGenerator, resetLevel } from '../engine/placement/generatorActions'
import { enterActivation, activateBuilding, deactivateBuilding, goBack } from '../engine/simulation/activation'
import { runSimulation } from '../engine/simulation/runSimulation'

export type AppScreen = 'home' | 'level-select' | 'game'

interface GameStore {
  currentScreen: AppScreen
  level: LevelDefinition
  buildingDefinitions: BuildingDefinitionsMap
  levelIndex: LevelIndex
  gameState: GameState
  selectedInventoryType: string | null
  hoverCoordinate: Coordinate | null
  toastMessage: string | null

  // Screen Actions
  setScreen: (screen: AppScreen) => void

  // Game Actions
  selectInventoryType: (typeId: string | null) => void
  setHoverCoordinate: (coord: Coordinate | null) => void
  placeGeneratorAt: (coord: Coordinate) => void
  moveGeneratorTo: (instanceId: string, newCoord: Coordinate) => void
  removeGeneratorByInstanceId: (instanceId: string) => void
  resetCurrentLevel: () => void
  proceedToActivation: () => void
  proceedToSimulation: () => void
  toggleBuildingActivation: (buildingId: string) => void
  navigateBack: () => void
  dismissToast: () => void
}

const initialLevel = level1Data as unknown as LevelDefinition
const initialDefs = buildingDefinitionsData as unknown as BuildingDefinitionsMap
const initialIndex = buildLevelIndex(initialLevel, initialDefs)

export const useGameStore = create<GameStore>((set, get) => ({
  currentScreen: 'home',
  level: initialLevel,
  buildingDefinitions: initialDefs,
  levelIndex: initialIndex,
  gameState: {
    phase: 'placement',
    generators: [],
    activeBuildingIds: new Set<string>(),
    result: null,
  },
  selectedInventoryType: 'generator',
  hoverCoordinate: null,
  toastMessage: null,

  setScreen: (screen) => {
    set({ currentScreen: screen })
  },

  selectInventoryType: (typeId) => {
    set({ selectedInventoryType: typeId })
  },

  setHoverCoordinate: (coord) => {
    set({ hoverCoordinate: coord })
  },

  placeGeneratorAt: (coord) => {
    const { levelIndex, gameState, selectedInventoryType } = get()
    if (!selectedInventoryType) return

    const result = placeGenerator(levelIndex, gameState, selectedInventoryType, coord)
    if (!result.success) {
      set({ toastMessage: result.reason })
      return
    }

    set({ gameState: result.newState, toastMessage: null })
  },

  moveGeneratorTo: (instanceId, newCoord) => {
    const { levelIndex, gameState } = get()
    const result = moveGenerator(levelIndex, gameState, instanceId, newCoord)
    if (!result.success) {
      set({ toastMessage: result.reason })
      return
    }
    set({ gameState: result.newState, toastMessage: null })
  },

  removeGeneratorByInstanceId: (instanceId) => {
    const { gameState } = get()
    const result = removeGenerator(gameState, instanceId)
    if (result.success) {
      set({ gameState: result.newState })
    }
  },

  resetCurrentLevel: () => {
    const { gameState } = get()
    set({ gameState: resetLevel(gameState), toastMessage: null })
  },

  proceedToActivation: () => {
    const { levelIndex, gameState } = get()
    const nextState = enterActivation(levelIndex, gameState)
    set({ gameState: nextState, toastMessage: null })
  },

  proceedToSimulation: () => {
    const { levelIndex, gameState } = get()
    const simResult = runSimulation(levelIndex, gameState)
    set({
      gameState: {
        ...gameState,
        phase: 'simulation',
        result: simResult,
      },
      toastMessage: null,
    })
  },

  toggleBuildingActivation: (buildingId) => {
    const { levelIndex, gameState } = get()
    if (gameState.activeBuildingIds.has(buildingId)) {
      const res = deactivateBuilding(gameState, buildingId)
      if (res.success) set({ gameState: res.newState })
    } else {
      const res = activateBuilding(levelIndex, gameState, buildingId)
      if (!res.success) {
        set({ toastMessage: res.reason })
      } else {
        set({ gameState: res.newState, toastMessage: null })
      }
    }
  },

  navigateBack: () => {
    const { gameState } = get()
    const nextState = goBack(gameState)
    set({ gameState: nextState, toastMessage: null })
  },

  dismissToast: () => {
    set({ toastMessage: null })
  },
}))

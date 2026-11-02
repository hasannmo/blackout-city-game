import { create } from "zustand";
import level1Data from "../data/campaign/level-01.json";
import level2Data from "../data/campaign/level-02.json";
import level3Data from "../data/campaign/level-03.json";
import level4Data from "../data/campaign/level-04.json";
import level5Data from "../data/campaign/level-05.json";
import buildingDefinitionsData from "../data/buildings.json";
import type {
  Coordinate,
  GameState,
  LevelDefinition,
  BuildingDefinitionsMap,
} from "../types";
import {
  buildLevelIndex,
  type LevelIndex,
} from "../engine/connectivity/networkAssignment";
import {
  placeGenerator,
  moveGenerator,
  removeGenerator,
  resetLevel,
} from "../engine/placement/generatorActions";
import {
  enterActivation,
  activateBuilding,
  deactivateBuilding,
  goBack,
} from "../engine/simulation/activation";
import { runSimulation } from "../engine/simulation/runSimulation";

export type AppScreen = "home" | "level-select" | "game";

export const campaignLevels: LevelDefinition[] = [
  level1Data as unknown as LevelDefinition,
  level2Data as unknown as LevelDefinition,
  level3Data as unknown as LevelDefinition,
  level4Data as unknown as LevelDefinition,
  level5Data as unknown as LevelDefinition,
];

interface GameStore {
  currentScreen: AppScreen;
  level: LevelDefinition;
  buildingDefinitions: BuildingDefinitionsMap;
  levelIndex: LevelIndex;
  gameState: GameState;
  selectedInventoryType: string | null;
  hoverCoordinate: Coordinate | null;
  toastMessage: string | null;
  showStarSidebar: boolean;
  unlockedLevelIndex: number;

  // Screen Actions
  setScreen: (screen: AppScreen) => void;
  toggleStarSidebar: () => void;

  // Level Actions
  hasNextLevel: () => boolean;
  nextLevel: () => void;
  loadLevel: (levelDef: LevelDefinition) => void;

  // Game Actions
  selectInventoryType: (typeId: string | null) => void;
  setHoverCoordinate: (coord: Coordinate | null) => void;
  placeGeneratorAt: (coord: Coordinate) => void;
  moveGeneratorTo: (instanceId: string, newCoord: Coordinate) => void;
  removeGeneratorByInstanceId: (instanceId: string) => void;
  resetCurrentLevel: () => void;
  proceedToActivation: () => void;
  proceedToSimulation: () => void;
  toggleBuildingActivation: (buildingId: string) => void;
  navigateBack: () => void;
  dismissToast: () => void;
}

const initialLevel = campaignLevels[0];
const initialDefs =
  buildingDefinitionsData as unknown as BuildingDefinitionsMap;
const initialIndex = buildLevelIndex(initialLevel, initialDefs);

export const useGameStore = create<GameStore>((set, get) => ({
  currentScreen: "home",
  level: initialLevel,
  buildingDefinitions: initialDefs,
  levelIndex: initialIndex,
  gameState: {
    phase: "placement",
    generators: [],
    activeBuildingIds: new Set<string>(),
    result: null,
  },
  selectedInventoryType: "generator",
  hoverCoordinate: null,
  toastMessage: null,
  showStarSidebar: true,
  unlockedLevelIndex: 0,

  setScreen: (screen) => {
    set({ currentScreen: screen });
  },

  toggleStarSidebar: () => {
    set((state) => ({ showStarSidebar: !state.showStarSidebar }));
  },

  hasNextLevel: () => {
    const { level } = get();
    const currentIndex = campaignLevels.findIndex((l) => l.id === level.id);
    return currentIndex >= 0 && currentIndex < campaignLevels.length - 1;
  },

  nextLevel: () => {
    const { level, loadLevel, hasNextLevel } = get();
    if (!hasNextLevel()) return;
    const currentIndex = campaignLevels.findIndex((l) => l.id === level.id);
    const nextLvl = campaignLevels[currentIndex + 1];
    if (nextLvl) {
      loadLevel(nextLvl);
    }
  },

  loadLevel: (levelDef) => {
    const { buildingDefinitions } = get();
    const newIndex = buildLevelIndex(levelDef, buildingDefinitions);
    const lvlIndex = campaignLevels.findIndex((l) => l.id === levelDef.id);
    set((state) => ({
      level: levelDef,
      levelIndex: newIndex,
      currentScreen: "game",
      unlockedLevelIndex: Math.max(state.unlockedLevelIndex, lvlIndex),
      gameState: {
        phase: "placement",
        generators: [],
        activeBuildingIds: new Set(),
        result: null,
      },
      toastMessage: null,
      selectedInventoryType: Object.keys(levelDef.inventory)[0] ?? null,
    }));
  },

  selectInventoryType: (typeId) => {
    set({ selectedInventoryType: typeId });
  },

  setHoverCoordinate: (coord) => {
    set({ hoverCoordinate: coord });
  },

  placeGeneratorAt: (coord) => {
    const { levelIndex, gameState, selectedInventoryType } = get();
    if (!selectedInventoryType) return;

    const result = placeGenerator(
      levelIndex,
      gameState,
      selectedInventoryType,
      coord,
    );
    if (!result.success) {
      set({ toastMessage: result.reason });
      return;
    }

    set({ gameState: result.newState, toastMessage: null });
  },

  moveGeneratorTo: (instanceId, newCoord) => {
    const { levelIndex, gameState } = get();
    const result = moveGenerator(levelIndex, gameState, instanceId, newCoord);
    if (!result.success) {
      set({ toastMessage: result.reason });
      return;
    }
    set({ gameState: result.newState, toastMessage: null });
  },

  removeGeneratorByInstanceId: (instanceId) => {
    const { gameState } = get();
    const result = removeGenerator(gameState, instanceId);
    if (result.success) {
      set({ gameState: result.newState });
    }
  },

  resetCurrentLevel: () => {
    const { gameState } = get();
    set({ gameState: resetLevel(gameState), toastMessage: null });
  },

  proceedToActivation: () => {
    const { levelIndex, gameState } = get();
    const nextState = enterActivation(levelIndex, gameState);
    set({ gameState: nextState, toastMessage: null });
  },

  proceedToSimulation: () => {
    const { levelIndex, gameState, level } = get();
    const simResult = runSimulation(levelIndex, gameState);
    const currentIdx = campaignLevels.findIndex((l) => l.id === level.id);

    set((state) => ({
      gameState: {
        ...gameState,
        phase: "simulation",
        result: simResult,
      },
      unlockedLevelIndex:
        simResult.completed && currentIdx >= 0
          ? Math.max(state.unlockedLevelIndex, currentIdx + 1)
          : state.unlockedLevelIndex,
      toastMessage: null,
    }));
  },

  toggleBuildingActivation: (buildingId) => {
    const { levelIndex, gameState } = get();
    if (gameState.activeBuildingIds.has(buildingId)) {
      const res = deactivateBuilding(gameState, buildingId);
      if (res.success) set({ gameState: res.newState });
    } else {
      const res = activateBuilding(levelIndex, gameState, buildingId);
      if (!res.success) {
        set({ toastMessage: res.reason });
      } else {
        set({ gameState: res.newState, toastMessage: null });
      }
    }
  },

  navigateBack: () => {
    const { gameState } = get();
    const nextState = goBack(gameState);
    set({ gameState: nextState, toastMessage: null });
  },

  dismissToast: () => {
    set({ toastMessage: null });
  },
}));

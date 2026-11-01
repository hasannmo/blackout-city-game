import { describe, it, expect } from 'vitest'
import exampleLevel from '../../src/data/campaign/level-01.json'
import buildingDefinitions from '../../src/data/buildings.json'
import { LevelDefinitionSchema, BuildingDefinitionsMapSchema, type GameState } from '../../src/types'
import { buildLevelIndex } from '../../src/engine/connectivity/networkAssignment'
import { evaluatePlacement } from '../../src/engine/placement/evaluatePlacement'
import { placeGenerator } from '../../src/engine/placement/generatorActions'
import { computeCapacityReport } from '../../src/engine/simulation/capacity'
import { enterActivation, activateBuilding } from '../../src/engine/simulation/activation'
import { runSimulation } from '../../src/engine/simulation/runSimulation'

describe('Level 1 Gameplay Rules & Simulation', () => {
  it('validates level 1 JSON against schemas', () => {
    const parsedLevel = LevelDefinitionSchema.parse(exampleLevel)
    const parsedBuildings = BuildingDefinitionsMapSchema.parse(buildingDefinitions)
    expect(parsedLevel.id).toBe('level-01')
    expect(parsedBuildings.generator.output).toBe(8)
  })

  it('rejects 1x1 generator bridging two distinct road components at (4,2)', () => {
    const index = buildLevelIndex(exampleLevel as any, buildingDefinitions as any)
    const emptyGenerators: any[] = []

    // (4,2) is between road cell (3,2) in A and (5,2) in B
    const evalRes = evaluatePlacement(index, emptyGenerators, 'small_generator', { x: 4, y: 2 })
    expect(evalRes.valid).toBe(false)
    if (!evalRes.valid) {
      expect(evalRes.reason).toBe('multi_network')
    }
  })

  it('allows valid placement touching exactly one network', () => {
    const index = buildLevelIndex(exampleLevel as any, buildingDefinitions as any)
    // Place small generator at (0, 1) adjacent to road (0, 2) in network A
    const evalRes = evaluatePlacement(index, [], 'small_generator', { x: 0, y: 1 })
    expect(evalRes.valid).toBe(true)
    if (evalRes.valid) {
      expect(evalRes.connected).toBe(true)
      expect(evalRes.networkId).toBe('A')
    }
  })

  it('plays through 3-star solution matching spec 15.3', () => {
    const index = buildLevelIndex(exampleLevel as any, buildingDefinitions as any)
    let state: GameState = {
      phase: 'placement',
      generators: [],
      activeBuildingIds: new Set(),
      result: null,
    }

    // Generator (2x2, output 8) placed on Network B at (5, 3) adjacent to road (5, 2)
    const place1 = placeGenerator(index, state, 'generator', { x: 5, y: 3 })
    expect(place1.success).toBe(true)
    if (place1.success) state = place1.newState

    // Small Generator (1x1, output 3) placed on Network A at (0, 1) adjacent to road (0, 2)
    const place2 = placeGenerator(index, state, 'small_generator', { x: 0, y: 1 })
    expect(place2.success).toBe(true)
    if (place2.success) state = place2.newState

    // Check capacity: Network A has 3 gen, 4 demand -> surplus -1 (canPowerAll = false)
    // Network B has 8 gen, 5 demand -> surplus +3 (canPowerAll = true)
    const cap = computeCapacityReport(index, state)
    expect(cap.get('A')?.canPowerAll).toBe(false)
    expect(cap.get('B')?.canPowerAll).toBe(true)

    // Enter activation: Network B auto-activates hospital 'b3'
    state = enterActivation(index, state)
    expect(state.phase).toBe('activation')
    expect(state.activeBuildingIds.has('b3')).toBe(true)
    expect(state.activeBuildingIds.has('b1')).toBe(false)
    expect(state.activeBuildingIds.has('b2')).toBe(false)

    // Player manually activates b2 (house with score 15, demand 2 <= 3 remaining)
    const act = activateBuilding(index, state, 'b2')
    expect(act.success).toBe(true)
    if (act.success) state = act.newState

    // Run simulation
    const result = runSimulation(index, state)
    expect(result.completed).toBe(true)
    expect(result.mandatoryMet).toBe(true)
    // Hospital score 40 + House b2 score 15 = 55 points -> 3 stars!
    expect(result.score).toBe(55)
    expect(result.stars).toBe(3)
  })
})


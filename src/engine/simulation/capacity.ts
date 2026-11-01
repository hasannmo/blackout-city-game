import type { GameState, NetworkCapacityReport, NetworkActivationReport } from '../../types'
import type { LevelIndex } from '../connectivity/networkAssignment'
import { evaluatePlacement } from '../placement/evaluatePlacement'

export function computeCapacityReport(
  index: LevelIndex,
  state: GameState
): Map<string, NetworkCapacityReport> {
  const reports = new Map<string, NetworkCapacityReport>()

  for (const comp of index.roadComponents) {
    reports.set(comp.id, {
      networkId: comp.id,
      generation: 0,
      demand: 0,
      surplus: 0,
      canPowerAll: false,
    })
  }

  for (const b of index.level.buildings) {
    const netId = index.buildingToNetworkId.get(b.id)
    if (netId && reports.has(netId)) {
      const def = index.buildingDefinitions[b.variant]
      if (def) {
        reports.get(netId)!.demand += def.demand
      }
    }
  }

  for (const gen of state.generators) {
    const evalRes = evaluatePlacement(index, state.generators, gen.typeId, gen.origin, gen.instanceId)
    if (evalRes.valid && evalRes.connected && evalRes.networkId) {
      const def = index.buildingDefinitions[gen.typeId]
      if (def && reports.has(evalRes.networkId)) {
        reports.get(evalRes.networkId)!.generation += def.output
      }
    }
  }

  for (const r of reports.values()) {
    r.surplus = r.generation - r.demand
    r.canPowerAll = r.generation >= r.demand
  }

  return reports
}

export function computeActivationReport(
  index: LevelIndex,
  state: GameState
): Map<string, NetworkActivationReport> {
  const capacityReports = computeCapacityReport(index, state)
  const actReports = new Map<string, NetworkActivationReport>()

  for (const [netId, cap] of capacityReports.entries()) {
    actReports.set(netId, {
      networkId: netId,
      generation: cap.generation,
      consumed: 0,
      remaining: cap.generation,
    })
  }

  for (const buildingId of state.activeBuildingIds) {
    const netId = index.buildingToNetworkId.get(buildingId)
    const building = index.level.buildings.find((b) => b.id === buildingId)
    if (netId && building && actReports.has(netId)) {
      const def = index.buildingDefinitions[building.variant]
      if (def) {
        actReports.get(netId)!.consumed += def.demand
      }
    }
  }

  for (const r of actReports.values()) {
    r.remaining = r.generation - r.consumed
  }

  return actReports
}


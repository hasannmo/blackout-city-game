import type { Coordinate } from '../../types'
import { cellKey, getOrthogonalNeighbors } from '../grid/footprint'

export interface RoadComponent {
  id: string
  cells: Coordinate[]
}

export function computeRoadComponents(roads: Coordinate[]): {
  components: RoadComponent[]
  cellToComponentId: Map<string, string>
} {
  const roadSet = new Set<string>(roads.map(cellKey))
  const visited = new Set<string>()
  const components: RoadComponent[] = []
  const cellToComponentId = new Map<string, string>()

  let componentIndex = 0

  for (const road of roads) {
    const key = cellKey(road)
    if (visited.has(key)) continue

    const queue: Coordinate[] = [road]
    visited.add(key)
    const componentCells: Coordinate[] = []
    const componentId = String.fromCharCode(65 + componentIndex) // 'A', 'B', 'C', 'D'
    componentIndex++

    while (queue.length > 0) {
      const current = queue.shift()!
      componentCells.push(current)
      cellToComponentId.set(cellKey(current), componentId)

      const neighbors = getOrthogonalNeighbors(current)
      for (const n of neighbors) {
        const nKey = cellKey(n)
        if (roadSet.has(nKey) && !visited.has(nKey)) {
          visited.add(nKey)
          queue.push(n)
        }
      }
    }

    components.push({
      id: componentId,
      cells: componentCells,
    })
  }

  return { components, cellToComponentId }
}

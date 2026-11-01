import type { Coordinate } from '../../types'

export function cellKey(coord: Coordinate): string {
  return `${coord.x},${coord.y}`
}

export function parseCellKey(key: string): Coordinate {
  const [x, y] = key.split(',').map(Number)
  return { x, y }
}

export function getOrthogonalNeighbors(coord: Coordinate): Coordinate[] {
  return [
    { x: coord.x + 1, y: coord.y },
    { x: coord.x - 1, y: coord.y },
    { x: coord.x, y: coord.y + 1 },
    { x: coord.x, y: coord.y - 1 },
  ]
}

export function getFootprintCells(origin: Coordinate, width: number, height: number): Coordinate[] {
  const cells: Coordinate[] = []
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      cells.push({ x: origin.x + dx, y: origin.y + dy })
    }
  }
  return cells
}

export function getFootprintBoundaryNeighbors(
  origin: Coordinate,
  width: number,
  height: number
): Coordinate[] {
  const boundaryKeys = new Set<string>()
  const footprintKeys = new Set<string>()

  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      footprintKeys.add(`${origin.x + dx},${origin.y + dy}`)
    }
  }

  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const neighbors = getOrthogonalNeighbors({ x: origin.x + dx, y: origin.y + dy })
      for (const n of neighbors) {
        const key = cellKey(n)
        if (!footprintKeys.has(key)) {
          boundaryKeys.add(key)
        }
      }
    }
  }

  return Array.from(boundaryKeys).map(parseCellKey)
}


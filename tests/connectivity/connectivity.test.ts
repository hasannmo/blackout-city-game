import { describe, it, expect } from 'vitest'
import type { Coordinate } from '../../src/types'
import { computeRoadComponents } from '../../src/engine/connectivity/connectedComponents'

describe('Road Connectivity', () => {
  it('groups orthogonally adjacent road cells into the same component', () => {
    const roads: Coordinate[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]
    const { components } = computeRoadComponents(roads)
    expect(components).toHaveLength(1)
    expect(components[0].id).toBe('A')
    expect(components[0].cells).toHaveLength(3)
  })

  it('separates diagonally adjacent road cells into separate components', () => {
    const roads: Coordinate[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]
    const { components } = computeRoadComponents(roads)
    expect(components).toHaveLength(2)
    expect(components.map((c) => c.id)).toEqual(['A', 'B'])
  })

  it('assigns distinct IDs to multiple disconnected road systems (example level layout)', () => {
    const roads: Coordinate[] = [
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 5, y: 2 },
      { x: 6, y: 2 },
      { x: 7, y: 2 },
    ]
    const { components, cellToComponentId } = computeRoadComponents(roads)
    expect(components).toHaveLength(2)
    expect(components[0].id).toBe('A')
    expect(components[1].id).toBe('B')

    expect(cellToComponentId.get('0,2')).toBe('A')
    expect(cellToComponentId.get('3,2')).toBe('A')
    expect(cellToComponentId.get('5,2')).toBe('B')
    expect(cellToComponentId.get('7,2')).toBe('B')
  })
})


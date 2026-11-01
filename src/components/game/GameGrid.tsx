import React from 'react'
import { useGameStore } from '../../stores/gameStore'
import { evaluatePlacement } from '../../engine/placement/evaluatePlacement'
import { getFootprintCells, cellKey } from '../../engine/grid/footprint'
import { BuildingSprite } from './BuildingSprite'
import { TreeSprite } from './TreeSprite'
import { GeneratorSprite } from './GeneratorSprite'
import { RoadCell } from './RoadCell'

export const GameGrid: React.FC = () => {
  const level = useGameStore((s) => s.level)
  const levelIndex = useGameStore((s) => s.levelIndex)
  const gameState = useGameStore((s) => s.gameState)
  const selectedType = useGameStore((s) => s.selectedInventoryType)
  const hoverCoord = useGameStore((s) => s.hoverCoordinate)
  const setHoverCoordinate = useGameStore((s) => s.setHoverCoordinate)
  const placeGeneratorAt = useGameStore((s) => s.placeGeneratorAt)
  const removeGenerator = useGameStore((s) => s.removeGeneratorByInstanceId)
  const toggleBuildingActivation = useGameStore((s) => s.toggleBuildingActivation)

  const width = level.grid.width
  const height = level.grid.height

  // Compute ghost placement preview if in placement phase
  let ghostValid: boolean | null = null
  const ghostCellKeys = new Set<string>()

  if (gameState.phase === 'placement' && selectedType && hoverCoord) {
    const evalRes = evaluatePlacement(levelIndex, gameState.generators, selectedType, hoverCoord)
    ghostValid = evalRes.valid
    const def = levelIndex.buildingDefinitions[selectedType]
    if (def) {
      const cells = getFootprintCells(hoverCoord, def.width, def.height)
      for (const c of cells) ghostCellKeys.add(cellKey(c))
    }
  }

  // Placed generators lookup
  const placedCellsMap = new Map<string, { instanceId: string; typeId: string; isOrigin: boolean }>()
  for (const gen of gameState.generators) {
    const def = levelIndex.buildingDefinitions[gen.typeId]
    if (!def) continue
    const cells = getFootprintCells(gen.origin, def.width, def.height)
    for (const c of cells) {
      placedCellsMap.set(cellKey(c), {
        instanceId: gen.instanceId,
        typeId: gen.typeId,
        isOrigin: c.x === gen.origin.x && c.y === gen.origin.y,
      })
    }
  }

  // Buildings lookup
  const buildingCellsMap = new Map<string, { id: string; variant: string; isOrigin: boolean }>()
  for (const b of level.buildings) {
    const def = levelIndex.buildingDefinitions[b.variant]
    if (!def) continue
    const cells = getFootprintCells(b.origin, def.width, def.height)
    for (const c of cells) {
      buildingCellsMap.set(cellKey(c), {
        id: b.id,
        variant: b.variant,
        isOrigin: c.x === b.origin.x && c.y === b.origin.y,
      })
    }
  }

  const renderCells = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`
      const isRoad = levelIndex.roadCellToComponentId.has(key)
      const isTerrain = level.terrain.some((t) => t.x === x && t.y === y)
      const buildingInfo = buildingCellsMap.get(key)
      const generatorInfo = placedCellsMap.get(key)
      const isGhost = ghostCellKeys.has(key)

      const isOdd = (x + y) % 2 === 1
      const defaultGrassBg = isOdd ? 'var(--grass-dark)' : 'var(--grass-light)'

      // Check orthogonal road neighbors for realistic rendering
      const hasNorth = levelIndex.roadCellToComponentId.has(`${x},${y - 1}`)
      const hasSouth = levelIndex.roadCellToComponentId.has(`${x},${y + 1}`)
      const hasEast = levelIndex.roadCellToComponentId.has(`${x + 1},${y}`)
      const hasWest = levelIndex.roadCellToComponentId.has(`${x - 1},${y}`)

      renderCells.push(
        <div
          key={key}
          onMouseEnter={() => setHoverCoordinate({ x, y })}
          onClick={() => {
            if (gameState.phase === 'placement') {
              if (generatorInfo) {
                removeGenerator(generatorInfo.instanceId)
              } else {
                placeGeneratorAt({ x, y })
              }
            } else if (gameState.phase === 'activation' && buildingInfo) {
              toggleBuildingActivation(buildingInfo.id)
            }
          }}
          className={`relative w-24 h-24 border border-black/10 flex items-center justify-center cursor-pointer transition-all ${
            buildingInfo && gameState.phase !== 'placement' ? 'z-20' : ''
          }`}
          style={{
            backgroundColor: isRoad ? 'var(--asphalt)' : defaultGrassBg,
          }}
        >
          {/* Road Cell component */}
          {isRoad && (
            <RoadCell
              hasNorth={hasNorth}
              hasSouth={hasSouth}
              hasEast={hasEast}
              hasWest={hasWest}
            />
          )}

          {/* Tree / Terrain */}
          {isTerrain && <TreeSprite />}

          {/* Placed Building */}
          {buildingInfo && buildingInfo.isOrigin && (
            <div className="relative w-full h-full flex items-center justify-center z-10">
              <BuildingSprite
                variant={buildingInfo.variant}
                isLit={gameState.activeBuildingIds.has(buildingInfo.id)}
                isPowered={gameState.activeBuildingIds.has(buildingInfo.id)}
              />
              {/* Status Indicator Bubble during Activation / Simulation */}
              {gameState.phase !== 'placement' && (
                <div className="absolute top-1 right-1 z-30 w-7 h-7 rounded-full bg-white border-2 border-[var(--outline)] flex items-center justify-center shadow-lg">
                  {gameState.activeBuildingIds.has(buildingInfo.id) ? (
                    <img src="/icons/zap.svg" alt="Powered" className="w-4 h-4 text-amber-500" />
                  ) : (
                    <span className="w-3 h-3 rounded-full bg-gray-400" />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Placed Generator */}
          {generatorInfo && generatorInfo.isOrigin && (
            <div className="relative w-full h-full flex items-center justify-center z-10">
              <GeneratorSprite />
            </div>
          )}

          {/* Placement Hover Ghost */}
          {isGhost && (
            <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
              {ghostValid ? (
                // Valid tile hover using user's custom generator-hover icon
                <div className="w-20 h-20 flex items-center justify-center">
                  <img
                    src="/icons/generator-hover.png"
                    alt="Generator Ghost Preview"
                    className="w-full h-full object-contain drop-shadow-md animate-pulse"
                  />
                </div>
              ) : (
                // Invalid tile hover (solid alert red with white X)
                <div className="w-full h-full bg-red-600/75 border-2 border-red-700 flex items-center justify-center">
                  <img src="/icons/alert-x.svg" alt="Invalid Placement" className="w-9 h-9" />
                </div>
              )}
            </div>
          )}
        </div>
      )
    }
  }

  return (
    <div
      className="flex-1 flex items-center justify-center p-4"
      onMouseLeave={() => setHoverCoordinate(null)}
    >
      <div
        className="grid p-4 rounded-3xl bg-[var(--board-frame)] border-4 border-[var(--outline)] shadow-2xl transition-all"
        style={{
          gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
        }}
      >
        {renderCells}
      </div>
    </div>
  )
}

import React from 'react'
import { useGameStore } from '../../stores/gameStore'
import { evaluatePlacement } from '../../engine/placement/evaluatePlacement'
import { getFootprintCells, cellKey } from '../../engine/grid/footprint'

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
  let ghostConnected = false
  let ghostNetworkId: string | null = null
  const ghostCellKeys = new Set<string>()

  if (gameState.phase === 'placement' && selectedType && hoverCoord) {
    const evalRes = evaluatePlacement(levelIndex, gameState.generators, selectedType, hoverCoord)
    ghostValid = evalRes.valid
    if (evalRes.valid) {
      ghostConnected = evalRes.connected
      ghostNetworkId = evalRes.networkId
    }
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
      const roadNetId = levelIndex.roadCellToComponentId.get(key)
      const isTerrain = level.terrain.some((t) => t.x === x && t.y === y)
      const buildingInfo = buildingCellsMap.get(key)
      const generatorInfo = placedCellsMap.get(key)
      const isGhost = ghostCellKeys.has(key)

      const isOdd = (x + y) % 2 === 1
      const defaultGrassBg = isOdd ? 'var(--grass-dark)' : 'var(--grass-light)'

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
          className="relative w-16 h-16 border border-black/10 flex items-center justify-center cursor-pointer transition-colors"
          style={{
            backgroundColor: isRoad
              ? 'var(--asphalt)'
              : isTerrain
              ? 'var(--tree)'
              : defaultGrassBg,
          }}
        >
          {/* Road Network Badge */}
          {isRoad && roadNetId && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white/60 font-black text-xs select-none">
                {roadNetId}
              </span>
            </div>
          )}

          {/* Placed Building */}
          {buildingInfo && buildingInfo.isOrigin && (
            <div
              className={`absolute inset-1 rounded-xl border-2 border-[var(--outline)] flex flex-col items-center justify-center p-1 shadow-md transition-all ${
                gameState.activeBuildingIds.has(buildingInfo.id)
                  ? 'bg-[var(--roof-red-lit)] ring-4 ring-amber-300'
                  : 'bg-[var(--wall-unlit)]'
              }`}
            >
              <span className="text-[10px] font-black leading-tight text-center text-[var(--ink)]">
                {buildingInfo.variant}
              </span>
              {gameState.activeBuildingIds.has(buildingInfo.id) && (
                <img src="/icons/zap-plain.svg" alt="Active" className="w-3.5 h-3.5 text-amber-300 mt-0.5" />
              )}
            </div>
          )}

          {/* Placed Generator */}
          {generatorInfo && generatorInfo.isOrigin && (
            <div className="absolute inset-1 rounded-xl bg-[var(--power-yellow)] border-2 border-[var(--outline)] flex flex-col items-center justify-center shadow-md">
              <img src="/icons/zap.svg" alt="Generator" className="w-5 h-5 text-[var(--ink)]" />
              <span className="text-[9px] font-black text-[var(--ink)]">GEN</span>
            </div>
          )}

          {/* Placement Hover Ghost */}
          {isGhost && (
            <div
              className={`absolute inset-0 pointer-events-none transition-opacity ${
                ghostValid
                  ? ghostConnected
                    ? 'border-4 border-white bg-amber-400/30'
                    : 'border-2 border-dashed border-white bg-white/20'
                  : 'bg-red-500/60 border-2 border-red-600 flex items-center justify-center'
              }`}
            >
              {!ghostValid && <img src="/icons/alert-x.svg" alt="Invalid" className="w-6 h-6" />}
              {ghostValid && ghostConnected && (
                <span className="text-white font-extrabold text-xs drop-shadow">
                  {ghostNetworkId}
                </span>
              )}
            </div>
          )}
        </div>
      )
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div
        className="grid p-3 rounded-3xl bg-[var(--board-frame)] border-4 border-[var(--outline)] shadow-2xl"
        style={{
          gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
        }}
      >
        {renderCells}
      </div>
    </div>
  )
}


import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useGameStore } from "../../stores/gameStore";
import { evaluatePlacement } from "../../engine/placement/evaluatePlacement";
import { getFootprintCells, cellKey } from "../../engine/grid/footprint";
import { BuildingSprite } from "./BuildingSprite";
import { TreeSprite } from "./TreeSprite";
import { GeneratorSprite } from "./GeneratorSprite";
import { RoadCell } from "./RoadCell";

export const GameGrid: React.FC = () => {
  const level = useGameStore((s) => s.level);
  const levelIndex = useGameStore((s) => s.levelIndex);
  const gameState = useGameStore((s) => s.gameState);
  const selectedType = useGameStore((s) => s.selectedInventoryType);
  const hoverCoord = useGameStore((s) => s.hoverCoordinate);
  const setHoverCoordinate = useGameStore((s) => s.setHoverCoordinate);
  const placeGeneratorAt = useGameStore((s) => s.placeGeneratorAt);
  const removeGenerator = useGameStore((s) => s.removeGeneratorByInstanceId);
  const toggleBuildingActivation = useGameStore(
    (s) => s.toggleBuildingActivation,
  );

  // zoom is a multiplier on top of the automatic "fit to screen" scale
  const [zoom, setZoom] = useState<number>(1);

  const handleZoomIn = () =>
    setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))));
  const handleZoomOut = () =>
    setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))));
  const handleResetZoom = () => setZoom(1);

  const width = level.grid.width;
  const height = level.grid.height;

  // Board is laid out at a fixed "design size" (sprites are drawn for it) and then
  // scaled as a whole, so the same board fits a phone, a tablet and a desktop.
  const cellPx = width > 5 ? 80 : 96;
  const cellSizeClass = width > 5 ? "w-20 h-20" : "w-24 h-24";
  const BOARD_CHROME = 40; // p-4 (2x16) + border-4 (2x4)
  const boardW = width * cellPx + BOARD_CHROME;
  const boardH = height * cellPx + BOARD_CHROME;

  const containerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  // offsetWidth/Height (not clientWidth) so a scrollbar appearing never feeds back into the scale
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setBox({ w: el.offsetWidth, h: el.offsetHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = box.w < 640 ? 8 : 24;
  const fitScale =
    box.w > 0 && box.h > 0
      ? Math.min(1, (box.w - pad * 2) / boardW, (box.h - pad * 2) / boardH)
      : 1;
  const scale = Math.max(0.1, fitScale) * zoom;

  // Touch devices have no hover: first tap previews, second tap on the same tile places.
  const pointerTypeRef = useRef<string>("mouse");

  // New level -> reset zoom. Phase change -> drop any stale touch preview.
  const [prevLevelId, setPrevLevelId] = useState<string>(level.id);
  if (prevLevelId !== level.id) {
    setPrevLevelId(level.id);
    setZoom(1);
  }
  useEffect(() => {
    setHoverCoordinate(null);
  }, [gameState.phase, setHoverCoordinate]);

  const handleCellClick = (
    x: number,
    y: number,
    generatorInfo: { instanceId: string } | undefined,
    buildingId: string | undefined,
  ) => {
    if (gameState.phase === "placement") {
      if (generatorInfo) {
        removeGenerator(generatorInfo.instanceId);
        return;
      }
      const isTouch = pointerTypeRef.current !== "mouse";
      const alreadyPreviewed =
        hoverCoord !== null && hoverCoord.x === x && hoverCoord.y === y;
      if (isTouch && !alreadyPreviewed) {
        setHoverCoordinate({ x, y }); // 1st tap: show ghost (valid / invalid)
        return;
      }
      placeGeneratorAt({ x, y }); // mouse click, or 2nd tap on the same tile
      if (isTouch) setHoverCoordinate(null);
    } else if (gameState.phase === "activation" && buildingId) {
      toggleBuildingActivation(buildingId);
    }
  };

  // Compute ghost placement preview if in placement phase
  let ghostValid: boolean | null = null;
  const ghostCellKeys = new Set<string>();

  if (gameState.phase === "placement" && selectedType && hoverCoord) {
    const evalRes = evaluatePlacement(
      levelIndex,
      gameState.generators,
      selectedType,
      hoverCoord,
    );
    ghostValid = evalRes.valid;
    const def = levelIndex.buildingDefinitions[selectedType];
    if (def) {
      const cells = getFootprintCells(hoverCoord, def.width, def.height);
      for (const c of cells) ghostCellKeys.add(cellKey(c));
    }
  }

  // Placed generators lookup
  const placedCellsMap = new Map<
    string,
    { instanceId: string; typeId: string; isOrigin: boolean }
  >();
  for (const gen of gameState.generators) {
    const def = levelIndex.buildingDefinitions[gen.typeId];
    if (!def) continue;
    const cells = getFootprintCells(gen.origin, def.width, def.height);
    for (const c of cells) {
      placedCellsMap.set(cellKey(c), {
        instanceId: gen.instanceId,
        typeId: gen.typeId,
        isOrigin: c.x === gen.origin.x && c.y === gen.origin.y,
      });
    }
  }

  // Buildings lookup
  const buildingCellsMap = new Map<
    string,
    {
      id: string;
      variant: string;
      isOrigin: boolean;
      demand: number;
      score: number;
      width: number;
      height: number;
    }
  >();
  for (const b of level.buildings) {
    const def = levelIndex.buildingDefinitions[b.variant];
    if (!def) continue;
    const cells = getFootprintCells(b.origin, def.width, def.height);
    for (const c of cells) {
      buildingCellsMap.set(cellKey(c), {
        id: b.id,
        variant: b.variant,
        isOrigin: c.x === b.origin.x && c.y === b.origin.y,
        demand: def.demand,
        score: b.score,
        width: def.width,
        height: def.height,
      });
    }
  }

  const renderCells = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`;
      const isRoad = levelIndex.roadCellToComponentId.has(key);
      const isTerrain = level.terrain.some((t) => t.x === x && t.y === y);
      const buildingInfo = buildingCellsMap.get(key);
      const generatorInfo = placedCellsMap.get(key);
      const isGhost = ghostCellKeys.has(key);

      const isOdd = (x + y) % 2 === 1;
      const defaultGrassBg = isOdd ? "var(--grass-dark)" : "var(--grass-light)";

      // Check orthogonal road neighbors for realistic rendering
      const hasNorth = levelIndex.roadCellToComponentId.has(`${x},${y - 1}`);
      const hasSouth = levelIndex.roadCellToComponentId.has(`${x},${y + 1}`);
      const hasEast = levelIndex.roadCellToComponentId.has(`${x + 1},${y}`);
      const hasWest = levelIndex.roadCellToComponentId.has(`${x - 1},${y}`);

      const isCellHovered =
        hoverCoord !== null && hoverCoord.x === x && hoverCoord.y === y;

      renderCells.push(
        <div
          key={key}
          onPointerDown={(e) => {
            pointerTypeRef.current = e.pointerType;
          }}
          onPointerEnter={(e) => {
            // hover preview is mouse-only; touch uses tap-to-preview in handleCellClick
            if (e.pointerType === "mouse") setHoverCoordinate({ x, y });
          }}
          onClick={() => handleCellClick(x, y, generatorInfo, buildingInfo?.id)}
          className={`relative ${cellSizeClass} border border-black/10 flex items-center justify-center cursor-pointer transition-all ${
            isCellHovered && isGhost
              ? "z-40"
              : isGhost
                ? "z-30"
                : buildingInfo
                  ? buildingInfo.isOrigin
                    ? "z-30"
                    : "z-10"
                  : ""
          }`}
          style={{
            backgroundColor: isRoad ? "var(--asphalt)" : defaultGrassBg,
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
            <div
              className="absolute top-0 left-0 flex items-center justify-center z-20 pointer-events-none"
              style={{
                width: `${buildingInfo.width * 100}%`,
                height: `${buildingInfo.height * 100}%`,
              }}
            >
              <BuildingSprite
                variant={buildingInfo.variant}
                isLit={gameState.activeBuildingIds.has(buildingInfo.id)}
                isPowered={gameState.activeBuildingIds.has(buildingInfo.id)}
                demand={buildingInfo.demand}
                score={buildingInfo.score}
              />
              {/* Status Indicator Bubble during Activation / Simulation */}
              {gameState.phase !== "placement" && (
                <div className="absolute top-2 right-2 z-30 w-7 h-7 rounded-full bg-white border-2 border-[var(--outline)] flex items-center justify-center shadow-lg">
                  {gameState.activeBuildingIds.has(buildingInfo.id) ? (
                    <img
                      src="/icons/zap.svg"
                      alt="Powered"
                      className="w-4 h-4 text-amber-500"
                    />
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
                  <img
                    src="/icons/alert-x.svg"
                    alt="Invalid Placement"
                    className="w-9 h-9"
                  />
                </div>
              )}
            </div>
          )}
        </div>,
      );
    }
  }

  return (
    <div className="relative flex-1 min-h-0 w-full h-full flex flex-col items-center overflow-hidden">
      {/* Zoom Controls: compact on phones, comfortable on desktop */}
      <div className="self-end mr-1 mb-0.5 sm:mr-0 sm:mb-0 sm:absolute sm:top-2 sm:right-2 z-40 flex items-center gap-0.5 sm:gap-1.5 bg-[var(--panel)]/95 backdrop-blur-xs p-0.5 sm:p-1.5 rounded-xl sm:rounded-2xl border sm:border-2 border-[var(--outline)] shadow-md select-none">
        <button
          onClick={handleZoomOut}
          className="w-7 h-7 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg sm:rounded-xl bg-amber-50 hover:bg-amber-100 text-[var(--ink)] font-black text-sm border border-[var(--outline)] transition active:scale-95"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={handleResetZoom}
          className="px-1.5 min-w-9 h-7 flex items-center justify-center rounded-lg sm:rounded-xl hover:bg-amber-100 text-[var(--ink)] font-bold text-[10px] sm:text-xs transition"
          title="Reset Zoom"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={handleZoomIn}
          className="w-7 h-7 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg sm:rounded-xl bg-amber-50 hover:bg-amber-100 text-[var(--ink)] font-black text-sm border border-[var(--outline)] transition active:scale-95"
          title="Zoom In"
        >
          +
        </button>
      </div>

      {/* Scrollable & Pannable Map Area (finger-drag pans when zoomed in) */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 w-full overflow-auto flex scrollbar-thin"
        style={{ padding: pad, touchAction: "pan-x pan-y" }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setHoverCoordinate(null);
        }}
      >
        {/* Sizer: takes the *scaled* size so scrolling/centering stay correct */}
        <div
          className="m-auto shrink-0"
          style={{ width: boardW * scale, height: boardH * scale }}
        >
          <div
            className="grid p-4 rounded-3xl bg-[var(--board-frame)] border-4 border-[var(--outline)] shadow-2xl"
            style={{
              width: boardW,
              height: boardH,
              gridTemplateColumns: `repeat(${width}, ${cellPx}px)`,
              gridAutoRows: `${cellPx}px`,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            {renderCells}
          </div>
        </div>
      </div>
    </div>
  );
};

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List

from .models import (
    BuildingDefinition,
    LevelDefinition,
    parse_building_definitions,
    parse_level,
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "src" / "data"

def load_building_definitions() -> Dict[str, BuildingDefinition]:
    with open(DATA_DIR / "buildings.json", encoding="utf-8") as f:
        return parse_building_definitions(json.load(f))

def load_level(n: int) -> LevelDefinition:
    with open(DATA_DIR / "campaign" / f"level-{n:02d}.json", encoding="utf-8") as f:
        return parse_level(json.load(f))

def load_all_levels() -> List[LevelDefinition]:
    return [load_level(i) for i in range(1, 11)]

from __future__ import annotations

import json
from typing import Any, Dict

from .connectivity import build_level_index
from .csp_types import ALGORITHMS, MODES
from .models import parse_building_definitions, parse_level
from .solver import run_csp_benchmark_comparison, solve_csp_level


def solve_request(body: Any) -> Dict[str, Any]:
    if not isinstance(body, dict):
        raise ValueError("Body harus berupa JSON object")

    algorithm = body.get("algorithm", "mrv_forward_checking")
    mode = body.get("mode", "optimization")
    timeout_ms = body.get("timeoutMs")
    compare = bool(body.get("compare", False))

    if algorithm not in ALGORITHMS:
        raise ValueError(f"algorithm harus salah satu dari {list(ALGORITHMS)}")
    if mode not in MODES:
        raise ValueError(f"mode harus salah satu dari {list(MODES)}")
    if timeout_ms is not None and (
        not isinstance(timeout_ms, (int, float)) or isinstance(timeout_ms, bool) or timeout_ms <= 0
    ):
        raise ValueError("timeoutMs harus berupa angka positif")

    try:
        level = parse_level(body.get("level"))
        defs = parse_building_definitions(body.get("buildingDefinitions"))
        level_index = build_level_index(level, defs)
        if compare:
            result = run_csp_benchmark_comparison(level_index, mode)
        else:
            result = solve_csp_level(level_index, algorithm, mode, timeout_ms)
    except (ValueError, KeyError, TypeError) as exc:
        raise ValueError(f"Data level tidak valid: {exc}") from exc

    return result.to_dict()


def solve_from_json(text: str) -> str:
    try:
        return json.dumps({"ok": True, "result": solve_request(json.loads(text))})
    except ValueError as exc:
        return json.dumps({"ok": False, "error": str(exc)})

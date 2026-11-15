import json
import time
from typing import Dict, List, Set, Tuple, Optional, Any

def cell_key(x: int, y: int) -> str:
    return f"{x},{y}"

def get_footprint_cells(origin: Dict[str, int], width: int, height: int) -> List[Dict[str, int]]:
    cells = []
    for dy in range(height):
        for dx in range(width):
            cells.append({"x": origin["x"] + dx, "y": origin["y"] + dy})
    return cells

def get_footprint_boundary_neighbors(origin: Dict[str, int], width: int, height: int) -> List[Dict[str, int]]:
    boundary: List[Dict[str, int]] = []
    ox, oy = origin["x"], origin["y"]
    # North & South borders
    for x in range(ox, ox + width):
        boundary.append({"x": x, "y": oy - 1})
        boundary.append({"x": x, "y": oy + height})
    # West & East borders
    for y in range(oy, oy + height):
        boundary.append({"x": ox - 1, "y": y})
        boundary.append({"x": ox + width, "y": y})
    return boundary

def compute_road_components(roads: List[Dict[str, int]]) -> Tuple[List[Dict[str, Any]], Dict[str, str]]:
    road_set = {cell_key(r["x"], r["y"]) for r in roads}
    visited: Set[str] = set()
    components: List[Dict[str, Any]] = []
    cell_to_comp: Dict[str, str] = {}
    
    alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    comp_idx = 0

    for road in roads:
        rk = cell_key(road["x"], road["y"])
        if rk in visited:
            continue
        
        comp_id = alpha[comp_idx] if comp_idx < len(alpha) else f"Net{comp_idx + 1}"
        comp_idx += 1
        
        comp_cells: List[Dict[str, int]] = []
        queue = [road]
        visited.add(rk)
        cell_to_comp[rk] = comp_id
        
        while queue:
            curr = queue.pop(0)
            comp_cells.append(curr)
            
            # 4-orthogonal neighbors
            for dx, dy in [(0, -1), (0, 1), (1, 0), (-1, 0)]:
                nx, ny = curr["x"] + dx, curr["y"] + dy
                nk = cell_key(nx, ny)
                if nk in road_set and nk not in visited:
                    visited.add(nk)
                    cell_to_comp[nk] = comp_id
                    queue.append({"x": nx, "y": ny})
                    
        components.append({"id": comp_id, "cells": comp_cells})
        
    return components, cell_to_comp

class LevelIndex:
    def __init__(self, level: Dict[str, Any], building_definitions: Dict[str, Any]):
        self.level = level
        self.building_definitions = building_definitions
        self.road_components, self.road_cell_to_component_id = compute_road_components(level["roads"])
        
        self.occupied_cells: Dict[str, str] = {}
        for r in level["roads"]:
            self.occupied_cells[cell_key(r["x"], r["y"])] = "road"
        for t in level.get("terrain", []):
            self.occupied_cells[cell_key(t["x"], t["y"])] = "terrain"
            
        self.building_to_network_id: Dict[str, Optional[str]] = {}
        for b in level["buildings"]:
            b_def = building_definitions[b["variant"]]
            cells = get_footprint_cells(b["origin"], b_def["width"], b_def["height"])
            for c in cells:
                self.occupied_cells[cell_key(c["x"], c["y"])] = f"building:{b['id']}"
                
            boundary = get_footprint_boundary_neighbors(b["origin"], b_def["width"], b_def["height"])
            touching_nets: Set[str] = set()
            for neighbor in boundary:
                net_id = self.road_cell_to_component_id.get(cell_key(neighbor["x"], neighbor["y"]))
                if net_id:
                    touching_nets.add(net_id)
                    
            if len(touching_nets) == 1:
                self.building_to_network_id[b["id"]] = list(touching_nets)[0]
            else:
                self.building_to_network_id[b["id"]] = None

def get_connected_generator_candidates(level_index: LevelIndex, gen_width: int, gen_height: int) -> List[Dict[str, Any]]:
    candidates: List[Dict[str, Any]] = []
    grid_width = level_index.level["grid"]["width"]
    grid_height = level_index.level["grid"]["height"]
    
    for y in range(grid_height - gen_height + 1):
        for x in range(grid_width - gen_width + 1):
            origin = {"x": x, "y": y}
            footprint = get_footprint_cells(origin, gen_width, gen_height)
            
            overlaps = any(cell_key(c["x"], c["y"]) in level_index.occupied_cells for c in footprint)
            if overlaps:
                continue
                
            boundary = get_footprint_boundary_neighbors(origin, gen_width, gen_height)
            touching_nets: Set[str] = set()
            for b in boundary:
                net_id = level_index.road_cell_to_component_id.get(cell_key(b["x"], b["y"]))
                if net_id:
                    touching_nets.add(net_id)
                    
            if len(touching_nets) == 1:
                candidates.append({
                    "origin": origin,
                    "network_id": list(touching_nets)[0]
                })
    return candidates

def evaluate_objective(condition: Dict[str, Any], level: Dict[str, Any], b_defs: Dict[str, Any], powered_ids: Set[str]) -> bool:
    cond_type = condition["type"]
    if cond_type == "allBuildingsPowered":
        return all(b["id"] in powered_ids for b in level["buildings"])
    elif cond_type == "minTotalPowered":
        return len(powered_ids) >= condition["min"]
    elif cond_type == "buildingPowered":
        return condition["buildingId"] in powered_ids
    elif cond_type == "categoryCount":
        count = sum(1 for b in level["buildings"] if b["id"] in powered_ids and b_defs[b["variant"]]["category"] == condition["category"])
        return count >= condition["min"]
    return True

def compute_stars(is_met: bool, score: int, stars_cfg: Dict[str, int]) -> int:
    if not is_met:
        return 0
    if score >= stars_cfg.get("three", 999999):
        return 3
    if score >= stars_cfg.get("two", 999999):
        return 2
    return 1

def solve_activation_for_capacities(level_index: LevelIndex, net_gen_map: Dict[str, int]) -> Dict[str, Any]:
    active_building_ids: List[str] = []
    network_capacities: List[Dict[str, Any]] = []
    
    for comp in level_index.road_components:
        net_id = comp["id"]
        gen = net_gen_map.get(net_id, 0)
        net_buildings = [b for b in level_index.level["buildings"] if level_index.building_to_network_id.get(b["id"]) == net_id]
        
        total_demand = sum(level_index.building_definitions[b["variant"]]["demand"] for b in net_buildings)
        
        if gen >= total_demand:
            for b in net_buildings:
                active_building_ids.append(b["id"])
            network_capacities.append({
                "networkId": net_id,
                "generation": gen,
                "demand": total_demand,
                "remaining": gen - total_demand
            })
        else:
            # 0/1 Knapsack subset to maximize score within capacity
            best_subset: List[str] = []
            best_score = -1
            best_demand = 0
            n = len(net_buildings)
            
            for mask in range(1 << n):
                cur_demand = 0
                cur_score = 0
                cur_ids: List[str] = []
                for i in range(n):
                    if mask & (1 << i):
                        b = net_buildings[i]
                        d = level_index.building_definitions[b["variant"]]["demand"]
                        cur_demand += d
                        cur_score += b["score"]
                        cur_ids.append(b["id"])
                if cur_demand <= gen:
                    if cur_score > best_score or (cur_score == best_score and cur_demand < best_demand):
                        best_score = cur_score
                        best_demand = cur_demand
                        best_subset = cur_ids
                        
            for bid in best_subset:
                active_building_ids.append(bid)
            network_capacities.append({
                "networkId": net_id,
                "generation": gen,
                "demand": best_demand,
                "remaining": gen - best_demand
            })
            
    active_set = set(active_building_ids)
    is_met = evaluate_objective(level_index.level["objective"], level_index.level, level_index.building_definitions, active_set)
    total_score = sum(b["score"] for b in level_index.level["buildings"] if b["id"] in active_set)
    stars = compute_stars(is_met, total_score, level_index.level["stars"])
    
    return {
        "active_building_ids": active_building_ids,
        "powered_building_ids": list(active_set),
        "score": total_score,
        "stars": stars,
        "is_complete": is_met,
        "network_capacities": network_capacities
    }

class CSPSolver:
    def __init__(self, level_index: LevelIndex, algorithm: str = "mrv_forward_checking", mode: str = "optimization", timeout_ms: int = 10000):
        self.level_index = level_index
        self.algorithm = algorithm
        self.mode = mode
        self.timeout_sec = timeout_ms / 1000.0
        
        self.gen_def = level_index.building_definitions.get("generator", {"width": 1, "height": 1, "output": 5})
        self.inventory_count = level_index.level["inventory"].get("generator", 0)
        
        self.candidates = get_connected_generator_candidates(level_index, self.gen_def["width"], self.gen_def["height"])
        
        self.net_candidates_map: Dict[str, List[int]] = {comp["id"]: [] for comp in level_index.road_components}
        for idx, cand in enumerate(self.candidates):
            self.net_candidates_map[cand["network_id"]].append(idx)
            
        self.nodes_visited = 0
        self.backtracks = 0
        self.start_time = 0.0
        self.is_timeout = False
        self.best_solution: Optional[Dict[str, Any]] = None
        self.best_score = -1
        self.max_possible_score = sum(b["score"] for b in level_index.level["buildings"])
        
    def solve(self) -> Dict[str, Any]:
        self.start_time = time.perf_counter()
        occupied_set: Set[str] = set()
        current_placements: List[Dict[str, Any]] = []
        current_net_gen: Dict[str, int] = {comp["id"]: 0 for comp in self.level_index.road_components}
        
        def backtrack(placed_count: int, min_cand_idx: int) -> bool:
            self.nodes_visited += 1
            if time.perf_counter() - self.start_time > self.timeout_sec:
                self.is_timeout = True
                return True
                
            eval_res = solve_activation_for_capacities(self.level_index, current_net_gen)
            if eval_res["is_complete"]:
                if (self.best_solution is None or
                    eval_res["score"] > self.best_score or
                    (eval_res["score"] == self.best_score and eval_res["stars"] > self.best_solution["stars"])):
                    self.best_score = eval_res["score"]
                    self.best_solution = {
                        "generators": [{"typeId": "generator", "origin": dict(p["origin"])} for p in current_placements],
                        "activeBuildingIds": list(eval_res["active_building_ids"]),
                        "poweredBuildingIds": list(eval_res["powered_building_ids"]),
                        "networkCapacities": list(eval_res["network_capacities"]),
                        "score": eval_res["score"],
                        "stars": eval_res["stars"],
                        "isComplete": eval_res["is_complete"]
                    }
                    if self.mode == "feasibility":
                        return True
                    if eval_res["score"] >= self.max_possible_score and eval_res["stars"] == 3:
                        return True
                        
            if placed_count >= self.inventory_count:
                return False
                
            candidate_indices: List[int] = []
            
            # --- Algorithm 1: Plain Backtracking ---
            if self.algorithm == "backtracking":
                candidate_indices = list(range(min_cand_idx, len(self.candidates)))
                
            # --- Algorithm 2: Backtracking with MRV ---
            elif self.algorithm == "mrv":
                deficits = []
                for comp in self.level_index.road_components:
                    nid = comp["id"]
                    demand = sum(self.level_index.building_definitions[b["variant"]]["demand"]
                                 for b in self.level_index.level["buildings"]
                                 if self.level_index.building_to_network_id.get(b["id"]) == nid)
                    cur_gen = current_net_gen.get(nid, 0)
                    deficit = max(0, demand - cur_gen)
                    avail = sum(1 for cidx in self.net_candidates_map.get(nid, []) if cidx >= min_cand_idx)
                    deficits.append((avail, -deficit, nid))
                deficits.sort()
                for _, _, nid in deficits:
                    for cidx in self.net_candidates_map.get(nid, []):
                        if cidx >= min_cand_idx:
                            candidate_indices.append(cidx)
                            
            # --- Algorithm 3: Backtracking with MRV + Forward Checking ---
            else:
                priorities = []
                for comp in self.level_index.road_components:
                    nid = comp["id"]
                    demand = sum(self.level_index.building_definitions[b["variant"]]["demand"]
                                 for b in self.level_index.level["buildings"]
                                 if self.level_index.building_to_network_id.get(b["id"]) == nid)
                    cur_gen = current_net_gen.get(nid, 0)
                    deficit = max(0, demand - cur_gen)
                    # Forward Checking: prune branches where network already exceeds demand
                    valid_indices = [
                        cidx for cidx in self.net_candidates_map.get(nid, [])
                        if cidx >= min_cand_idx and not (cur_gen >= demand and demand > 0)
                    ]
                    priorities.append((len(valid_indices), -deficit, nid, valid_indices))
                priorities.sort()
                for _, _, _, valid_list in priorities:
                    candidate_indices.extend(valid_list)
                    
            # Symmetry breaking: place generator at candidate positions
            gw, gh = self.gen_def["width"], self.gen_def["height"]
            for cand_idx in candidate_indices:
                cand = self.candidates[cand_idx]
                footprint = get_footprint_cells(cand["origin"], gw, gh)
                
                if any(cell_key(c["x"], c["y"]) in occupied_set for c in footprint):
                    continue
                    
                for c in footprint:
                    occupied_set.add(cell_key(c["x"], c["y"]))
                current_placements.append({"typeId": "generator", "origin": cand["origin"]})
                current_net_gen[cand["network_id"]] += self.gen_def["output"]
                
                done = backtrack(placed_count + 1, cand_idx + 1)
                if done:
                    return True
                    
                self.backtracks += 1
                for c in footprint:
                    occupied_set.remove(cell_key(c["x"], c["y"]))
                current_placements.pop()
                current_net_gen[cand["network_id"]] -= self.gen_def["output"]
                
            return False
            
        backtrack(0, 0)
        duration_ms = round((time.perf_counter() - self.start_time) * 1000)
        
        return {
            "stats": {
                "algorithm": self.algorithm,
                "nodesVisited": self.nodes_visited,
                "backtracks": self.backtracks,
                "durationMs": duration_ms,
                "solutionFound": self.best_solution is not None,
                "score": self.best_score if self.best_score >= 0 else 0,
                "isTimeout": self.is_timeout
            },
            "solution": self.best_solution
        }

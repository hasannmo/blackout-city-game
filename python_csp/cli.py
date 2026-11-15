import sys
import json
from solver import LevelIndex, CSPSolver

def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input:
            print(json.dumps({"error": "No input provided"}))
            return
            
        data = json.loads(raw_input)
        level = data["level"]
        building_definitions = data["buildingDefinitions"]
        algorithm = data.get("algorithm", "mrv_forward_checking")
        mode = data.get("mode", "optimization")
        compare_all = data.get("compareAll", False)
        timeout_ms = data.get("timeoutMs", 10000)
        
        level_index = LevelIndex(level, building_definitions)
        
        if compare_all:
            algos = ["backtracking", "mrv", "mrv_forward_checking"]
            comparison = []
            best_res = None
            for algo in algos:
                solver = CSPSolver(level_index, algorithm=algo, mode=mode, timeout_ms=timeout_ms)
                res = solver.solve()
                comparison.append(res["stats"])
                if best_res is None or (res["solution"] and not best_res.get("solution")):
                    best_res = res
                elif res["solution"] and best_res.get("solution") and res["solution"]["score"] > best_res["solution"]["score"]:
                    best_res = res
                    
            output = {
                "stats": best_res["stats"] if best_res else comparison[-1],
                "solution": best_res["solution"] if best_res else None,
                "comparison": comparison
            }
            print(json.dumps(output))
        else:
            solver = CSPSolver(level_index, algorithm=algorithm, mode=mode, timeout_ms=timeout_ms)
            res = solver.solve()
            print(json.dumps(res))
            
    except Exception as e:
        import traceback
        print(json.dumps({"error": str(e), "traceback": traceback.format_exc()}))

if __name__ == "__main__":
    main()

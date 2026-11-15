import os
import json
import sys
from solver import LevelIndex, CSPSolver

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    b_path = os.path.join(root_dir, "src", "data", "buildings.json")
    with open(b_path, "r") as f:
        building_definitions = json.load(f)

    level_files = [f"level-{i:02d}.json" for i in range(1, 11)]
    algorithms = ["backtracking", "mrv", "mrv_forward_checking"]

    print("=" * 106)
    print("                 BLACKOUT CITY - PYTHON CSP ALGORITHMS ACADEMIC BENCHMARK")
    print("=" * 106)
    print("Level,Algorithm,DurationMs,NodesVisited,Backtracks,SolutionFound,Score")

    for l_file in level_files:
        l_path = os.path.join(root_dir, "src", "data", "campaign", l_file)
        if not os.path.exists(l_path):
            continue
        with open(l_path, "r") as f:
            level = json.load(f)

        level_index = LevelIndex(level, building_definitions)

        for algo in algorithms:
            solver = CSPSolver(level_index, algorithm=algo, mode="optimization")
            res = solver.solve()
            stats = res["stats"]
            print(f"{level['id']},{algo},{stats['durationMs']},{stats['nodesVisited']},{stats['backtracks']},{str(stats['solutionFound']).lower()},{stats['score']}")

    print("=" * 106)
    print("Python Benchmark complete!")

if __name__ == "__main__":
    main()

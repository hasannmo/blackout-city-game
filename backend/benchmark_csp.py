from __future__ import annotations

import csv

from blackout_csp import build_level_index, solve_csp_level
from blackout_csp.loader import load_all_levels, load_building_definitions

ALGORITHMS = ["backtracking", "mrv", "mrv_forward_checking", "mrv_nc", "mrv_ac3"]
HEADER = ["Level", "Algorithm", "DurationMs", "NodesVisited", "Backtracks", "SolutionFound", "Score"]

def main() -> None:
    defs = load_building_definitions()
    line = "=" * 106
    print(line)
    print("BLACKOUT CITY - CSP ALGORITHMS ACADEMIC BENCHMARK (Python)".center(106))
    print(line)
    print(",".join(HEADER))

    rows = []
    for level in load_all_levels():
        index = build_level_index(level, defs)
        for algo in ALGORITHMS:
            res = solve_csp_level(index, algorithm=algo, mode="optimization")
            s = res.stats
            row = [
                level.id,
                algo,
                s.duration_ms,
                s.nodes_visited,
                s.backtracks,
                str(s.solution_found).lower(),
                s.score,
            ]
            rows.append(row)
            print(",".join(map(str, row)))

    with open("benchmark_results.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(HEADER)
        writer.writerows(rows)

    print(line)
    print("Benchmark complete! -> benchmark_results.csv")

if __name__ == "__main__":
    main()

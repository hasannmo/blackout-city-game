import unittest

from blackout_csp import build_level_index, run_csp_benchmark_comparison, solve_csp_level
from blackout_csp.loader import load_all_levels, load_building_definitions, load_level

class CSPSolverTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.defs = load_building_definitions()

    def test_level1_all_algorithms_feasible(self):
        index = build_level_index(load_level(1), self.defs)
        results = {
            algo: solve_csp_level(index, algorithm=algo, mode="feasibility")
            for algo in ("backtracking", "mrv", "mrv_forward_checking")
        }
        for algo, res in results.items():
            with self.subTest(algo=algo):
                self.assertIsNotNone(res.solution)
                self.assertTrue(res.solution.is_complete)
        self.assertGreater(results["mrv_forward_checking"].stats.nodes_visited, 0)

    def test_benchmark_comparison_level2(self):
        index = build_level_index(load_level(2), self.defs)
        comp = run_csp_benchmark_comparison(index, "optimization")
        self.assertIsNotNone(comp.comparison)
        self.assertEqual(len(comp.comparison), 3)
        for stats in comp.comparison:
            self.assertTrue(stats.solution_found)
            self.assertGreater(stats.score, 0)
            self.assertGreaterEqual(stats.duration_ms, 0)

    def test_level5_optimal_has_at_least_two_stars(self):
        index = build_level_index(load_level(5), self.defs)
        res = solve_csp_level(index, algorithm="mrv_forward_checking", mode="optimization")
        self.assertIsNotNone(res.solution)
        self.assertTrue(res.solution.is_complete)
        self.assertGreaterEqual(res.solution.stars, 2)

    def test_result_json_shape_matches_typescript_contract(self):
        index = build_level_index(load_level(1), self.defs)
        data = solve_csp_level(index, mode="feasibility").to_dict()
        self.assertEqual(
            set(data["stats"]),
            {"algorithm", "nodesVisited", "backtracks", "durationMs",
             "solutionFound", "score", "isTimeout"},
        )
        self.assertEqual(
            set(data["solution"]),
            {"generators", "activeBuildingIds", "poweredBuildingIds",
             "networkCapacities", "score", "stars", "isComplete"},
        )
        self.assertEqual(set(data["solution"]["generators"][0]), {"typeId", "origin"})

class LevelValidationTests(unittest.TestCase):
    def test_all_levels_have_valid_connectivity(self):
        defs = load_building_definitions()
        for level in load_all_levels():
            with self.subTest(level=level.id):
                index = build_level_index(level, defs)
                self.assertGreater(len(index.road_components), 0)
                for b in level.buildings:
                    self.assertIsNotNone(
                        index.building_to_network_id.get(b.id),
                        f"{b.id} di {level.id} harus menyentuh tepat 1 jaringan jalan",
                    )
                    d = defs[b.variant]
                    self.assertLessEqual(b.origin.x + d.width, level.grid_width)
                    self.assertLessEqual(b.origin.y + d.height, level.grid_height)

if __name__ == "__main__":
    unittest.main()

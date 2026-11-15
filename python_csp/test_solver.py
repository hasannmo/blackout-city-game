import unittest
import json
import os
from solver import LevelIndex, CSPSolver

class TestPythonCSPSolver(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        b_path = os.path.join(root_dir, "src", "data", "buildings.json")
        with open(b_path, "r") as f:
            cls.building_definitions = json.load(f)
            
        cls.levels = {}
        for i in range(1, 11):
            l_path = os.path.join(root_dir, "src", "data", "campaign", f"level-{i:02d}.json")
            if os.path.exists(l_path):
                with open(l_path, "r") as f:
                    cls.levels[f"level-{i:02d}"] = json.load(f)

    def test_level_1_all_algorithms(self):
        lvl = self.levels["level-01"]
        index = LevelIndex(lvl, self.building_definitions)
        for algo in ["backtracking", "mrv", "mrv_forward_checking"]:
            solver = CSPSolver(index, algorithm=algo, mode="feasibility")
            res = solver.solve()
            self.assertTrue(res["stats"]["solutionFound"])
            self.assertEqual(res["solution"]["score"], 10)
            self.assertEqual(res["solution"]["stars"], 3)

    def test_level_5_optimization_3_stars(self):
        lvl = self.levels["level-05"]
        index = LevelIndex(lvl, self.building_definitions)
        solver = CSPSolver(index, algorithm="mrv_forward_checking", mode="optimization")
        res = solver.solve()
        self.assertTrue(res["stats"]["solutionFound"])
        self.assertEqual(res["solution"]["score"], 80)
        self.assertEqual(res["solution"]["stars"], 3)

    def test_level_10_all_algorithms_solve(self):
        lvl = self.levels["level-10"]
        index = LevelIndex(lvl, self.building_definitions)
        solver = CSPSolver(index, algorithm="mrv_forward_checking", mode="optimization")
        res = solver.solve()
        self.assertTrue(res["stats"]["solutionFound"])
        self.assertEqual(res["solution"]["stars"], 3)
        self.assertGreaterEqual(res["solution"]["score"], 100)

if __name__ == "__main__":
    unittest.main()

import json
import unittest

from blackout_csp.bridge import solve_from_json, solve_request
from blackout_csp.loader import DATA_DIR

def _load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

class BridgeTests(unittest.TestCase):
    def setUp(self):
        self.defs = _load(DATA_DIR / "buildings.json")
        self.level = _load(DATA_DIR / "campaign" / "level-05.json")

    def test_solve_from_json_ok(self):
        text = json.dumps({"level": self.level, "buildingDefinitions": self.defs,
                           "algorithm": "mrv_forward_checking", "mode": "optimization"})
        out = json.loads(solve_from_json(text))
        self.assertTrue(out["ok"])
        self.assertEqual(out["result"]["stats"]["score"], 80)
        self.assertEqual(out["result"]["solution"]["stars"], 3)

    def test_compare_returns_all_algorithms(self):
        out = solve_request({"level": self.level, "buildingDefinitions": self.defs, "compare": True})
        self.assertEqual(len(out["comparison"]), 5)

    def test_errors_are_returned_not_raised(self):
        for text in ("bukan json", "[]", json.dumps({"buildingDefinitions": self.defs}),
                     json.dumps({"level": self.level, "buildingDefinitions": self.defs, "mode": "x"})):
            with self.subTest(text=text[:30]):
                out = json.loads(solve_from_json(text))
                self.assertFalse(out["ok"])
                self.assertTrue(out["error"])

if __name__ == "__main__":
    unittest.main()

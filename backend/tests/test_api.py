import json
import unittest

from app import app
from blackout_csp.loader import DATA_DIR

def _load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

class APITests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.defs = _load(DATA_DIR / "buildings.json")
        self.level = _load(DATA_DIR / "campaign" / "level-02.json")

    def test_health(self):
        self.assertEqual(self.client.get("/api/health").get_json(), {"status": "ok"})

    def test_solve_single(self):
        res = self.client.post("/api/solve", json={
            "level": self.level, "buildingDefinitions": self.defs,
            "algorithm": "mrv", "mode": "feasibility",
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["stats"]["solutionFound"])
        self.assertNotIn("comparison", data)
        self.assertEqual(res.headers["Access-Control-Allow-Origin"], "*")

    def test_solve_compare(self):
        res = self.client.post("/api/solve", json={
            "level": self.level, "buildingDefinitions": self.defs, "compare": True,
        })
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.get_json()["comparison"]), 3)

    def test_bad_requests(self):
        self.assertEqual(self.client.post("/api/solve", data="x").status_code, 400)
        res = self.client.post("/api/solve", json={
            "level": self.level, "buildingDefinitions": self.defs, "algorithm": "nope"})
        self.assertEqual(res.status_code, 400)
        res = self.client.post("/api/solve", json={"buildingDefinitions": self.defs})
        self.assertEqual(res.status_code, 400)

    def test_preflight(self):
        res = self.client.options("/api/solve")
        self.assertIn("Content-Type", res.headers["Access-Control-Allow-Headers"])

if __name__ == "__main__":
    unittest.main()

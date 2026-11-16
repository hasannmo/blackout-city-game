import unittest

from blackout_csp import build_level_index, solve_csp_level
from blackout_csp.consistency import (
    ac3,
    build_generator_csp,
    check_level_consistency,
    is_k_consistent,
    is_strongly_k_consistent,
    node_consistency,
    path_violations,
)
from blackout_csp.domain import get_connected_generator_candidates
from blackout_csp.loader import load_all_levels, load_building_definitions, load_level


class ConsistencyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.defs = load_building_definitions()

    def _index(self, n):
        return build_level_index(load_level(n), self.defs)

    def test_node_consistency_equals_solver_candidates(self):
        for level in load_all_levels():
            with self.subTest(level=level.id):
                index = build_level_index(level, self.defs)
                csp = build_generator_csp(index)
                if csp.n_vars == 0:
                    continue
                nc = node_consistency(csp)
                gen = self.defs["generator"]
                expected = [c.origin for c in get_connected_generator_candidates(index, gen.width, gen.height)]
                self.assertEqual(nc.domains[0], expected)

    def test_ac3_result_is_arc_consistent(self):
        for level in load_all_levels():
            with self.subTest(level=level.id):
                csp = build_generator_csp(build_level_index(level, self.defs))
                res = ac3(csp, node_consistency(csp).domains)
                self.assertTrue(res.consistent)
                self.assertTrue(is_strongly_k_consistent(csp, res.domains, 2))

    def test_level4_ac3_prunes_ordering_bounds(self):
        csp = build_generator_csp(self._index(4))
        res = ac3(csp, node_consistency(csp).domains)
        self.assertEqual([len(res.domains[v]) for v in range(3)], [9, 9, 9])
        self.assertNotIn((3, 5), [(p.x, p.y) for p in res.domains[0]])
        self.assertNotIn((4, 0), [(p.x, p.y) for p in res.domains[2]])

    def test_arc_consistent_but_not_path_consistent(self):
        # Slide hal. 49: arc consistency tidak menangkap semua inkonsistensi.
        csp = build_generator_csp(self._index(4))
        doms = ac3(csp, node_consistency(csp).domains).domains
        self.assertTrue(is_k_consistent(csp, doms, 2))
        self.assertFalse(is_k_consistent(csp, doms, 3))
        i, a, j, b, k = path_violations(csp, doms, limit=1)[0]
        self.assertEqual((i, j, k), (0, 2, 1))

    def test_two_generator_levels_are_strongly_3_consistent(self):
        for n in (2, 3, 6):
            with self.subTest(level=n):
                report = check_level_consistency(self._index(n))
                self.assertEqual(report.stages[-1].strong_k, 3)

    def test_wipeout_when_too_many_generators(self):
        index = self._index(7)  # hanya 4 kandidat valid
        csp = build_generator_csp(index, n_vars=5)
        res = ac3(csp, node_consistency(csp).domains)
        self.assertFalse(res.consistent)
        self.assertIsNotNone(res.wiped_out)

    def test_report_shape(self):
        data = check_level_consistency(self._index(4)).to_dict()
        self.assertEqual(set(data), {"levelId", "variables", "rawDomainSize",
                                     "nodeRemovedByReason", "ac3", "stages"})
        self.assertEqual([s["name"] for s in data["stages"]], ["raw", "node", "ac3"])


class MRVConsistencySolverTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        defs = load_building_definitions()
        cls.indexes = [build_level_index(level, defs) for level in load_all_levels()]

    def test_mrv_nc_explores_same_tree_as_mrv(self):
        # domain.py sudah node-consistent, jadi k=1 eksplisit tidak mengubah pohon pencarian
        for index in self.indexes:
            with self.subTest(level=index.level.id):
                mrv = solve_csp_level(index, "mrv", "optimization")
                nc = solve_csp_level(index, "mrv_nc", "optimization")
                self.assertEqual(nc.stats.nodes_visited, mrv.stats.nodes_visited)
                self.assertEqual(nc.stats.score, mrv.stats.score)

    def test_mrv_ac3_keeps_score_and_never_expands_more(self):
        for index in self.indexes:
            with self.subTest(level=index.level.id):
                mrv = solve_csp_level(index, "mrv", "optimization")
                ac = solve_csp_level(index, "mrv_ac3", "optimization")
                self.assertEqual(ac.stats.score, mrv.stats.score)
                self.assertEqual(ac.solution.stars, mrv.solution.stars)
                self.assertLessEqual(ac.stats.nodes_visited, mrv.stats.nodes_visited)


if __name__ == "__main__":
    unittest.main()

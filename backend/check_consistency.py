"""CLI checker k-consistency (k=1 node, k=2 arc/AC-3, k=3 path) untuk level campaign.

Pemakaian (dari folder backend/):
    python check_consistency.py            # semua level
    python check_consistency.py 4 9        # level tertentu
    python check_consistency.py 4 -v       # detail domain + contoh pelanggaran
    python check_consistency.py --json     # output JSON
"""

from __future__ import annotations

import json
import sys

from blackout_csp import build_level_index
from blackout_csp.consistency import check_level_consistency
from blackout_csp.loader import load_building_definitions, load_level

STAGE_LABEL = {"raw": "Domain mentah", "node": "Setelah node consistency", "ac3": "Setelah AC-3"}


def _yn(b: bool) -> str:
    return "ya" if b else "TIDAK"


def main(argv: list) -> None:
    verbose = "-v" in argv
    as_json = "--json" in argv
    levels = [int(a) for a in argv if a.isdigit()] or list(range(1, 11))

    defs = load_building_definitions()
    reports = [check_level_consistency(build_level_index(load_level(n), defs)) for n in levels]

    if as_json:
        print(json.dumps([r.to_dict() for r in reports], indent=2))
        return

    line = "=" * 100
    print(line)
    print("BLACKOUT CITY - CSP CONSISTENCY CHECKER (k=1 node, k=2 arc, k=3 path)".center(100))
    print(line)
    header = (
        f"{'Level':<9}{'Var':>4}{'|D| raw':>9}{'|D| NC':>8}{'|D| AC-3 (per var)':>24}"
        f"{'Revise':>8}{'NC':>6}{'AC':>6}{'PC':>6}{'Strong-k':>10}{'Pel. PC':>9}"
    )
    print(header)
    print("-" * 100)
    for r in reports:
        raw, node, ac = r.stages
        nc_size = next(iter(node.domain_sizes.values()), 0)
        ac_sizes = "/".join(str(s) for s in ac.domain_sizes.values()) or "-"
        if not r.ac3_consistent:
            ac_sizes = f"WIPEOUT {r.ac3_wiped_out}"
        print(
            f"{r.level_id:<9}{len(r.variables):>4}{r.raw_domain_size:>9}{nc_size:>8}{ac_sizes:>24}"
            f"{r.ac3_revisions:>8}{_yn(ac.k_consistent[1]):>6}{_yn(ac.k_consistent[2]):>6}"
            f"{_yn(ac.k_consistent[3]):>6}{ac.strong_k:>10}{ac.violation_counts[3]:>9}"
        )
    print(line)
    print("NC/AC/PC = status 1-, 2-, 3-consistency SETELAH AC-3. Pel. PC = jumlah pelanggaran 3-consistency.")

    if not verbose:
        return

    for r in reports:
        print()
        print(f"### {r.level_id}  variabel: {', '.join(r.variables) or '-'}")
        print(f"Node consistency membuang: {r.node_removed_by_reason or '-'}")
        removed = {v: vals for v, vals in r.ac3_removed.items() if vals}
        print(f"AC-3 membuang: {removed or '-'}  (revise dipanggil {r.ac3_revisions}x)")
        for st in r.stages:
            print(f"  [{STAGE_LABEL[st.name]}] |D| {st.domain_sizes}  strongly {st.strong_k}-consistent")
            for k in (1, 2, 3):
                status = "konsisten" if st.k_consistent[k] else f"{st.violation_counts[k]} pelanggaran"
                print(f"    k={k}: {status}")
                for e in st.examples[k]:
                    print(f"       - {e}")


if __name__ == "__main__":
    main(sys.argv[1:])

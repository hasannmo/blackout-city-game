import React, { useEffect, useState } from "react";
import { useGameStore } from "../../stores/gameStore";
import {
  solveCSPLevel,
  runCSPBenchmarkComparison,
  preloadSolver,
} from "../../api/solverClient";
import type {
  CSPSolverAlgorithm,
  CSPSolverMode,
  CSPSolverResult,
} from "../../engine/csp/types";

interface SolverModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SolverModal: React.FC<SolverModalProps> = ({
  isOpen,
  onClose,
}) => {
  const buildingDefinitions = useGameStore((s) => s.buildingDefinitions);
  const level = useGameStore((s) => s.level);
  const [algorithm, setAlgorithm] = useState<CSPSolverAlgorithm>(
    "mrv_forward_checking",
  );
  const [mode, setMode] = useState<CSPSolverMode>("optimization");
  const [runComparison, setRunComparison] = useState<boolean>(true);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [result, setResult] = useState<CSPSolverResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Muat runtime Python (Pyodide) di latar belakang saat modal dibuka.
  useEffect(() => {
    if (isOpen) preloadSolver().catch(() => undefined);
  }, [isOpen]);

  if (!isOpen) return null;

  // Pencarian CSP dijalankan oleh Python (Pyodide) langsung di browser.
  const handleSolve = async () => {
    setIsSolving(true);
    setError(null);
    try {
      const res = runComparison
        ? await runCSPBenchmarkComparison(level, buildingDefinitions, mode)
        : await solveCSPLevel(level, buildingDefinitions, { algorithm, mode });
      setResult(res);
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSolving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-[var(--panel)] border-4 border-[var(--outline)] rounded-3xl p-4 sm:p-6 max-w-2xl w-full shadow-2xl flex flex-col max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-gray-200 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 border-2 border-[var(--outline)] flex items-center justify-center shadow-xs">
              <img src="/icons/solver.svg" alt="Solver" className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[var(--ink)] leading-none">
                CSP Constraint Solver
              </h2>
              <span className="text-xs font-bold text-gray-500">
                {level.name} · Raw Level Generator & Objective Search
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 sm:w-8 sm:h-8 shrink-0 rounded-xl bg-gray-200 hover:bg-gray-300 font-black text-gray-700 flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Options Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {/* Mode Selection */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-black text-gray-700 uppercase">
              Solver Mode
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMode("optimization")}
                className={`flex-1 py-2 px-3 rounded-xl border-2 border-[var(--outline)] font-bold text-xs transition ${
                  mode === "optimization"
                    ? "bg-[var(--power-yellow)] text-amber-950 font-black shadow-xs"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Optimization (Best Score)
              </button>
              <button
                onClick={() => setMode("feasibility")}
                className={`flex-1 py-2 px-3 rounded-xl border-2 border-[var(--outline)] font-bold text-xs transition ${
                  mode === "feasibility"
                    ? "bg-[var(--power-yellow)] text-amber-950 font-black shadow-xs"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Feasibility (1st Valid)
              </button>
            </div>
          </div>

          {/* Benchmark Comparison Toggle */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-black text-gray-700 uppercase">
              Algorithm Benchmark
            </label>
            <button
              onClick={() => setRunComparison(!runComparison)}
              className={`w-full py-2 px-3 rounded-xl border-2 border-[var(--outline)] font-bold text-xs flex items-center justify-between transition ${
                runComparison
                  ? "bg-amber-100 text-amber-950 font-black border-amber-600"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>Compare All 3 CSP Algorithms</span>
              <span className="text-xs font-black">
                {runComparison ? "ON" : "OFF"}
              </span>
            </button>
          </div>
        </div>

        {/* Algorithm Selection (if not running all 3) */}
        {!runComparison && (
          <div className="flex flex-col gap-1 mb-4">
            <label className="text-xs font-black text-gray-700 uppercase">
              Algorithm Technique
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setAlgorithm("backtracking")}
                className={`py-2 px-2 rounded-xl border-2 border-[var(--outline)] font-bold text-[11px] text-center transition ${
                  algorithm === "backtracking"
                    ? "bg-amber-300 font-black"
                    : "bg-white text-gray-600"
                }`}
              >
                1. Plain Backtrack
              </button>
              <button
                onClick={() => setAlgorithm("mrv")}
                className={`py-2 px-2 rounded-xl border-2 border-[var(--outline)] font-bold text-[11px] text-center transition ${
                  algorithm === "mrv"
                    ? "bg-amber-300 font-black"
                    : "bg-white text-gray-600"
                }`}
              >
                2. MRV Heuristic
              </button>
              <button
                onClick={() => setAlgorithm("mrv_forward_checking")}
                className={`py-2 px-2 rounded-xl border-2 border-[var(--outline)] font-bold text-[11px] text-center transition ${
                  algorithm === "mrv_forward_checking"
                    ? "bg-amber-300 font-black"
                    : "bg-white text-gray-600"
                }`}
              >
                3. MRV + Forward Check
              </button>
            </div>
          </div>
        )}

        {/* Solve Action Button */}
        <button
          onClick={handleSolve}
          disabled={isSolving}
          className="w-full py-3 bg-[var(--btn-green)] hover:brightness-105 active:translate-y-0.5 text-white font-black text-sm rounded-2xl border-2 border-[var(--outline)] shadow-[0_4px_0_var(--btn-green-rim)] transition flex items-center justify-center gap-2 mb-4"
        >
          {isSolving ? (
            <span>Computing Search Space...</span>
          ) : (
            <>
              <img src="/icons/solver.svg" alt="Solve" className="w-5 h-5" />
              <span>RUN CSP SOLVER & BENCHMARK</span>
            </>
          )}
        </button>

        {/* Error (mis. backend Python belum dijalankan) */}
        {error && (
          <div className="text-xs font-bold text-red-700 bg-red-50 border-2 border-red-300 rounded-xl p-3 mb-4">
            {error}
          </div>
        )}

        {/* Benchmark Results Display */}
        {result && (
          <div className="flex flex-col gap-4 bg-white/90 p-4 rounded-2xl border-2 border-[var(--outline)] shadow-inner">
            {/* Comparison Table if Benchmark active */}
            {result.comparison && (
              <div>
                <h3 className="text-xs font-black uppercase text-gray-600 mb-2">
                  Algorithm Benchmark Comparison:
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-300 text-gray-600">
                        <th className="py-1 px-2">Algorithm</th>
                        <th className="py-1 px-2">Time (ms)</th>
                        <th className="py-1 px-2">Nodes Visited</th>
                        <th className="py-1 px-2">Backtracks</th>
                        <th className="py-1 px-2">Score</th>
                        <th className="py-1 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.comparison.map((c) => (
                        <tr
                          key={c.algorithm}
                          className="border-b border-gray-200 font-medium"
                        >
                          <td className="py-1.5 px-2 font-bold text-[var(--ink)]">
                            {c.algorithm === "backtracking"
                              ? "Plain Backtracking"
                              : c.algorithm === "mrv"
                                ? "MRV Heuristic"
                                : "MRV + Forward Checking"}
                          </td>
                          <td className="py-1.5 px-2 font-black text-amber-900">
                            {c.durationMs} ms
                          </td>
                          <td className="py-1.5 px-2">{c.nodesVisited}</td>
                          <td className="py-1.5 px-2">{c.backtracks}</td>
                          <td className="py-1.5 px-2 font-black text-green-700">
                            {c.score} pts
                          </td>
                          <td className="py-1.5 px-2">
                            {c.solutionFound ? (
                              <span className="text-green-700 font-bold">
                                ✓ Solved
                              </span>
                            ) : (
                              <span className="text-red-600 font-bold">
                                ✗ No Solution
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Solution Details */}
            {result.solution ? (
              <div className="flex flex-col gap-2 pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-gray-600">
                    Discovered Layout:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black bg-green-100 text-green-900 px-2 py-0.5 rounded-full border border-green-300">
                      Score: {result.solution.score} pts
                    </span>
                    <span className="text-xs font-black bg-amber-100 text-amber-950 px-2 py-0.5 rounded-full border border-amber-300">
                      Stars: {result.solution.stars} ★
                    </span>
                  </div>
                </div>

                {/* Generator placements coordinates */}
                <div className="text-xs font-bold text-[var(--ink)] bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                  <span className="font-black block text-gray-700 mb-1">
                    Generator Placements (x, y):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {result.solution.generators.map((g, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-amber-200 border border-amber-400 rounded-md font-black text-amber-950"
                      >
                        G#{idx + 1}: ({g.origin.x}, {g.origin.y})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Active buildings count */}
                <div className="text-xs font-bold text-gray-600">
                  Buildings Powered:{" "}
                  <strong className="text-[var(--ink)]">
                    {result.solution.activeBuildingIds.length} of{" "}
                    {level.buildings.length}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="text-xs font-bold text-red-600 p-2">
                No solution satisfying the mandatory objectives was found within
                the timeout limit.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

import type { BuildingDefinitionsMap, LevelDefinition } from "../types";
import type {
  CSPSolverAlgorithm,
  CSPSolverMode,
  CSPSolverResult,
} from "../engine/csp/types";

import initPy from "../../backend/blackout_csp/__init__.py?raw";
import bridgePy from "../../backend/blackout_csp/bridge.py?raw";
import connectivityPy from "../../backend/blackout_csp/connectivity.py?raw";
import cspTypesPy from "../../backend/blackout_csp/csp_types.py?raw";
import domainPy from "../../backend/blackout_csp/domain.py?raw";
import footprintPy from "../../backend/blackout_csp/footprint.py?raw";
import modelsPy from "../../backend/blackout_csp/models.py?raw";
import objectivesPy from "../../backend/blackout_csp/objectives.py?raw";
import solverPy from "../../backend/blackout_csp/solver.py?raw";

const PYTHON_FILES: Record<string, string> = {
  "__init__.py": initPy,
  "bridge.py": bridgePy,
  "connectivity.py": connectivityPy,
  "csp_types.py": cspTypesPy,
  "domain.py": domainPy,
  "footprint.py": footprintPy,
  "models.py": modelsPy,
  "objectives.py": objectivesPy,
  "solver.py": solverPy,
};

interface WorkerResponse {
  id: number;
  ok: boolean;
  result?: string;
  error?: string;
}

type SolveEnvelope =
  | { ok: true; result: CSPSolverResult }
  | { ok: false; error: string };

let worker: Worker | null = null;
let ready: Promise<void> | null = null;
let nextId = 1;
const pending = new Map<
  number,
  { resolve: (value: string) => void; reject: (reason: Error) => void }
>();

function resetWorker(reason: Error): void {
  pending.forEach((p) => p.reject(reason));
  pending.clear();
  worker?.terminate();
  worker = null;
  ready = null;
}

function getWorker(): Worker {
  if (worker) return worker;

  const w = new Worker("/pyodide-worker.js");
  w.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const { id, ok, result, error } = event.data;
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    if (ok) p.resolve(result ?? "");
    else p.reject(new Error(error ?? "Kesalahan tidak diketahui pada worker"));
  };
  w.onerror = () => {
    resetWorker(
      new Error(
        "Gagal memuat Pyodide. Periksa koneksi internet lalu coba lagi.",
      ),
    );
  };
  worker = w;
  return w;
}

function callWorker(message: Record<string, unknown>): Promise<string> {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, ...message });
  });
}

function ensureReady(): Promise<void> {
  if (!ready) {
    ready = callWorker({ type: "init", files: PYTHON_FILES }).then(
      () => undefined,
      (err: Error) => {
        ready = null;
        throw err;
      },
    );
  }
  return ready;
}

/** Panggil saat modal dibuka agar Pyodide sudah siap sebelum tombol ditekan. */
export function preloadSolver(): Promise<void> {
  return ensureReady();
}

async function runPython(body: Record<string, unknown>): Promise<CSPSolverResult> {
  await ensureReady();
  const text = await callWorker({ type: "solve", payload: JSON.stringify(body) });
  const envelope = JSON.parse(text) as SolveEnvelope;
  if (!envelope.ok) throw new Error(envelope.error);
  return envelope.result;
}

export function solveCSPLevel(
  level: LevelDefinition,
  buildingDefinitions: BuildingDefinitionsMap,
  options: {
    algorithm?: CSPSolverAlgorithm;
    mode?: CSPSolverMode;
    timeoutMs?: number;
  } = {},
): Promise<CSPSolverResult> {
  return runPython({ level, buildingDefinitions, ...options, compare: false });
}

export function runCSPBenchmarkComparison(
  level: LevelDefinition,
  buildingDefinitions: BuildingDefinitionsMap,
  mode: CSPSolverMode = "optimization",
): Promise<CSPSolverResult> {
  return runPython({ level, buildingDefinitions, mode, compare: true });
}

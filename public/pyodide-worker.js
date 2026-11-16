const PYODIDE_VERSION = "0.26.3";

const PYODIDE_BASES = [
  "https://cdn.jsdelivr.net/pyodide/v" + PYODIDE_VERSION + "/full/",
  "https://unpkg.com/pyodide@" + PYODIDE_VERSION + "/",
];

let pyodidePromise = null;

async function loadRuntime() {
  const errors = [];
  for (const base of PYODIDE_BASES) {
    try {
      importScripts(base + "pyodide.js");
      return await loadPyodide({ indexURL: base });
    } catch (err) {
      errors.push(base + " -> " + (err && err.message ? err.message : err));
    }
  }
  throw new Error(
    "Pyodide tidak dapat diunduh dari CDN manapun:\n" + errors.join("\n"),
  );
}

async function initPyodide(files) {
  const pyodide = await loadRuntime();
  const root = "/home/pyodide/blackout_csp";
  pyodide.FS.mkdirTree(root);
  for (const [name, source] of Object.entries(files)) {
    pyodide.FS.writeFile(root + "/" + name, source);
  }
  pyodide.runPython(
    "import sys\n" +
      'if "/home/pyodide" not in sys.path:\n' +
      '    sys.path.insert(0, "/home/pyodide")\n' +
      "from blackout_csp.bridge import solve_from_json",
  );
  return pyodide;
}

self.onmessage = async (event) => {
  const { id, type } = event.data;
  try {
    if (type === "init") {
      if (!pyodidePromise) {
        pyodidePromise = initPyodide(event.data.files).catch((err) => {
          pyodidePromise = null;
          throw err;
        });
      }
      await pyodidePromise;
      self.postMessage({ id, ok: true, result: "ready" });
    } else if (type === "solve") {
      if (!pyodidePromise) throw new Error("Pyodide belum diinisialisasi");
      const pyodide = await pyodidePromise;
      pyodide.globals.set("_payload_json", event.data.payload);
      const result = pyodide.runPython("solve_from_json(_payload_json)");
      self.postMessage({ id, ok: true, result });
    } else {
      throw new Error("Tipe pesan tidak dikenal: " + type);
    }
  } catch (err) {
    self.postMessage({
      id,
      ok: false,
      error: err && err.message ? err.message : String(err),
    });
  }
};

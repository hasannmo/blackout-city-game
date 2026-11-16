# ⚡ Blackout City

**Blackout City** is a single-player, grid-based puzzle and electricity simulation game built with React, TypeScript, and Tailwind CSS. The player acts as a city power grid operator, strategically placing limited generators, establishing road network connections, and activating buildings to restore electricity across blacked-out districts.

---

## 🎮 How to Play

Each level follows a clear, three-phase gameplay loop:

### 1. 🏗️ Placement Phase (Day Mode)

- **Select a Generator**: Click on a generator card in the bottom inventory bar.
- **Hover Preview**:
  - **Valid Placement**: Displays the dashed outline generator ghost.
  - **Invalid Placement**: Displays a solid red alert indicator with an `✕`. A generator cannot overlap existing structures (roads, buildings, trees) or bridge multiple disconnected road networks.
- **Place Generator**: Click on an empty grass tile adjacent to a road network to place it. Clicking an already-placed generator removes it back to inventory.
- **Monitor Network Output**: The top HUD tracks generation capacity vs. connected demand in real time.
- **Inspect Building Stats**: Static badges on each building display its energy demand (e.g. `[ 2 ⚡ ]` or `[ 6 ⚡ ]`) and completion score value (e.g. `[ 10 ]` or `[ 30 PTS ]`).
- **Map Navigation**: Use the Zoom in (`+`), Zoom out (`-`), or Reset (`100%`) controls to zoom and pan around larger metropolitan grids.
- **CSP Solver Assistance**: Tapping **CSP SOLVER** opens the solver modal to search the raw level layout and compare algorithm benchmarks.
- **Proceed**: Once your placement strategy is set, click **ACTIVATION →** in the bottom right.

### 2. 💡 Activation Phase (Night Mode)

- The city switches to Night Mode.
- **Auto-Activation**: Any road network where total generator output meets or exceeds connected demand automatically powers its buildings.
- **Manual Toggle**: When network capacity is limited, tap individual connected buildings to manually toggle electricity distribution within your remaining Zap budget.
- Powered buildings illuminate with warm glowing windows and show the round electricity badge.
- **Live Objectives & Stars**: Check the sidebar for live star criteria progress (1 Star: objective, 2 & 3 Stars: score goals).
- **Proceed**: Click **SIMULATE ⚡** to test your grid against the level objectives.

### 3. 📊 Simulation & Results

- The simulation engine compiles your result, checking mandatory objectives, scoring, and star thresholds (1 to 3 stars).
- **Post-Level Actions**:
  - **LEVEL**: Return directly to the Level Selector screen to pick any level.
  - **ADJUST**: Go back to the Activation phase to adjust power distribution without losing placed generators.
  - **NEXT**: Advance immediately to the next campaign level.
  - **RESET (HUD)**: Clears all placements and returns the level to its initial state.

---

## 🏢 Buildings & Power Grid

| Building      |     Size     | Demand | Output |  Score   | Description                                                                                |
| :------------ | :----------: | :----: | :----: | :------: | :----------------------------------------------------------------------------------------- |
| **House**     | $1 \times 1$ | $2$ ⚡ |  $0$   | $10$ pts | Standard residential district building with illuminated night windows.                     |
| **Hospital**  | $2 \times 2$ | $6$ ⚡ |  $0$   | $30$ pts | High-priority medical facility with red cross emblem and illuminated clinic windows.       |
| **Generator** | $1 \times 1$ |  $0$   | $5$ ⚡ |    —     | Deployable power generator that supplies 5 units of electricity to adjacent road networks. |

---

## 🗺️ Campaign Levels (1–10)

All 10 campaign levels are available without sequential locks and can achieve a full **3-Star Rating**:

1. **Level 1 (First Spark)**: $4 \times 4$ grid, introductory single road network.
2. **Level 2 (Dual Line)**: $5 \times 5$ grid, two isolated road networks.
3. **Level 3 (Twin Enclaves)**: $6 \times 5$ grid, strategic generator division.
4. **Level 4 (Triple Cross)**: $6 \times 6$ grid, 3 road networks with obstacle trees.
5. **Level 5 (Grand Metropolis)**: $7 \times 7$ grid, 4 complex road systems.
6. **Level 6 (Medical Center)**: $6 \times 6$ grid, introducing the $2 \times 2$ Hospital.
7. **Level 7 (Regional Care)**: $7 \times 7$ grid, dual networks with 2 Hospitals.
8. **Level 8 (Metro Clinic)**: $8 \times 8$ grid, 3 networks with 3 Hospitals & 5 Houses.
9. **Level 9 (Crossroads Hospital)**: $8 \times 8$ grid, 4 quad-networks with 4 Hospitals.
10. **Level 10 (Mega City Medical)**: $8 \times 8$ grid, high-density metropolis with 4 Hospitals, 6 Houses, and 5 independent networks.

---

## 🧠 Constraint Satisfaction Problem (CSP) Solver

The game features custom, pure implementations (no external solver libraries) of **5 CSP search algorithms** written in **Python**, executed directly in-browser using a **Pyodide Web Worker** (`src/api/solverClient.ts` / `public/pyodide-worker.js`), as well as via standalone Python CLI and benchmark scripts (`backend/blackout_csp/`):

1. **Plain Backtracking (`backtracking`)**: Systematic depth-first exploration with candidate domain filtering and symmetry breaking (ascending candidate index ordering).
2. **Backtracking with MRV (`mrv`)**: Dynamic variable ordering prioritizing networks with the fewest remaining valid candidate placements (Minimum Remaining Values heuristic).
3. **Backtracking with MRV + Forward Checking (`mrv_forward_checking`)**: Combines MRV ordering with forward constraint checking to prune candidates on networks that have already satisfied power demand.
4. **MRV + $k=1$ Node Consistency (`mrv_nc`)**: Enforces 1-consistency by evaluating unary constraints across all grid cells (footprint boundaries, road adjacency, obstacle collision) to construct explicit valid domains before search.
5. **MRV + $k=2$ Arc Consistency / AC-3 (`mrv_ac3`)**: Enforces 2-consistency via AC-3 and Maintaining Arc Consistency (MAC) during search, pruning candidate values that lack supporting compatible assignments among remaining generators.

### Solver Verification & Benchmarks

```bash
# Run backend Python CSP unit tests (17 tests)
npm run test:python
# or directly:
PYTHONPATH=backend python3 -m unittest discover -s backend/tests

# Run Python CSP Benchmark across all 10 campaign levels (generates benchmark_results.csv)
npm run benchmark:csp
# or directly:
python3 backend/benchmark_csp.py

# Run consistency verification tool (k=1 NC, k=2 AC-3, k=3 PC)
python3 backend/check_consistency.py
```

---

## 🛠️ Tech Stack & Architecture

- **Frontend Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vite.dev/)
- **State Management**: [Zustand](https://zustand.docs.pmnd.rs/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with responsive mobile scaling and Day/Night design tokens
- **Typography**: [Google Sans Flex Variable Font](https://fontsource.org/fonts/google-sans-flex)
- **Data Validation**: [Zod](https://zod.dev/)
- **Testing**: [Vitest](https://vitest.dev/) (frontend engine & connectivity) & Python `unittest` (backend CSP solver & consistency)
- **Linter & Formatter**: [oxlint](https://oxc.rs/) & [Prettier](https://prettier.io/)
- **In-Browser Python Runtime**: [Pyodide](https://pyodide.org/) via dedicated Web Worker (`public/pyodide-worker.js`)

### Architecture & Separation of Concerns

- `backend/blackout_csp/`: Core Python CSP solver package.
  - `solver.py`: 5 CSP search algorithms (Backtracking, MRV, MRV+FC, MRV+NC $k=1$, MRV+AC3 $k=2$) with feasibility and optimization modes.
  - `consistency.py`: Formal constraint consistency checkers ($k=1$ Node, $k=2$ Arc / AC-3, $k=3$ Path Consistency).
  - `domain.py` & `connectivity.py`: Road network graph discovery (BFS) and generator placement candidate domain generator.
  - `bridge.py`: JSON bridge interface used by Pyodide in-browser worker and CLI.
- `src/api/solverClient.ts`: Asynchronous Web Worker client that loads `backend/blackout_csp/` modules directly into Pyodide in the browser without requiring a remote server.
- `src/engine/`: Pure, deterministic TypeScript game engine with zero UI dependencies. Handles orthogonal road BFS, boundary calculations, capacity reports, activation states, and scoring.
- `src/stores/`: Zustand store (`gameStore.ts`) connecting UI state with engine functions.
- `src/components/`: Modular React components split into game grid (`GameGrid`), HUD (`GameHUD`), placement toolbar (`PlacementBar`), building sprites, level selector, and CSP modal (`SolverModal`).
- `src/data/`: Data-driven JSON definitions for buildings (`buildings.json`) and campaign levels (`campaign/level-01.json` through `level-10.json`).

---

## 🚀 Local Setup & Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+ LTS recommended)
- [Python](https://www.python.org/) (3.10+ recommended for backend CSP solver and benchmarks)
- `npm` (or `pnpm`)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/hasannmo/blackout-city-game.git
cd blackout-city-game
npm install
```

### 2. Start Local Development Server

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173`.

### 3. Run Verification & Test Suite

```bash
# Run TypeScript unit tests (13 tests)
npm test

# Run Python backend unit tests (17 tests)
npm run test:python

# Run Python CSP Benchmark across all 10 campaign levels
npm run benchmark:csp

# Run TypeScript typecheck
npm run typecheck

# Run linter
npm run lint

# Format codebase
npm run format

# Create production build
npm run build
```

---

## 📁 Project Structure

```text
blackout-city-game/
├── backend/                  # Python CSP solver, consistency checkers, and benchmarks
│   ├── blackout_csp/         # Core Python CSP package (imported in Python & Pyodide)
│   │   ├── bridge.py         # JSON bridge for Pyodide worker and CLI
│   │   ├── connectivity.py   # BFS road component detection & network graph
│   │   ├── consistency.py    # k=1 (Node), k=2 (Arc/AC-3), k=3 (Path) consistency
│   │   ├── csp_types.py      # Dataclasses and type definitions
│   │   ├── domain.py         # Placement candidate generator & domain filtering
│   │   ├── footprint.py      # Multi-tile footprint and boundary neighbor calculations
│   │   ├── models.py         # Data models (BuildingDefinition, Level, Coordinate)
│   │   ├── objectives.py     # Objective satisfaction and star evaluation
│   │   └── solver.py         # 5 CSP algorithms: Backtracking, MRV, MRV+FC, MRV+NC, MRV+AC3
│   ├── tests/                # Python unittests (test_solver, test_consistency, test_bridge)
│   ├── benchmark_csp.py      # Benchmark runner across levels 1–10
│   └── check_consistency.py  # Standalone consistency analyzer
├── docs/                     # Game specifications and architecture design
│   └── blackout-city.md
├── public/
│   ├── favicon.svg           # Brand favicon
│   ├── icons/                # Game icon SVGs and hover assets
│   ├── pyodide-worker.js     # Web Worker executing Python CSP solver via Pyodide
│   └── resources/design/     # Design reference mockups & components
├── src/
│   ├── api/
│   │   └── solverClient.ts   # Client wrapper communicating with Pyodide worker
│   ├── assets/               # Bundled logos, icons, fonts
│   ├── components/
│   │   ├── game/             # Board grid, HUD, sprites, CSP modal, toolbar
│   │   └── screens/          # Home & Level Selector screens
│   ├── data/                 # JSON building definitions & campaign levels (1–10)
│   │   ├── buildings.json
│   │   └── campaign/
│   ├── engine/               # Pure TypeScript game engine
│   │   ├── connectivity/     # Orthogonal road networks & component IDs
│   │   ├── grid/             # Footprint & boundary neighbor calculations
│   │   ├── objectives/       # Objective evaluation & scoring rules
│   │   ├── placement/        # Placement validation & generator actions
│   │   └── simulation/       # Capacity reporting, activation & simulation
│   ├── stores/               # Zustand game store
│   ├── styles/               # CSS variables and Day / Night theme tokens
│   └── types/                # TypeScript interfaces & Zod schemas
└── tests/                    # Vitest test suites (connectivity, simulation, levels, smoke)
```

---

## 📜 License

MIT License. Designed and developed as part of the Blackout City Game project.

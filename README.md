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

The game features custom, pure implementations (no black-box libraries) of three CSP search algorithms in both **TypeScript** and **Python**:

1. **Plain Backtracking**: Systematic depth-first exploration with candidate domain filtering and symmetry breaking.
2. **Backtracking with MRV (Minimum Remaining Values)**: Dynamic variable ordering prioritizing networks with fewest remaining valid candidate placements and largest power deficit.
3. **Backtracking with MRV + Forward Checking**: Combines MRV ordering with forward constraint checking to prune redundant branches on networks that have already satisfied power demand.

### Algorithm Benchmark Execution

```bash
# Run the TypeScript benchmark script across all 10 campaign levels
npm run benchmark:csp

# Run the Python benchmark script across all 10 campaign levels
npm run benchmark:csp:py
# or
python3 python_csp/benchmark.py
```

---

## 🛠️ Tech Stack & Architecture

- **Frontend Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vite.dev/)
- **State Management**: [Zustand](https://zustand.docs.pmnd.rs/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with responsive mobile scaling and Day/Night design tokens
- **Typography**: [Google Sans Flex Variable Font](https://fontsource.org/fonts/google-sans-flex)
- **Data Validation**: [Zod](https://zod.dev/)
- **Testing**: [Vitest](https://vitest.dev/) & Python `unittest`
- **Linter & Formatter**: [oxlint](https://oxc.rs/) & [Prettier](https://prettier.io/)

### Architecture & Separation of Concerns

- `src/engine/`: Pure, deterministic TypeScript logic with **zero** React/UI dependencies. Handles road component BFS, boundary neighbor calculations, capacity reports, activation tracking, simulation scoring, and CSP search.
- `src/stores/`: Zustand store (`gameStore.ts`) connecting UI state with pure engine functions.
- `src/components/`: Modular React components split into game grid (`GameGrid`), HUD (`GameHUD`), placement toolbar (`PlacementBar`), building sprites, and screens (`HomeScreen`, `LevelSelectorScreen`).
- `src/data/`: Data-driven JSON definitions for buildings (`buildings.json`) and campaign levels (`campaign/level-01.json` through `level-10.json`).
- `python_csp/`: Standalone Python implementation of the level solver, CLI interface, and benchmarks.

---

## 🚀 Local Setup & Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+ LTS recommended)
- [Python](https://www.python.org/) (3.10+ recommended for Python solver and benchmarks)
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
# Run TypeScript unit tests (16 tests)
npm test

# Run Python solver unit tests
npm run test:python

# Run TypeScript CSP Benchmark
npm run benchmark:csp

# Run Python CSP Benchmark
npm run benchmark:csp:py

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
├── docs/                     # Game specifications and architecture design
│   └── blackout-city.md
├── python_csp/               # Pure Python CSP solver and benchmark module
│   ├── benchmark.py          # Academic benchmark script across levels 1-10
│   ├── cli.py                # JSON CLI interface
│   ├── solver.py             # Plain, MRV, and MRV+FC algorithm implementations
│   └── test_solver.py        # Python unittest suite
├── public/
│   ├── favicon.svg           # Yellow zap brand favicon
│   ├── icons/                # Game icon SVGs and hover assets
│   └── resources/design/     # Design reference mockups & components
├── scripts/
│   └── benchmark-csp.ts      # TypeScript CLI benchmark script
├── src/
│   ├── assets/               # Bundled logos, icons, fonts
│   ├── components/
│   │   ├── game/             # Board grid, HUD, sprites, CSP modal, toolbar
│   │   └── screens/          # Home & Level Selector screens
│   ├── data/                 # JSON building definitions & campaign levels (1-10)
│   │   ├── buildings.json
│   │   └── campaign/
│   ├── engine/               # Pure TypeScript engine
│   │   ├── connectivity/     # Orthogonal road networks & component IDs
│   │   ├── csp/              # Pure TS CSP solver (Plain, MRV, MRV+FC)
│   │   ├── grid/             # Footprint & boundary neighbor calculations
│   │   ├── objectives/       # Objective evaluation & scoring rules
│   │   ├── placement/        # Placement validation & generator actions
│   │   └── simulation/       # Capacity reporting, activation & simulation
│   ├── stores/               # Zustand game store
│   ├── styles/               # CSS variables and Day / Night theme tokens
│   └── types/                # TypeScript interfaces & Zod schemas
└── tests/                    # Vitest test suites (connectivity, simulation, levels, CSP)
```

---

## 📜 License

MIT License. Designed and developed as part of the Blackout City Game project.

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
- **Proceed**: Once your placement strategy is set, click **ACTIVATION →** in the bottom right.

### 2. 💡 Activation Phase (Night Mode)

- The city switches to Night Mode.
- **Auto-Activation**: Any road network where total generator output meets or exceeds connected demand automatically powers its buildings.
- **Manual Toggle**: When network capacity is limited, tap individual connected buildings to manually toggle electricity distribution within your remaining Zap budget.
- Powered buildings illuminate with warm glowing windows and show the round electricity badge.
- **Proceed**: Click **SIMULATE ⚡** to test your grid against the level objectives.

### 3. 📊 Simulation & Results

- The simulation engine compiles your result, checking mandatory objectives, scoring, and star thresholds (1 to 3 stars).
- **Adjust or Replay**:
  - **ADJUST**: Go back to the Activation phase to adjust power distribution without losing your placed generators.
  - **BACK (HUD)**: Navigate backwards through phases (Simulation → Activation → Placement).
  - **RESET**: Clears all placements and returns the level to its initial state.

---

## 🛠️ Tech Stack & Architecture

- **Frontend Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vite.dev/)
- **State Management**: [Zustand](https://zustand.docs.pmnd.rs/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with custom CSS design tokens (`[data-theme="day"]` / `[data-theme="night"]`)
- **Typography**: [Google Sans Flex Variable Font](https://fontsource.org/fonts/google-sans-flex)
- **Data Validation**: [Zod](https://zod.dev/)
- **Testing**: [Vitest](https://vitest.dev/)
- **Linter & Formatter**: [oxlint](https://oxc.rs/) & [Prettier](https://prettier.io/)

### Architecture & Separation of Concerns

- `src/engine/`: Pure, deterministic TypeScript logic with **zero** React/UI dependencies. Handles orthogonal road BFS/DFS connectivity, boundary footprint calculations, capacity reports, activation tracking, and simulation scoring.
- `src/stores/`: Zustand store (`gameStore.ts`) connecting the UI screens with engine functions.
- `src/components/`: Modular UI split into game canvas (`GameGrid`), controls (`GameHUD`, `PlacementBar`), building sprites, and screens (`HomeScreen`, `LevelSelectorScreen`).
- `src/data/`: Data-driven JSON definitions for buildings (`buildings.json`) and campaign levels (`campaign/level-01.json`).

---

## 🚀 Local Setup & Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+ LTS recommended)
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
# Run unit tests
npm test

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
├── docs/                     # Game specifications and documentation
│   └── blackout-city.md
├── public/
│   ├── icons/                # Game icon SVGs and hover assets
│   └── resources/design/     # Design reference mockups & components
├── src/
│   ├── assets/               # Bundled assets (logos, icons)
│   ├── components/
│   │   ├── game/             # Board grid, HUD, sprites, controls
│   │   └── screens/          # Home & Level Selector screens
│   ├── data/                 # JSON building definitions & campaign levels
│   │   ├── buildings.json
│   │   └── campaign/
│   ├── engine/               # Pure TypeScript engine
│   │   ├── connectivity/     # Orthogonal road networks & component IDs
│   │   ├── grid/             # Footprint & boundary neighbor calculations
│   │   ├── objectives/       # Objective evaluation & scoring rules
│   │   ├── placement/        # Placement validation & generator actions
│   │   └── simulation/       # Capacity reporting, activation & simulation
│   ├── stores/               # Zustand game store
│   ├── styles/               # Tokens & CSS variables (Day / Night)
│   └── types/                # TypeScript interfaces & Zod schemas
└── tests/                    # Vitest test suites (connectivity, simulation)
```

---

## 📜 License

MIT License. Designed and developed as part of the Blackout City Game project.

# Blackout City --- Complete Game Specification

**Document:** `blackout-city.md`\
**Project:** Blackout City\
**Status:** MVP specification --- revision 4\
**Genre:** Single-player, grid-based city electricity puzzle / simulation

------------------------------------------------------------------------

## 1. Project Overview

Blackout City is a single-player, grid-based puzzle game in which the
player restores electricity to a city. Each level has a fixed road
layout, fixed buildings, and a limited inventory of generators. The
player places generators beside the road networks, chooses which
buildings to power, and then runs a simulation that evaluates the
result against the level's objectives.

Each attempt at a level follows three phases:

1.  **Placement phase:** the player places, moves, and removes
    generators.
2.  **Activation phase:** the player chooses which buildings to
    activate, based on the capacity the placement produced.
3.  **Simulation phase:** an animation plays and the result (objectives,
    score, stars) is compiled.

The game aims for a clean, accessible, simulation-oriented experience
inspired by the presentation style of *SimCity BuildIt*, while keeping
its core gameplay focused on electrical network planning and constraint
solving.

The player must:

-   Understand the fixed road layout and its disconnected road networks.
-   Place a limited inventory of generators in valid locations.
-   Connect generators to road networks through placement.
-   Manage each network's generation capacity against building demand.
-   Choose which buildings to activate when capacity is insufficient.
-   Complete mandatory objectives and earn up to three stars.
-   Optionally use a custom Constraint Satisfaction Problem (CSP) solver
    for assistance.

The MVP is single-player and campaign-focused. Roads are predefined and
cannot be edited by the player.

## 2. Design Principles

1.  **Readable rules:** Placement, connectivity, activation, and
    evaluation have distinct, predictable meanings.
2.  **Phase separation:** Each phase allows a specific set of actions.
    The engine rejects actions that do not belong to the current phase.
3.  **Deterministic simulation:** The same level state and player
    actions always produce the same result.
4.  **Independent road networks:** Electricity cannot travel between
    disconnected road components.
5.  **No hidden placement penalties:** Valid but disconnected generators
    are allowed and do not trigger error messages.
6.  **Predefined technical values:** Building demand, output, and
    footprint are fixed per building type. Only score values (and level
    layout) vary per level.
7.  **Shared simulation rules:** Gameplay validation and the CSP solver
    use the same underlying engine code.
8.  **Presentation never affects rules:** Animations and UI are
    consumers of engine results; they never change them.
9.  **Data-driven levels:** Campaign levels are structured JSON so the
    same format can support a future level editor.
10. **MVP simplicity:** The MVP favors ease of implementation.
    Performance optimization, user-experience refinement, and advanced
    mechanics (power plants, generator rotation, partial power, editable
    roads, community levels) are deferred to Phase 2.

## 3. Game Flow

### 3.1 Phases

| Phase | Player actions | Engine responsibilities |
|----|----|----|
| **Placement** | Place, move, remove generators; reset level; request solver help; proceed to activation | Validate placement on place and move; run the capacity check after every successful place, move, or remove |
| **Activation** | Activate and deactivate buildings; reset level; proceed to simulation | Track per-network remaining capacity; determine eligibility; auto-activation where applicable |
| **Simulation** | None (animation plays) | Compile the result: powered buildings, objectives, score, stars |
| **Result** | View result; go back; reset | Persist the best result when the level was completed |

### 3.2 Phase transitions

-   Placement → Activation: initiated by the player.
-   Activation → Simulation: initiated by the player (confirm).
-   Simulation → Result: automatic when the result is ready.
-   **Back navigation:** a back button moves the player one phase
    backwards: Result → Activation, and Activation → Placement.
    -   Going back from Result to Activation discards the result and
        keeps the active set. A result already saved as the best result
        is kept.
    -   Going back from Activation to Placement clears the active set,
        because the generator layout may change. Placed generators are
        kept.
    -   Back is not available while the Simulation animation plays.
-   **Reset** is available during Placement and Activation. It unplaces
    all generators, clears all activation state, and returns the level
    to its original state in the Placement phase.

### 3.3 Where power state exists

-   During the Placement phase no building is powered. The player only
    sees the *capacity check* (section 8), which is informational.
-   Powered/unpowered state exists from the Activation phase onward.
-   Because generators cannot change during Activation, network
    generation is constant for the whole Activation phase.

## 4. Core Game World

### 4.1 Grid

Each level is represented by a two-dimensional grid. Every cell has a
defined role.

Cell/content types:

-   **Empty:** Unoccupied, unrestricted cell.
-   **Road:** Fixed road cell defined by the level.
-   **Building:** Cell belonging to a fixed building footprint.
-   **Restricted terrain:** Obstacles such as trees, water, or
    decorative terrain.
-   **Generator:** Cell belonging to a player-placed generator
    footprint.

Roads, buildings, and restricted terrain are part of the level layout.
The player cannot place, remove, move, or connect roads in the MVP.

### 4.2 Coordinates

-   Coordinates are `{ x, y }`.
-   The origin is the top-left cell. `x` is the column and `y` is the
    row.
-   A multi-cell footprint is anchored at its top-left cell (`origin`)
    and extends `width` cells in +x and `height` cells in +y.

### 4.3 Orthogonal adjacency

Orthogonal adjacency means sharing an edge: up, down, left, right.

Diagonal adjacency does not count for road connectivity, building
connectivity, generator connectivity, or generator placement validation.

### 4.4 Multi-cell footprints

Buildings and generators may occupy multi-cell rectangular footprints
(for example 1×1, 2×2).

The **adjacent cells** of a footprint are the cells that are
orthogonally adjacent to at least one footprint cell and are *not*
themselves part of the footprint.

A footprint is adjacent to a road if at least one of its adjacent cells
is a road cell. Buildings cannot connect directly to other buildings and
cannot act as intermediate electricity paths.

## 5. Road Networks

### 5.1 Road components

A road network is a connected component of road cells. Road cells belong
to the same component when they can be reached from one another through
orthogonally adjacent road cells.

Each connected road component is an independent electrical network.

### 5.2 Network rules

-   Road-to-road connectivity is orthogonal only.
-   Diagonal road contact does not connect road cells.
-   Disconnected road components remain electrically independent.
-   Buildings and generators do not join separate road components.
-   Buildings cannot carry electricity from one road network to another.
-   Road components are fixed for the duration of a level.

### 5.3 Precomputation

Road components are calculated once when a level is loaded, using BFS or
DFS. Each road cell receives a stable `networkId`.

Because roads are immutable during a level, component assignments never
need recalculation.

## 6. Building Definitions

### 6.1 Building variants

All buildings, including generators, are building variants with static
properties:

-   `id`
-   `name`
-   `category`
-   `width`
-   `height`
-   `demand`
-   `output`

These values are predefined per variant and are **not** configurable per
level.

Example categories: `residential`, `commercial`, `hospital`, `factory`,
and `generator`.

### 6.2 Fixed buildings

Fixed buildings are part of the level layout.

-   They have `demand > 0` and `output = 0` in the MVP. Level-fixed
    power-producing buildings (power plants) are deferred to Phase 2.
-   Each instance in a level has: a unique instance ID, a variant ID, an
    `origin`, and a `score` value configured for that level instance.
-   Score is the only per-level configurable property of a building.

### 6.3 Generators

A generator is a building variant with `category = "generator"` that the
player places.

-   `demand = 0` and `output > 0`.
-   Footprint size and output differ by generator type, for example
    small generator, generator, big generator, city center generator.
    The exact set of types and their values is defined in production.
-   Generators do not need activation. A connected generator contributes
    its output as soon as it is placed.
-   Generators have no score value. Score comes only from powered fixed
    buildings.
-   Output belongs to the generator *type*, not to an individual
    placement.
-   Footprints have a fixed orientation in the MVP. Rotation is
    deferred to Phase 2.

### 6.4 Building-to-road connectivity

A fixed building is connected to a road network when at least one of its
adjacent cells (section 4.4) is a road cell.

-   A building adjacent to several road cells of the *same* component is
    connected to that component.
-   Diagonal adjacency does not count.
-   A building without road adjacency cannot receive power.
-   A building adjacent to more than one distinct road component has an
    ambiguous network assignment. In the MVP this is prevented during
    level production, and the load-time validator rejects such levels as
    a safety net. Revisited in Phase 2.

## 7. Generator System and the Placement Phase

### 7.1 Inventory

-   Generator inventory is defined per level as quantities by generator
    type.
-   Placing, moving, and removing generators has no in-game cost.
-   Moving a generator does not consume an additional generator.
-   Removing a generator returns it to the available inventory.

### 7.2 Placement area

A generator can be placed only if **every cell** of its footprint:

-   Is inside the grid.
-   Is empty and unrestricted.
-   Is not a road cell, building cell, restricted terrain cell, or part
    of another generator.

A candidate must also pass placement validation (7.4).

### 7.3 Placement validity and connectivity are separate concepts

The game has two placement states: `valid` and `invalid`.

Power connectivity is a separate result: `connected` and `disconnected`.

A generator can therefore be validly placed while disconnected from every
road network.

### 7.4 Generator placement validation

Only orthogonally adjacent road cells are considered.

For a candidate generator footprint:

1.  Compute the adjacent cells of the footprint (section 4.4).
2.  Collect the distinct road component IDs among those cells.
3.  Count the distinct component IDs.

| Distinct adjacent road components | Placement state | Connectivity |
|----|----|----|
| 0 | Valid | Disconnected |
| 1 | Valid | Connected |
| 2 or more | Invalid | Not applicable |

Important details:

-   Count distinct road component IDs, not adjacent road cells.
-   A generator touching several road cells of the same component is
    valid and connected.
-   Diagonal road cells are ignored entirely.
-   A generator touching two or more distinct road components is
    invalid. A generator must not bridge separate road systems.
-   For a 1×1 generator this reduces to inspecting the four orthogonal
    neighbors.

### 7.5 Invalid placement behavior

Invalid placements are rejected; invalid generators never remain on the
board.

-   **Placing a new generator:** reject the placement. The generator
    remains in the inventory.
-   **Moving an existing generator:** reject the move and restore the
    generator to its previous position. The generator is not removed
    from its old position unless the new position is valid.
-   Show a toast explaining that a generator cannot touch multiple
    separate road networks.
-   Do not show an invalid-placement toast for a valid but disconnected
    generator.
-   Do not commit an invalid placement to game state, and do not run the
    capacity check for it.

When a move is evaluated, the generator's own current footprint is
ignored when checking overlap, so it may move to a position that
overlaps its previous one.

### 7.6 Connectivity and contribution

-   A connected generator is assigned to its single adjacent road
    component and contributes its output to that network.
-   A disconnected generator has no `networkId` and contributes no
    power.
-   A generator contributes to exactly one network. Output is never
    duplicated across networks.

Suggested status representation:

``` ts
type PlacementState = "valid" | "invalid";
type ConnectivityState = "connected" | "disconnected";

interface PlacementEvaluation {
  placement: PlacementState;
  connectivity: ConnectivityState | null; // null when invalid
  networkId: string | null;
  reason?:
    | "out_of_bounds"
    | "cell_occupied"
    | "restricted_terrain"
    | "touches_multiple_networks"
    | "no_inventory"
    | "wrong_phase";
}
```

### 7.7 Move, remove, and recalculation

-   Place, move, and remove are only allowed during the Placement phase.
-   Moving is a validated operation: evaluate the new position first;
    only commit if valid.
-   After every **successful** place, move, or remove, run the capacity
    check (section 8).
-   Rejected actions leave state unchanged and do not run the capacity
    check.

### 7.8 Reset

Reset unplaces all generators, clears activation state, and returns the
level to its original state in the Placement phase. All inventory is
restored. There is no automatic activation after a reset.

### 7.9 Placement preview

The engine must expose a side-effect-free preview evaluation
(`evaluatePlacement`) so the UI can show hover feedback before the
player commits. The visual treatment of that feedback is defined in
Figma; the engine only provides the evaluation result.

## 8. Capacity Check

The capacity check summarizes, per road network, whether the current
generator layout can power the buildings connected to it.

For each network `n`:

``` text
generation(n) = sum of output of connected generators assigned to n
demand(n)     = sum of demand of all fixed buildings connected to n
surplus(n)    = generation(n) - demand(n)
canPowerAll(n) = generation(n) >= demand(n)
```

Rules:

-   The check runs after every successful place, move, or remove, and
    after reset.
-   It reports every network, including networks with no generators or
    no buildings.
-   It is informational: it never blocks the player, removes anything,
    or changes state.
-   A network with `canPowerAll = false` is normal. The Activation phase
    exists so the player can choose which buildings to power.

## 9. Activation Phase

### 9.1 Entering the phase

When the Activation phase begins, no building is active, then
auto-activation (9.5) is applied. Generator layout is locked for the
duration of the phase.

### 9.2 Per-network accounting

For each network `n`:

``` text
generation(n)  = as computed by the capacity check (constant in this phase)
consumption(n) = sum of demand of currently active buildings in n
remaining(n)   = generation(n) - consumption(n)
```

### 9.3 Eligibility

A connected, inactive building in network `n` can be activated when:

``` text
remaining(n) >= building demand
```

-   A building must receive its full demand to activate. Partial power
    is not supported in the MVP.
-   A building without road connectivity can never be activated.
-   An inactive building consumes nothing.

### 9.4 Manual activation and deactivation

-   The player may activate any eligible building.
-   The player may deactivate any active building. Deactivation frees
    its demand as remaining capacity.
-   The player is not forced to follow a predefined priority.
-   If no building is eligible, nothing can be activated until the
    player deactivates something.

### 9.5 Automatic activation

For a network `n` where total demand of all its connected buildings is
within its generation:

``` text
demand(n) <= generation(n)
```

all of its connected buildings are activated automatically, without the
player selecting them one by one.

-   Each network is evaluated independently. Auto-activation in one
    network has no effect on any other network.
-   A network with `demand(n) > generation(n)` is manual: the player
    chooses.
-   The MVP applies it automatically on entering the phase. Whether
    this is the best trigger (versus an explicit per-network action)
    will be decided through playtesting, so implement the trigger in a
    single function that is easy to change.

### 9.6 No activation order

In the MVP all fixed buildings only consume power. The set of active
buildings is therefore order-independent: whether a set is affordable
depends only on the sum of demands. The activation state is the *set* of
active building instance IDs, not an ordered list.

### 9.7 Leaving the phase

The player confirms to proceed to the Simulation phase. Proceeding is
allowed regardless of how many buildings are active.

## 10. Simulation Phase

### 10.1 Input

The locked generator layout and the set of active buildings.

### 10.2 Result compilation

The result is compiled by a pure engine function (`runSimulation`) that
is deterministic and independent of any animation. It produces:

-   Per-network generation, consumption, and remaining capacity.
-   The final set of powered buildings.
-   Evaluation of the mandatory objectives, including per-node status of
    the objective tree.
-   The score.
-   Whether the level is completed.
-   The star rating.

### 10.3 Animation

-   The animation is presentation only. It visualizes the compiled
    result and must never change it.
-   Animation design is defined in Figma.

### 10.4 Persistence

If the level was completed, the result is compared with the saved best
result for that level and saved when it is better (see 12.2). Results
that do not complete the level are not saved.

## 11. Objectives, Score, and Stars

### 11.1 Mandatory objectives

Mandatory objectives determine whether a level is completed.

Examples:

-   All buildings powered.
-   At least two hospitals powered.
-   At least one residential building powered.
-   Two hospitals AND one residential building powered.
-   Two hospitals OR one residential building powered.

Objectives support predefined condition types and nested AND/OR
combinations.

Default objective schema (to be refined in production):

``` ts
type Objective =
  | { type: "and"; children: Objective[] }
  | { type: "or"; children: Objective[] }
  | { type: "categoryCount"; category: BuildingCategory; min: number }
  | { type: "buildingPowered"; buildingId: string }
  | { type: "allBuildingsPowered" };
```

-   `categoryCount` counts powered buildings only, with an "at least"
    comparison.
-   `categoryCount` categories come from an enumerated set derived from
    the building definitions, not free strings.
-   `allBuildingsPowered` refers to all fixed buildings in the level.

### 11.2 Completion

A level is completed when all mandatory objectives are satisfied in the
final simulation result.

The player does not need the maximum possible score to complete a
level.

### 11.3 Score

``` text
score = sum(score value of each powered fixed building)
```

Score is based on the final powered state, not on buildings merely
present in the level. Score values are configured per building instance
per level. Generators carry no score.

### 11.4 Star system

-   **0 stars:** mandatory objectives not satisfied (level not
    completed).
-   **1 star:** mandatory objectives satisfied.
-   **2 stars:** mandatory objectives satisfied and score ≥ first
    threshold.
-   **3 stars:** mandatory objectives satisfied and score ≥ second
    threshold.

Thresholds are integers configured per level, and the second threshold
must be greater than or equal to the first. Score thresholds are applied
only after the mandatory objectives are satisfied.

## 12. Campaign and Progression

### 12.1 MVP campaign

-   The MVP includes approximately 5--10 levels.
-   All levels are unlocked from the beginning.
-   Players may skip earlier levels and play any available level.
-   Each level's completion and best result are saved independently.
-   Replaying a level may improve its score or star rating.
-   The MVP does not save or resume an unfinished level.

### 12.2 Best result

-   "Best" means highest star count first, then highest score.
-   Progress is stored in `localStorage` under a versioned key, so the
    storage format can change safely.

### 12.3 Future modes

Planned for later phases: Level Creator, public community level library.
These are not part of the MVP.

## 13. Constraint Satisfaction Problem (CSP) Solver

### 13.1 Purpose

The CSP solver provides optional in-game assistance. It searches for a
generator layout and an activation selection that satisfy a level's
mandatory objectives.

The solver must be a custom TypeScript implementation. Do not use a
black-box CSP library.

### 13.2 Solver scope

The solver searches for:

-   Generator placements (type and origin).
-   Generator-to-network assignments, derived from placement.
-   The set of buildings to activate in each network.
-   Whether the mandatory objectives can be satisfied.
-   The highest-scoring valid solution when optimization is requested.

Road placement is not part of the search because roads are fixed.

### 13.3 Solver inputs

-   Level grid and fixed roads, with precomputed road components.
-   Building instances and variants.
-   Restricted terrain.
-   Generator types, footprints, outputs, and inventory.
-   Mandatory objectives and star thresholds.
-   Optionally, the current generator placements (depending on help
    mode).

### 13.4 Solver outputs

-   Generator layout (type and origin of each generator).
-   Assigned network for each connected generator.
-   Set of buildings to activate.
-   Final powered buildings.
-   Generation, consumption, and remaining capacity per network.
-   Final score.
-   Statistics: search nodes, backtracks, runtime, whether a valid
    solution was found, best score found (when optimizing), and whether
    optimization may be incomplete.

### 13.5 Constraints

The solver enforces exactly the same rules as gameplay:

-   Every cell of a generator footprint is in-grid and empty
    unrestricted, and does not overlap another generator.
-   A generator footprint touches at most one distinct road component.
-   A generator touching zero components is valid but contributes
    nothing.
-   Only connected generators contribute output.
-   Each network has independent capacity.
-   Fixed buildings must be road-connected to be powered.
-   Total demand of the active buildings in a network must not exceed
    that network's generation.
-   Mandatory objectives must be satisfied.

### 13.6 Candidate domains

-   Avoid brute force over every grid cell and every inventory
    combination.
-   Since disconnected generators contribute nothing, the useful domain
    for each generator is the set of valid *connected* footprints
    (exactly one adjacent road component). Inventory units may remain
    unplaced when no useful position exists.
-   Identical generator types are interchangeable, so the search should
    break that symmetry (for example by ordering their positions).
-   Detailed formulation (variable and domain definitions, activation
    subset search, upper bounds) is defined in production.

### 13.7 Help modes

1.  **Respect current placements:** treat the generators currently on the
    board as fixed. If no valid solution exists with those positions,
    report that no solution was found.
2.  **Allow rearrangement:** the solver may reposition generators within
    the normal placement rules.

Using solver assistance carries no score penalty.

### 13.8 Feasibility and optimization

**Feasibility mode:** find the first valid solution satisfying the
mandatory objectives.

**Optimization mode:** find the highest-scoring valid solution, for
example with branch-and-bound: find an initial valid solution, keep its
score as the current best, prune branches whose upper bound cannot
exceed it, and return the best found.

### 13.9 Execution, timeout, and cancellation

-   The solver runs in a Web Worker so the UI stays responsive.
-   The UI shows a loading animation while solving and lets the player
    cancel.
-   Default time limits (configurable): 5 seconds for feasibility and 15
    seconds for optimization.
-   If the limit is reached after a valid solution has been found,
    return the best valid solution found so far and indicate that
    optimization may be incomplete. If none was found, report that no
    solution was found within the limit.

### 13.10 Presentation of results

-   The game shows the solved layout (and the buildings to activate) as
    a read-only result with basic statistics.
-   The solver does not modify the board. The player recreates the
    layout manually.
-   There is no score penalty for using the solver.
-   The solver is available only during the Placement phase.

### 13.11 CSP techniques and evaluation

The academic evaluation compares:

1.  Plain backtracking.
2.  Backtracking with Minimum Remaining Values (MRV).
3.  Backtracking with MRV and forward checking.

Measure search nodes, backtracks, runtime, success/failure, and best
score.

A Node-run TypeScript benchmark script runs all three variants on all
campaign levels and outputs a table (CSV) of those measures. A
step-by-step educational visualization of the search is deferred to
Phase 2.

### 13.12 Shared rules

The gameplay engine and the solver must share the same placement
validation, road assignment, capacity and activation logic, objective
evaluation, and scoring code. The solver must never return a
configuration that gameplay considers invalid.

## 14. User Interface and User Experience

### 14.1 Source of truth

The visual and interaction design is created by the project owner in
Figma. **Figma is the source of truth** for layout, iconography,
language, animation style, input model (how generators are selected,
placed, and moved), hover feedback, and the toolbar.

Sections 14.5 to 14.10 record the agreed baseline for the color
palette, typography, and phase visual modes. Figma mirrors them as
Variables (Day and Night modes). If Figma and this document differ,
update this document.

Sections 14.2 to 14.4 define the functional behavior and information the
UI must be able to present.

### 14.2 Information required per phase

**Placement phase**

-   Level name/number and mandatory objectives.
-   Generator inventory by type, and placed generators.
-   Per-network capacity check: generation, demand, surplus.
-   Reset and solver help access.

**Activation phase**

-   Per-network generation, consumption, and remaining capacity.
-   Per-building information: name, category, demand, score, connection
    state, activation state.
-   Activate/deactivate actions, enabled only when allowed.
-   Reset.

**Simulation phase**

-   The animation of the compiled result.

**Result**

-   Objective status, score, star rating, and best result for the level.

**Navigation**

-   A back button (Activation and Result phases) and a proceed control
    (Placement and Activation phases), per section 3.2.

### 14.3 Feedback rules

-   Invalid generator placement: reject the action and show a toast
    explaining that a generator cannot touch multiple separate road
    networks.
-   Valid but disconnected generator: allow placement, no error toast.
-   Connected generator: show its assigned road network and its
    contribution.
-   Building without road connectivity: indicate that it cannot receive
    power.
-   Building that cannot currently be activated due to insufficient
    remaining capacity: indicate this.
-   Powered building: show its active state.
-   Solver: loading animation, cancel, timeout, and no-solution
    messages.

### 14.4 Undo

Undo is not an MVP engine requirement. It is revisited only if the Figma
design includes it.

### 14.5 Visual design tokens

The game has two visual themes, **Day** and **Night**, that share the
same token names. Figma mirrors them as Variables with Day and Night
modes, and the code mirrors them as CSS custom properties (14.6). The
style is a bright, rounded, city-builder look: chunky rounded panels,
bevelled buttons with a darker bottom rim, navy text outlines, and
colorful buildings on a grass-and-asphalt board.

**World**

| Token | CSS variable | Day | Night |
|----|----|----|----|
| Grass light | `--grass-light` | `#8CCB5E` | `#2F6B52` |
| Grass dark | `--grass-dark` | `#84C456` | `#2A6049` |
| Asphalt | `--asphalt` | `#565E6C` | `#2F3645` |
| Curb | `--curb` | `#CFC8B8` | `#6B7385` |
| Lane paint | `--lane-paint` | `#F7F3E3` | `#D8D2BC` |
| Tree | `--tree` | `#3E8E41` | `#1B4D35` |
| Water | `--water` | `#5BB9E8` | `#2A6CA6` |
| Board frame | `--board-frame` | `#5E9B3A` | `#1E4A39` |

**Buildings and light**

| Token | CSS variable | Day | Night |
|----|----|----|----|
| Wall (lit) | `--wall-lit` | `#F6E7C8` | `#F2DDAA` |
| Roof red (lit) | `--roof-red-lit` | `#E4684F` | `#D2584A` |
| Roof blue (lit) | `--roof-blue-lit` | `#4F8FD8` | `#4A7FC4` |
| Wall (unlit) | `--wall-unlit` | `#CFCAC0` | `#3A4156` |
| Roof (unlit) | `--roof-unlit` | `#8F96A3` | `#2A3044` |
| Window (unlit) | `--window-unlit` | `#6B7280` | `#20263A` |
| Building outline | `--outline` | `#26355D` | `#161B30` |
| Power yellow | `--power-yellow` | `#FFD23F` | `#FFD23F` |
| Streetlamp (night only) | `--streetlamp` | `#FFD98A` | `#FFD98A` |

**Interface**

| Token | CSS variable | Day | Night |
|----|----|----|----|
| Sky | `--sky` | `#BFE6FA` | `#232B5B` |
| Panel cream | `--panel` | `#FFF7E3` | `#F4E8CC` |
| Ink navy | `--ink` | `#26355D` | `#26355D` |
| Button blue | `--btn-blue` | `#3BA7F5` | `#3BA7F5` |
| Button blue rim | `--btn-blue-rim` | `#1E78C8` | `#1E78C8` |
| Button green | `--btn-green` | `#6CC24A` | `#6CC24A` |
| Button green rim | `--btn-green-rim` | `#3E8E2A` | `#3E8E2A` |
| Alert red | `--alert` | `#E8453C` | `#E8453C` |
| Star on | `--star-on` | `#E0A800` | `#E0A800` |
| Star off | `--star-off` | `#B8C4CC` | `#B8B4A4` |

**Network colors**

| Token | CSS variable | Day | Night |
|----|----|----|----|
| Network A | `--net-a` | `#2F80ED` | `#7DB9FF` |
| Network B | `--net-b` | `#FF8C42` | `#FFA45C` |
| Network C | `--net-c` | `#8E5CF7` | `#C4A3FF` |
| Network D | `--net-d` | `#FF6FA8` | `#FF9CC6` |

Unchanged between themes: power yellow, streetlamp, ink navy, the
button blue and green with their rims, alert red, and star on.

The day building outline is a proposal (it equals ink navy). The day
preview did not use an outline.

### 14.6 Token implementation reference

Tokens are defined once as CSS custom properties per theme, set through
a `data-theme` attribute on the root element. Tailwind consumes the
variables through its theme configuration, so components never hardcode
hex values.

``` css
:root[data-theme="day"] {
  --grass-light: #8CCB5E;
  --grass-dark: #84C456;
  --asphalt: #565E6C;
  --curb: #CFC8B8;
  --lane-paint: #F7F3E3;
  --tree: #3E8E41;
  --water: #5BB9E8;
  --board-frame: #5E9B3A;
  --wall-lit: #F6E7C8;
  --roof-red-lit: #E4684F;
  --roof-blue-lit: #4F8FD8;
  --wall-unlit: #CFCAC0;
  --roof-unlit: #8F96A3;
  --window-unlit: #6B7280;
  --outline: #26355D;
  --power-yellow: #FFD23F;
  --streetlamp: #FFD98A;
  --sky: #BFE6FA;
  --panel: #FFF7E3;
  --ink: #26355D;
  --btn-blue: #3BA7F5;
  --btn-blue-rim: #1E78C8;
  --btn-green: #6CC24A;
  --btn-green-rim: #3E8E2A;
  --alert: #E8453C;
  --star-on: #E0A800;
  --star-off: #B8C4CC;
  --net-a: #2F80ED;
  --net-b: #FF8C42;
  --net-c: #8E5CF7;
  --net-d: #FF6FA8;
}

:root[data-theme="night"] {
  --grass-light: #2F6B52;
  --grass-dark: #2A6049;
  --asphalt: #2F3645;
  --curb: #6B7385;
  --lane-paint: #D8D2BC;
  --tree: #1B4D35;
  --water: #2A6CA6;
  --board-frame: #1E4A39;
  --wall-lit: #F2DDAA;
  --roof-red-lit: #D2584A;
  --roof-blue-lit: #4A7FC4;
  --wall-unlit: #3A4156;
  --roof-unlit: #2A3044;
  --window-unlit: #20263A;
  --outline: #161B30;
  --power-yellow: #FFD23F;
  --streetlamp: #FFD98A;
  --sky: #232B5B;
  --panel: #F4E8CC;
  --ink: #26355D;
  --btn-blue: #3BA7F5;
  --btn-blue-rim: #1E78C8;
  --btn-green: #6CC24A;
  --btn-green-rim: #3E8E2A;
  --alert: #E8453C;
  --star-on: #E0A800;
  --star-off: #B8B4A4;
  --net-a: #7DB9FF;
  --net-b: #FFA45C;
  --net-c: #C4A3FF;
  --net-d: #FF9CC6;
}
```

### 14.7 Typography

The typeface is **Google Sans Flex**, a variable font, the same family
used for the logo. One family covers every role by varying the weight
and roundness axes. It is open source and available on Google Fonts, so
no custom font hosting is needed.

| Role | Size (px) | Weight | Roundness |
|----|----|----|----|
| Result headline | 40 | 800 | 100 |
| Screen and level title | 28 | 700 | 100 |
| HUD numbers | 20 | 700 | 100 |
| Buttons | 16--20 | 700 | 100 |
| Body and panels | 14 | 500 | 0--40 |
| Captions | 12 | 500 | 0 |

Rules:

-   Display text (headline, titles, HUD numbers, buttons) uses high
    roundness. Body text keeps low roundness so small text stays crisp.
-   Match the display weight and roundness to the logo.
-   Optical size follows the font size (`font-optical-sizing: auto` on
    the web).
-   Button labels are white with a 2px ink-navy outline.
-   Font stack: Google Sans Flex, then system-ui, then sans-serif.
-   Support for tabular figures was not verified. If HUD numbers shift
    width as they change, test the font's tabular-number feature or set
    a fixed width for the counters.

### 14.8 Phase visual modes

Each gameplay phase has a visual mode. The theme assignment below is
proposed (see 24.2 and 24.3): the lit and unlit building states are the
main feedback in Activation and Simulation, and they are much clearer at
night (see 14.10).

#### 14.8.1 Placement mode (Day theme)

-   Nothing is powered in this phase (3.3), so every fixed building uses
    its unlit state, with no status bubbles.
-   Each road network shows its letter badge (A to D) in its network
    color.
-   Placed generators show the power-yellow body with an outline. A
    connected generator carries its network badge. A valid but
    disconnected generator has no badge.
-   Required information: inventory by type, per-network capacity
    (generation, demand, surplus), objectives, solver button, proceed
    control.
-   Hover feedback follows 14.9.

#### 14.8.2 Activation mode (Night theme)

-   Switching from Placement to Activation switches the theme from Day
    to Night, and going back switches it again. The transition effect is
    defined in Figma.
-   Buildings are unlit by default and become lit when active.
-   Streetlamps are on.
-   A connected building that is inactive shows the unpowered status
    bubble. A building that cannot be activated because remaining
    capacity is too low, and a building with no road connection, each
    have a distinct indicator. The icons are defined in Figma.
-   Each network shows its remaining capacity.
-   Generators are locked; no placement hover feedback appears.
-   Required information and controls follow 14.2: building panel with
    activate and deactivate, back, reset, and proceed.

#### 14.8.3 Simulation mode (Night theme)

-   Starts from the final activation state.
-   Powered buildings play a transition from unlit to lit. Unpowered
    buildings stay unlit. Timing and sequencing are defined in Figma.
-   The animation is presentation only (10.3). The result was already
    compiled before it starts.
-   No player input; back is disabled while it plays.
-   The result screen follows the same Night theme, with a panel in the
    panel-cream token showing objectives, score, stars, and a back
    control to Activation.

### 14.9 Visual state rules

These rules hold in both themes.

-   **Placement hover:**
    -   Valid and connected: ghost footprint with a solid white outline
        and the target network's letter badge.
    -   Valid and disconnected: white dashed outline, no badge.
    -   Invalid: solid alert-red fill with a white outline and a white X
        icon.
-   **Network identity:** carried by filled letter badges (A to D) with
    a white border, not by thin colored outlines. The MVP supports at
    most four road networks per level.
-   **Meaning is never carried by color alone:** states also use shape,
    line style, an icon, or a letter.
-   **Reserved colors:** alert red marks invalid actions and errors.
    Power yellow marks generators, lit windows, and highlights.
-   **Buildings:** every building has the outline token. Lit buildings
    use the lit tokens and yellow windows. Unlit buildings use the unlit
    tokens and dark windows.
-   **Restricted terrain:** trees and water use the tree and water
    tokens.

### 14.10 Known contrast limitations

These values were calculated (WCAG contrast ratios). Figma should
address the day-theme items.

-   **Day network colors:** about 1.1 to 2.0 to 1 against the day grass,
    and about 1.6 to 2.8 to 1 against the day asphalt. Orange is the
    weakest. The filled badge with a white border is therefore required,
    and thin network-colored outlines must not be used in the day theme.
-   **Day badge letters:** white letters reach about 3.9 (A), 2.3 (B),
    4.2 (C), and 2.6 (D) to 1. Ink navy reaches about 3.1, 5.2, 2.9, and
    4.6 to 1. The best choice per color is white on A and C, navy on B
    and D, and A and C still fall below 4.5 to 1. Darker day values for
    A and C, or larger letters, are needed.
-   **Day lit and unlit walls:** only about 1.3 to 1 apart. In the day
    theme the difference would rely on roof saturation and the yellow
    window, so the day theme is not used for the phases where the
    difference matters.
-   **Alert red against grass:** about 1.6 to 1 in the night theme, so
    the invalid marker is a solid fill with a white icon, not a red
    outline.
-   **Star on against panel cream:** about 1.8 to 2 to 1. Star icons
    need a navy outline.
-   **Night theme values:** network colors are at least 3 to 1 against
    the night grass and about 5.8 to 6.2 to 1 against the night asphalt.
    Lit and unlit walls are about 7.6 to 1 apart. The unlit wall against
    the grass is only about 1.6 to 1, so the outline token (about 2.7 to
    1 against the grass) is required. Badge letters in the night outline
    color reach about 8.1 to 8.8 to 1.

## 15. Level Data and Validation

### 15.1 Data-driven format

Campaign levels are stored as JSON from the beginning. This allows a
future Level Creator to use the same schema.

A level definition includes:

-   Level ID and name.
-   Grid width and height.
-   Fixed road coordinates.
-   Restricted terrain cells.
-   Building instances: ID, variant, origin, score.
-   Generator inventory by type and quantity.
-   Mandatory objective definition.
-   Star score thresholds.

Static building and generator definitions (including footprint, demand,
output) are stored separately from level data.

### 15.2 Example building definitions

Illustrative only; not final balance values.

``` json
{
  "house": {
    "name": "House",
    "category": "residential",
    "width": 1,
    "height": 1,
    "demand": 2,
    "output": 0
  },
  "small_hospital": {
    "name": "Small Hospital",
    "category": "hospital",
    "width": 2,
    "height": 2,
    "demand": 5,
    "output": 0
  },
  "small_generator": {
    "name": "Small Generator",
    "category": "generator",
    "width": 1,
    "height": 1,
    "demand": 0,
    "output": 3
  },
  "generator": {
    "name": "Generator",
    "category": "generator",
    "width": 2,
    "height": 2,
    "demand": 0,
    "output": 8
  }
}
```

### 15.3 Example level

Illustrative only.

``` json
{
  "id": "example-01",
  "name": "Two Districts",
  "grid": { "width": 8, "height": 5 },
  "roads": [
    { "x": 0, "y": 2 }, { "x": 1, "y": 2 }, { "x": 2, "y": 2 }, { "x": 3, "y": 2 },
    { "x": 5, "y": 2 }, { "x": 6, "y": 2 }, { "x": 7, "y": 2 }
  ],
  "terrain": [{ "x": 4, "y": 4 }],
  "buildings": [
    { "id": "b1", "variant": "house", "origin": { "x": 1, "y": 1 }, "score": 10 },
    { "id": "b2", "variant": "house", "origin": { "x": 2, "y": 3 }, "score": 15 },
    { "id": "b3", "variant": "small_hospital", "origin": { "x": 5, "y": 0 }, "score": 40 }
  ],
  "inventory": { "small_generator": 1, "generator": 1 },
  "objective": {
    "type": "and",
    "children": [
      { "type": "categoryCount", "category": "hospital", "min": 1 },
      { "type": "categoryCount", "category": "residential", "min": 1 }
    ]
  },
  "stars": { "two": 40, "three": 55 }
}
```

How this level plays out:

-   There are two road components: **A** (x = 0..3 on row 2) and **B**
    (x = 5..7 on row 2). The empty cell (4, 2) touches both, so a 1×1
    generator there is *invalid*.
-   Network A has two houses (demand 2 + 2 = 4). Network B has one
    hospital (demand 5).
-   Placing the generator (output 8) on B powers the hospital. Placing
    the small generator (output 3) on A can power only one house
    (demand 2; both would need 4), so the player chooses the 15-point
    house.
-   Best result: 15 + 40 = 55 points, which meets the 3-star threshold.
    The opposite assignment (generator on A, small generator on B)
    leaves the hospital unpowered and fails the objective.

### 15.4 Load-time validation

Validate level data when loading it. At minimum, check:

-   Grid dimensions are valid.
-   Road, terrain, and building footprints are within the grid.
-   Fixed objects do not overlap.
-   Building instance IDs are unique.
-   Building variant IDs exist; inventory type IDs exist and have
    `category = "generator"`.
-   Generator inventory quantities are non-negative integers.
-   Objective definitions follow the supported schema and reference
    existing categories and building IDs.
-   Star thresholds are integers and `two <= three`.
-   Every fixed building touches at most one distinct road component.
-   Every fixed building has road adjacency whenever the objective
    requires it to be powered (for example `allBuildingsPowered`, or a
    `buildingPowered` reference to it). This is primarily a
    level-production rule; the validator enforces it as a safety net.
-   The level contains at least one road network and at most four
    (visual palette limit).

Invalid level data must produce a clear development-time/load-time error
rather than causing undefined gameplay behavior. Both buildings with
ambiguous networks and unreachable required buildings are revisited in
Phase 2.

## 16. Technical Stack

Recommended MVP stack (versions are pinned when the project is
scaffolded):

| Concern | Technology |
|----|----|
| Application | React |
| Language | TypeScript |
| Build tooling | Vite |
| Routing | React Router (level select and game screens) |
| Grid rendering | CSS Grid |
| State management | Zustand |
| Styling | Tailwind CSS |
| Theming | CSS custom properties per theme (`data-theme`), see 14.6 |
| Typography | Google Sans Flex (variable font), see 14.7 |
| Runtime data validation | Zod |
| Unit testing | Vitest |
| Package manager | pnpm |
| Linting/formatting | ESLint and Prettier |
| Road components | BFS or DFS |
| CSP solver | Custom TypeScript implementation |
| Solver execution | Web Worker |
| Solver benchmark | Node-run TypeScript script |
| Campaign progress | localStorage (versioned key) |

A game engine such as Phaser or Godot is not required for the MVP.

**Hosting:** the first milestone is a local version. Deployment is
optional and may move to Phase 2. The build is a static site, so it can
be hosted on any static host (for example Vercel or Wasmer).

## 17. Suggested Project Structure

``` text
src/
├── app/                      # routing, screens (level select, game)
├── components/
│   ├── game/
│   │   ├── GameGrid.tsx
│   │   ├── GridCell.tsx
│   │   ├── Road.tsx
│   │   ├── Building.tsx
│   │   ├── Generator.tsx
│   │   ├── GameHUD.tsx
│   │   ├── PlacementPanel.tsx
│   │   ├── ActivationPanel.tsx
│   │   ├── SimulationView.tsx
│   │   └── ResultPanel.tsx
│   └── ui/
├── data/
│   ├── buildings.json        # includes generator variants
│   └── campaign/
├── engine/                   # pure TypeScript, no React/Zustand imports
│   ├── grid/
│   │   ├── grid.ts
│   │   └── footprint.ts
│   ├── connectivity/
│   │   ├── connectedComponents.ts
│   │   └── networkAssignment.ts
│   ├── placement/
│   │   ├── evaluatePlacement.ts
│   │   └── generatorActions.ts
│   ├── flow/
│   │   └── phases.ts
│   ├── simulation/
│   │   ├── capacity.ts
│   │   ├── activation.ts
│   │   └── runSimulation.ts
│   ├── objectives/
│   │   ├── objectiveEvaluator.ts
│   │   └── scoring.ts
│   └── csp/
│       ├── variables.ts
│       ├── domains.ts
│       ├── constraints.ts
│       ├── backtracking.ts
│       ├── heuristics.ts
│       ├── optimizer.ts
│       └── solver.ts
├── styles/
│   └── tokens.css            # Day and Night CSS custom properties
├── stores/
│   └── gameStore.ts
├── workers/
│   └── solver.worker.ts
├── types/
│   ├── level.ts
│   ├── building.ts
│   ├── grid.ts
│   ├── game.ts
│   └── solver.ts
└── tests/
    ├── connectivity/
    ├── placement/
    ├── simulation/
    ├── objectives/
    └── csp/
scripts/
├── validate-levels.ts
└── benchmark-solver.ts
```

## 18. State Model and Engine API

### 18.1 Three layers

-   **`LevelDefinition`:** immutable validated JSON (section 15).
-   **`LevelIndex`:** derived once at load: road component IDs,
    building-to-network assignment, footprint helpers.
-   **`GameState`:** mutable gameplay state.

``` ts
type Phase = "placement" | "activation" | "simulation" | "result";

interface PlacedGenerator {
  instanceId: string;
  typeId: string;
  origin: { x: number; y: number };
}

interface GameState {
  phase: Phase;
  generators: PlacedGenerator[];
  activeBuildingIds: Set<string>; // empty until the Activation phase
  result: SimulationResult | null;
}
```

Remaining inventory and network assignments are derived from
`generators` and the `LevelIndex`, not stored separately.

### 18.2 Rules for the engine

-   The engine is pure TypeScript with no React or Zustand imports, so
    the UI, the solver, the Web Worker, and tests all use the same code.
-   Zustand only holds `GameState` and calls engine functions.
-   Every state-changing function checks the current phase and returns a
    result object, either a new state or a rejection with a reason. It
    never mutates its input.

### 18.3 Suggested engine functions

-   `buildLevelIndex(level)`
-   `evaluatePlacement(index, state, typeId, origin, ignoreInstanceId?)`
-   `placeGenerator`, `moveGenerator`, `removeGenerator`
-   `computeCapacityReport(index, state)`
-   `resetLevel(level)`
-   `enterActivation`, `activateBuilding`, `deactivateBuilding`, `goBack`
-   `runSimulation(index, state)`
-   `evaluateObjective`, `computeScore`, `computeStars`

## 19. Simulation Pipeline

Level initialization:

1.  Load and validate level data.
2.  Build the grid representation.
3.  Calculate fixed road components using orthogonal BFS/DFS.
4.  Assign fixed buildings to their road components.
5.  Create the initial `GameState` in the Placement phase.

Placement phase (per successful action):

1.  Validate the action (phase, inventory, footprint, placement rule).
2.  Reject with a reason, or commit the new generator layout.
3.  Run the capacity check.

Activation phase:

1.  Start from an empty active set.
2.  Apply auto-activation to every network where
    `demand(n) <= generation(n)`.
3.  Process the player's activation and deactivation choices.

Simulation phase:

1.  Compute per-network accounting from the final state.
2.  Evaluate mandatory objectives.
3.  Calculate score and star rating.
4.  Update the saved best result when the level was completed and the
    result is better.
5.  The UI plays the animation from the compiled result.

## 20. Testing Requirements

The MVP includes automated tests for at least the following.

### 20.1 Road connectivity

-   Orthogonally adjacent road cells belong to the same component.
-   Diagonally adjacent road cells belong to separate components.
-   Multiple disconnected road systems receive distinct IDs.

### 20.2 Generator placement

-   1×1 generator adjacent to zero road components is valid and
    disconnected.
-   Generator adjacent to one road component is valid and connected.
-   Generator adjacent to multiple cells of the same component is valid.
-   Generator adjacent to two distinct components is invalid.
-   Diagonal-only road adjacency does not establish connectivity.
-   Multi-cell generator: adjacency is evaluated over the whole
    footprint boundary.
-   Footprints overlapping roads, buildings, terrain, other generators,
    or the grid boundary are rejected.
-   Invalid new placement is rejected and inventory remains unchanged.
-   Invalid movement restores the generator's previous position.
-   A move may overlap the generator's own previous footprint.
-   Valid disconnected placement does not trigger an invalid-placement
    toast.
-   Place, move, and remove are rejected outside the Placement phase.

### 20.3 Capacity check

-   Only connected generators contribute generation.
-   Generator output is assigned to exactly one network.
-   Disconnected networks do not share capacity.
-   The check runs after each successful place, move, and remove, and
    not after a rejected action.
-   `canPowerAll` is true exactly when generation ≥ total connected
    demand.

### 20.4 Activation

-   A building activates only with full demand available.
-   Buildings without road connectivity cannot be activated.
-   Deactivation frees capacity.
-   Auto-activation applies exactly to networks where
    `demand(n) <= generation(n)`, and only to those networks.
-   Activation in one network does not affect another.
-   Activation and deactivation are rejected outside the Activation
    phase.
-   Reset clears generators and activation state and restores the
    original level state.
-   Back from Activation to Placement clears the active set and keeps
    the placed generators.
-   Back from Result to Activation keeps the active set and discards
    the result.
-   Back is rejected during the Simulation phase.

### 20.5 Simulation, objectives, and scoring

-   `runSimulation` is deterministic for identical inputs.
-   AND objectives require all child conditions.
-   OR objectives require at least one child condition.
-   Category-count objectives count powered buildings only.
-   Individual-building objectives check the correct instance.
-   Score includes only powered buildings.
-   Star thresholds are applied only after mandatory objectives are
    satisfied.
-   Best-result comparison orders by stars, then score.

### 20.6 CSP

-   Solver never returns an invalid generator placement.
-   Solver respects fixed placements in respect-current-placements
    mode.
-   Solver may rearrange generators in rearrangement mode.
-   Solver respects network independence and capacity.
-   Solver and gameplay agree on solution validity and score.
-   Backtracking, MRV, and MRV with forward checking produce valid
    results.
-   Timeout returns the best solution found so far, flagged as possibly
    incomplete; cancellation stops the search.

### 20.7 Level validation

-   Each load-time validation rule in 15.4 has a passing and a failing
    test case.

## 21. Development Roadmap

### Phase 1 --- MVP

1.  **Project setup and grid foundation**
    -   Scaffold and tooling
    -   Types and Zod schemas
    -   Fixed roads, buildings, footprints, restricted terrain
2.  **Connectivity**
    -   Orthogonal road components
    -   Building-to-road assignment
3.  **Placement phase**
    -   Placement validation (multi-cell footprints)
    -   Place, move, remove, inventory, reset
    -   Capacity check
4.  **Activation phase**
    -   Per-network accounting
    -   Manual activation and deactivation
    -   Auto-activation
5.  **Simulation phase and campaign**
    -   `runSimulation`, objectives, score, stars
    -   JSON levels, level select, progress persistence
6.  **CSP solver**
    -   Backtracking, MRV, forward checking
    -   Feasibility and optimization modes
    -   Web Worker, timeout, cancellation
    -   Statistics and benchmark script
7.  **UI implementation and polish**
    -   Implement the Figma design
    -   Day and Night themes and the phase visual modes (14.8)
    -   Simulation animation
    -   Solver help interface
    -   Approximately 5--10 campaign levels

### Phase 2

-   Level Creator and custom level validation
-   Revisit buildings touching multiple road components and unreachable
    required buildings
-   Level-fixed power-producing buildings (power plants) and other
    advanced building mechanics
-   Generator rotation
-   Performance and user-experience optimization
-   Partial power
-   Deployment (static hosting)
-   Educational CSP visualization
-   Save/resume unfinished levels
-   Public community level library, accounts, and cloud persistence
-   Solver difficulty estimation
-   Campaign expansion to 30 or more levels

### Phase 3 --- Potential

-   Additional building and generator types
-   Advanced electrical infrastructure
-   Community discovery features
-   Leaderboards and other social features

## 22. Explicit MVP Exclusions

The following are intentionally outside the MVP:

-   Player-created, removed, or edited roads, and road placement tools.
-   Electricity transfer between disconnected road networks.
-   Diagonal connectivity.
-   Buildings acting as electricity paths between roads.
-   Partial building power.
-   Level-fixed power-producing buildings (power plants).
-   Generator rotation.
-   Random behavior of any kind.
-   Level Creator and public community level library.
-   Multiplayer.
-   Saving and resuming unfinished levels.
-   Educational visualization of CSP internals.
-   Applying a solver result to the board automatically.

## 23. Decisions That Must Remain Consistent

These core rules must not drift between UI, engine, solver, and tests:

1.  Roads are fixed and use orthogonal connectivity.
2.  Each connected road component is an independent electrical network.
3.  Generator placement validity is determined by the number of
    distinct **orthogonally adjacent** road components over the
    generator's footprint boundary.
4.  Zero adjacent components means valid but disconnected; exactly one
    means valid and connected; two or more means invalid.
5.  Invalid generator placement is rejected; invalid generators never
    remain on the board.
6.  Valid but disconnected generators are allowed and do not produce an
    invalid-placement toast.
7.  Only connected generators contribute power, and each contributes to
    exactly one network.
8.  Generators need no activation.
9.  Each attempt follows Placement → Activation → Simulation. Actions
    are only valid in their phase.
10. The capacity check runs after every successful place, move, and
    remove, and is informational only.
11. Buildings require road connectivity and full demand to activate.
12. Network capacity and activation are independent for each road
    component.
13. Auto-activation applies to a network exactly when its total
    connected demand is within its generation.
14. Manual deactivation is allowed during the Activation phase.
15. Reset unplaces all generators and returns the level to its original
    state; it never triggers auto-activation.
16. Building technical values (footprint, demand, output) are
    predefined; only building score is configurable per level.
17. Mandatory objectives determine completion; score determines the
    additional star thresholds.
18. Animation never affects the compiled result.
19. The CSP solver obeys exactly the same rules as gameplay.
20. All campaign levels are unlocked from the beginning.
21. Solver assistance has no score penalty.
22. Meaning is never carried by color alone: placement states and
    network identity also use shape, line style, an icon, or a letter.

## 24. Resolved Decisions, Assumptions, and Open Items

### 24.1 Resolved decisions

-   **Power plants:** level-fixed power-producing buildings are
    deferred to Phase 2.
-   **Auto-activation trigger:** applied automatically on entering the
    Activation phase for the MVP; to be evaluated through playtesting.
-   **Phase navigation:** a back button moves between phases (see 3.2).
-   **Generator shape:** fixed rectangular footprints in the MVP;
    rotation is deferred to Phase 2.
-   **Solver availability:** Placement phase only.
-   **MVP priority:** ease of implementation. Performance and
    user-experience optimization are Phase 2 targets.

### 24.2 Assumptions (confirm or correct)

-   Back from Result keeps the active set; back from Activation clears
    it and keeps the placed generators; back is unavailable while the
    Simulation animation plays.
-   Entering the Activation phase with no generators, or with
    insufficient capacity, is allowed.
-   Multi-cell generators are validated over the whole footprint
    boundary (union of adjacent cells), reducing to the original rule
    for 1×1.
-   Generators have `demand = 0`, need no activation, and have no score.
-   Generators and fixed buildings share one definitions file, with
    generators identified by `category = "generator"`.
-   Best result ordering is stars then score, and only completed
    results are saved.
-   Undo is excluded from the MVP engine unless Figma includes it.
-   Visual mode per phase: Placement uses the Day theme, Activation
    and Simulation use the Night theme, and the result screen follows
    Simulation.
-   In Placement all fixed buildings are shown in the unlit state
    without status bubbles, since nothing is powered.
-   MVP levels have at most four road networks.

### 24.3 Open design items

-   **Day palette contrast:** network colors, badge letters, and star
    icons are weak in the day theme (14.10). Adjusted values are
    needed.
-   **Logo values:** the weight and roundness used in the logo are
    needed to align the display text.

## 25. Revision History

**Revision 4** changes relative to revision 3:

-   Added the visual design baseline (14.5 to 14.10): Day and Night
    color tokens with CSS variables, Google Sans Flex typography, the
    three phase visual modes, visual state rules, and verified contrast
    limitations.
-   Added the theme and typography rows to the technical stack, a
    `styles/tokens.css` file to the project structure, and a four-network
    limit to level validation.
-   Added the visual mode assumptions and open design items to section
    24.

**Revision 3** changes relative to revision 2:

-   Power plants (level-fixed power-producing buildings) moved to
    Phase 2.
-   Generator rotation moved to Phase 2; footprints are fixed in the MVP.
-   Added back navigation between phases, with defined effects on the
    active set and result.
-   Auto-activation fixed as automatic on phase entry for the MVP,
    with the trigger isolated for later playtesting.
-   Solver restricted to the Placement phase.
-   Stated the MVP priority: ease of implementation first, performance
    and user experience in Phase 2.
-   Replaced the open-items section with resolved decisions and
    assumptions.

**Revision 2** changes relative to the first specification:

-   Replaced the single continuous play loop with three phases:
    Placement, Activation, Simulation.
-   Removed network reset on generator removal or movement. Capacity
    insufficiency is now handled in the Activation phase through
    player selection, with an informational capacity check in the
    Placement phase.
-   Removed activation ordering and power-plant bootstrap rules (all
    fixed buildings only consume in the MVP). Activation state is now a
    set.
-   Generators became a building type with per-type footprint and output,
    with footprint-based placement validation.
-   Reset now means: unplace all generators and return to the original
    level state, with no auto-activation.
-   Added manual deactivation in the Activation phase.
-   Clarified that building technical values are predefined and only
    score varies per level.
-   Solver now presents a read-only layout for the player to recreate,
    with timeout, cancellation, and loading state; the solver benchmark
    script is a deliverable.
-   UI/UX details defer to the Figma design; this document keeps only
    functional requirements.
-   Added the state model, engine API outline, an example level, and
    resolved the stack and tooling choices.

------------------------------------------------------------------------

**End of specification.**
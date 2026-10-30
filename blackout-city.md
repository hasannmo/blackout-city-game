# Blackout City --- Complete Game Specification

**Document:** `blackout-city.md`\
**Project:** Blackout City\
**Status:** MVP specification\
**Genre:** Single-player, grid-based city electricity puzzle /
simulation

------------------------------------------------------------------------

## 1. Project Overview

Blackout City is a single-player, grid-based puzzle game in which the
player restores electricity to a city by strategically placing
generators beside predefined road networks and deciding which buildings
should receive power.

The game aims for a clean, accessible, simulation-oriented experience
inspired by the presentation style of *SimCity BuildIt*, while keeping
its core gameplay focused on electrical network planning and constraint
solving.

The player must: - Understand the fixed road layout and its disconnected
road networks. - Place a limited inventory of generators in valid
locations. - Connect generators to road networks. - Manage each
network's generation capacity and building demand. - Choose which
buildings to activate when available power is insufficient. - Complete
mandatory objectives and earn up to three stars. - Optionally use a
custom Constraint Satisfaction Problem (CSP) solver for assistance.

The MVP is single-player and campaign-focused. Roads are predefined and
cannot be edited by the player.

## 2. Design Principles

1.  **Readable rules:** Placement, connectivity, and power distribution
    must have distinct, predictable meanings.
2.  **Deterministic simulation:** The same level state and player
    actions must produce the same result.
3.  **Independent road networks:** Electricity cannot travel between
    disconnected road components.
4.  **No hidden placement penalties:** Valid but disconnected generators
    are allowed and do not repeatedly trigger error messages.
5.  **Shared simulation rules:** Gameplay validation and the CSP solver
    must use the same underlying rules.
6.  **Data-driven levels:** Campaign levels are stored as structured
    data so the same format can support a future level editor.
7.  **MVP simplicity:** Advanced mechanics such as partial power,
    editable roads, and community levels are deferred.

## 3. Core Game World

### 3.1 Grid

Each level is represented by a two-dimensional grid. Every cell has a
defined role.

Cell/content types: - **Empty:** Unoccupied, unrestricted cell. -
**Road:** Fixed road cell defined by the level. - **Building:** Fixed
building footprint defined by the level. - **Restricted terrain:**
Obstacles such as trees, water, or decorative terrain. - **Generator:**
Player-placed power source.

Roads, buildings, and restricted terrain are part of the level layout.
The player cannot place, remove, move, or connect roads in the MVP.

### 3.2 Orthogonal adjacency

Orthogonal adjacency means sharing an edge: - Up - Down - Left - Right

Diagonal adjacency does not count for road connectivity, building
connectivity, generator connectivity, or generator placement validation.

### 3.3 Buildings with multiple cells

Buildings may occupy multiple cells, such as 1×1 or 2×2 footprints.

A building is adjacent to a road if at least one cell along its
footprint boundary is orthogonally adjacent to a road cell. Buildings
cannot connect directly to other buildings and cannot act as
intermediate electricity paths.

## 4. Road Networks

### 4.1 Road components

A road network is a connected component of road cells. Road cells belong
to the same component when they can be reached from one another through
orthogonally adjacent road cells.

Each connected road component is an independent electrical network.

### 4.2 Network rules

-   Road-to-road connectivity is orthogonal only.
-   Diagonal road contact does not connect road cells.
-   Disconnected road components remain electrically independent.
-   Buildings and generators do not join separate road components.
-   Buildings cannot carry electricity from one road network to another.
-   Road components are fixed for the duration of a level because roads
    cannot be edited.

### 4.3 Precomputation

Road components should be calculated once when a level is loaded, using
BFS or DFS. Each road cell receives a stable `networkId` or component
identifier.

Because roads are immutable during a level, their component assignments
do not need to be recalculated after generator or building actions.

## 5. Generator System

### 5.1 Generator properties

A generator is a player-placed power source. Its static definition
includes at least: - ID - Name - Power output - Any future type-specific
attributes

Generator types and available quantities are configured per level.
Generator output belongs to the generator type definition, not to an
individual placement.

### 5.2 Placement area

A generator can be placed only on an empty, unrestricted cell. It cannot
occupy: - A road cell - A building cell - Restricted terrain - Another
generator's cell

A candidate cell must also pass generator placement validation.

### 5.3 Placement validity and connectivity are separate concepts

The game has two placement states: - `valid` - `invalid`

Power connectivity is calculated separately: - `connected` -
`disconnected`

A generator can therefore be validly placed while disconnected from a
road network.

### 5.4 Generator placement validation

Only orthogonally adjacent road cells are considered.

For a candidate generator position: 1. Inspect the four orthogonally
adjacent cells. 2. Collect the distinct road component IDs among those
cells. 3. Count the distinct component IDs.

The result is:

  ------------------------------------------------------------------------
   Number of distinct adjacent Placement state       Connectivity
               road components                       
  ---------------------------- --------------------- ---------------------
                             0 Valid                 Disconnected

                             1 Valid                 Connected

                     2 or more Invalid               Not applicable
  ------------------------------------------------------------------------

Important details: - Count distinct road component IDs, not adjacent
road cells. - If a generator touches multiple road cells belonging to
the same component, it is still valid and connected. - Diagonal road
cells are ignored entirely. - A generator touching no road component is
valid but disconnected. - A generator touching two or more distinct road
components is invalid, even if it would otherwise be adjacent to both.

This is the definitive rule for generator placement. A generator must
not bridge separate road systems.

### 5.5 Invalid placement behavior

Invalid placements are rejected; invalid generators must never remain on
the board.

-   **Placing a new generator:** Reject the placement. The generator
    remains available in the toolbar/inventory.
-   **Moving an existing generator:** Reject the move and restore the
    generator to its previous position.
-   Show a UI toast explaining that a generator cannot touch multiple
    separate road networks.
-   Do not show an invalid-placement toast for a valid but disconnected
    generator.
-   Do not commit an invalid placement to game state or run power
    distribution for it.

### 5.6 Generator connectivity and power contribution

A generator is connected when it is orthogonally adjacent to at least
one road cell belonging to exactly one road component.

-   A connected generator is assigned to that road component.
-   A disconnected generator has no `networkId` and contributes no
    power.
-   A connected generator contributes its configured output to its
    assigned network.
-   A generator contributes to exactly one network.
-   Generator output is not duplicated across multiple networks.

Suggested status representation:

``` ts
type PlacementState = "valid" | "invalid";
type ConnectivityState = "connected" | "disconnected";

interface GeneratorStatus {
  placement: PlacementState;
  connectivity: ConnectivityState;
  networkId: string | null;
}
```

Suggested conceptual calculation:

``` ts
const adjacentNetworks = getOrthogonalAdjacentRoadNetworks(generator);

const placement = adjacentNetworks.size <= 1 ? "valid" : "invalid";
const connectivity =
  adjacentNetworks.size === 1 ? "connected" : "disconnected";

const networkId =
  adjacentNetworks.size === 1
    ? [...adjacentNetworks][0]
    : null;
```

The placement operation must reject the generator if
`placement === "invalid"`.

### 5.7 Generator movement, removal, and inventory

-   The player may place, move, and remove generators without an in-game
    cost.
-   Generator inventory is limited by the quantities specified in the
    level.
-   Moving a generator does not consume an additional generator.
-   Removing a generator returns it to the available inventory.
-   A move or removal can change the capacity of the affected road
    network and therefore requires power-state recalculation.
-   Moving a generator should be treated as a validated operation: do
    not permanently remove it from its old position unless the new
    position is valid.

## 6. Building System

### 6.1 Building definitions

Building variants have static properties in the MVP: - `id` - `name` -
`category` - `width` - `height` - `demand` - `output`

Each building instance in a level also has: - A unique instance ID - A
variant ID - A grid position - A score value configured for that level
instance

Examples of categories: - Residential - Commercial - Hospital -
Factory - Power plant

Most buildings have `output = 0`. Power-generating buildings have a
positive output.

### 6.2 Building-to-road connectivity

A building is connected to a road network when at least one cell on its
footprint boundary is orthogonally adjacent to a road cell.

-   A building can be connected to one or more road cells in the same
    road component.
-   If a building footprint is adjacent to multiple distinct road
    components, its network assignment must be explicitly resolved in
    the level rules before such a layout is used. For the MVP, level
    validation should preferably reject buildings that touch more than
    one distinct road component, avoiding ambiguous power assignment.
-   Diagonal adjacency does not count.
-   A building without road adjacency cannot receive power.

### 6.3 Building demand and activation

-   A building must receive its full power demand to activate.
-   Partial power is not supported in the MVP.
-   An unpowered building consumes no power and contributes no output.
-   An activated building consumes its configured demand.
-   An activated power-generating building also contributes its
    configured output.
-   A power-generating building must first be activated using generation
    already available to its network. It cannot use its own output to
    satisfy its initial activation demand.

### 6.4 Player-selected activation

When there is insufficient capacity to activate every remaining
connected building: - The player may choose any eligible connected,
unpowered building. - A building is eligible when the network has enough
remaining capacity to satisfy its full demand. - The player is not
forced to follow a predefined building priority. - If no remaining
building is eligible, none can be activated until network capacity
changes.

### 6.5 Automatic activation

When available capacity is sufficient to activate all remaining
connected buildings, the game automatically activates all of them.

Automatic activation must be deterministic: - Use a stable ordering,
such as building instance ID, when processing buildings. - Recalculate
available capacity after each activation. - Recalculate generation after
activating a power-generating building, because its output becomes
available only after activation. - Do not use random ordering.

The precise priority policy for automatic activation of power-generating
buildings is an implementation detail that must be kept deterministic.
The MVP should use one documented stable ordering consistently in
gameplay and solver simulation.

## 7. Electrical Simulation

### 7.1 Per-network accounting

Each road component has its own power accounting.

For each network, track at least: - Connected generator output - Output
from currently activated power-generating buildings - Demand from
currently activated buildings - Remaining capacity - Connected
buildings - Powered buildings

A useful accounting model is:

``` text
total generation =
    connected generator output
  + output from activated power-generating buildings

total consumption =
    demand from activated buildings

remaining capacity =
    total generation - total consumption
```

Only generators and buildings assigned to that network participate in
its accounting.

### 7.2 Activation eligibility

A connected, unpowered building can be activated when:

``` text
remaining capacity >= building demand
```

On activation: 1. Subtract the building's demand from available
capacity. 2. Mark the building as powered. 3. If it is a
power-generating building, add its output to network generation. 4.
Recalculate the network's capacity and eligibility.

A power plant's output must never be counted before that plant has been
activated.

### 7.3 Network independence

-   Power cannot be transferred between disconnected road components.
-   Excess power in one network cannot satisfy demand in another.
-   A generator contributes only to its assigned network.
-   Activation choices and capacity calculations are made independently
    per network.

### 7.4 Generator removal or movement and network reset

After a generator is moved or removed, recalculate the affected network.

-   If the remaining generation can support all currently activated
    buildings, keep their powered states.
-   If the current powered state can no longer be supported, all powered
    buildings in that affected network turn off and the network's
    activation state resets.
-   The player can then choose which buildings to activate again when
    sufficient power is available.
-   If a network loses all connected generators, its powered buildings
    turn off.
-   Only the affected network resets; other road networks remain
    unchanged.

For an all-or-nothing reset, activated power-generating buildings also
turn off. Their output is removed when the network resets. Their
previous output must not be used to keep them active during the reset
calculation.

### 7.5 Recalculation triggers

Recalculate the relevant network when: - A generator is placed. - A
generator is moved. - A generator is removed. - A building is
activated. - A building is deactivated as part of a network reset. - Any
future mechanic changes generation or demand.

Road components themselves do not need recalculation because roads are
fixed.

## 8. Objectives, Score, and Stars

### 8.1 Mandatory objectives

Mandatory objectives determine whether a level is completed.

Examples: - All buildings powered. - At least two hospitals powered. -
At least one residential building powered. - Two hospitals AND one
residential building powered. - Two hospitals OR one residential
building powered.

Objectives support predefined condition types and nested AND/OR
combinations.

Objective evaluation can count powered buildings by category or check
specific building instance IDs.

### 8.2 Completion

A level is completed when all mandatory objectives are satisfied.

The player does not need to achieve the maximum possible score to
complete a level.

### 8.3 Score

The score is the sum of the configured score values of currently powered
buildings:

``` text
score = sum(score value of each powered building)
```

Score is based on the final powered state, not merely on buildings
placed in the level.

Individual building instance score values can be configured per level.
Building variant demand, output, and footprint remain static in the MVP.

### 8.4 Star system

-   **1 star:** Mandatory objectives satisfied.
-   **2 stars:** Mandatory objectives satisfied and the first score
    threshold reached.
-   **3 stars:** Mandatory objectives satisfied and the second score
    threshold reached.

The second threshold must be greater than or equal to the first
threshold. Star thresholds are configured per level.

## 9. Campaign and Progression

### 9.1 MVP campaign

-   The MVP includes approximately 5--10 levels.
-   All levels are unlocked from the beginning.
-   Players may skip earlier levels and play any available campaign
    level.
-   Each level's completion and best result are saved independently.
-   Replaying a level may improve its score or star rating.
-   Preserve the best result for each level.
-   The MVP does not save or resume an unfinished level.

### 9.2 Future modes

Planned for later phases: - Level Creator - Public community level
library

These are not part of the MVP.

## 10. Constraint Satisfaction Problem (CSP) Solver

### 10.1 Purpose

The CSP solver provides an optional in-game assistance feature. It
searches for generator placements and building activation plans that
satisfy a level's constraints and objectives.

The solver must be a custom TypeScript implementation. Do not use a
black-box CSP library.

### 10.2 Solver scope

The solver searches for: - Generator positions. -
Generator-to-road-network assignments, derived from placement. -
Building activation decisions and activation order. - Whether mandatory
objectives can be satisfied. - A solution with the highest possible
score when optimization is requested.

Road placement is not part of the search because roads are fixed in each
level.

### 10.3 Solver inputs

-   Level grid and fixed roads.
-   Precomputed road components.
-   Building positions and variants.
-   Restricted terrain.
-   Generator types, output, and inventory.
-   Mandatory objectives.
-   Optional current player generator placements, depending on the
    selected help mode.

### 10.4 Solver outputs

-   Generator positions.
-   Assigned network for each connected generator.
-   Building activation plan/order.
-   Final powered buildings.
-   Generation, consumption, and remaining capacity per network.
-   Final score.
-   Solver statistics, including:
    -   Search nodes
    -   Backtracks
    -   Runtime
    -   Whether a valid solution was found
    -   Best score found, when optimizing

### 10.5 Constraints

The solver must enforce the same rules as gameplay: - Generators cannot
occupy roads, buildings, restricted terrain, or other generators. - A
generator must be orthogonally adjacent to no more than one distinct
road component. - A generator adjacent to zero road components is valid
but disconnected and contributes no power. - A generator adjacent to
exactly one road component is valid and connected. - A generator
adjacent to two or more distinct road components is invalid. - Diagonal
adjacency is ignored. - Buildings must be orthogonally connected to a
road network to receive power. - Road networks use orthogonal
connectivity only. - Buildings cannot connect directly to other
buildings. - Each road component has independent power capacity. - Full
building demand is required for activation. - Power-plant output is
available only after activation. - Activation order must respect power
availability. - Mandatory objectives must be satisfied.

### 10.6 Help modes

The player chooses between two modes:

1.  **Respect current placements:** Treat current generator positions as
    fixed. If no valid solution exists with those positions, report that
    no solution was found.
2.  **Allow rearrangement:** Allow the solver to reposition existing
    generators within the level's valid placement rules.

Using solver assistance carries no score penalty.

### 10.7 Feasibility and optimization

**Feasibility mode** - Find the first valid solution satisfying
mandatory objectives. - Stop when a solution is found, subject to any
configured time limit.

**Optimization mode** - Find the highest-scoring valid solution. - A
suitable approach is branch-and-bound: 1. Find an initial valid
solution. 2. Store its score as the current best. 3. Continue searching.
4. Calculate an upper bound on the score achievable from the current
search branch. 5. Prune branches that cannot exceed the current best
score. 6. Return the best solution found.

A time limit may be used. If the limit is reached after a valid solution
has been found, return the best valid solution found so far and indicate
that optimization may be incomplete.

### 10.8 CSP techniques and evaluation

The academic evaluation compares: 1. Plain backtracking. 2. Backtracking
with Minimum Remaining Values (MRV). 3. Backtracking with MRV and
forward checking.

Measure: - Search nodes - Backtracks - Runtime - Success/failure - Best
score

Avoid naive brute force over every grid cell. Candidate generator
positions should be derived efficiently, especially from cells that can
be adjacent to road networks.

The initial user-facing solver result should show the solution and basic
statistics. A step-by-step educational visualization of domain pruning
and backtracking is deferred to a later phase.

### 10.9 Shared rules

The gameplay engine and CSP solver must share the same placement
validation, road assignment, power calculation, activation, objective
evaluation, and scoring logic wherever practical. The solver must never
return a configuration that gameplay considers invalid.

## 11. User Interface and User Experience

### 11.1 Visual direction

-   Minimalist and simulation-oriented.
-   Clear visual distinction between roads, buildings, generators, and
    restricted terrain.
-   Powered buildings appear illuminated.
-   Unpowered buildings appear darkened or otherwise visually inactive.
-   Show generator and network connectivity clearly.
-   Invalid placement receives immediate, understandable feedback.

### 11.2 Main gameplay layout

**Top HUD** - Level name/number - Available power - Total generation -
Total consumption - Score - Mandatory objectives

**Main grid** - Fixed roads - Buildings - Generators - Restricted
terrain - Powered/unpowered visual states

**Building information panel** - Building name and category - Power
demand - Power output, if applicable - Score value - Activation status -
Activate action when eligible

**Bottom toolbar** - Generator selection and placement - Remove/eraser
tool - Selection tool - Undo, if implemented - CSP solver/help - Reset
level

There is no road placement tool in the MVP.

### 11.3 Feedback rules

-   Invalid generator placement: reject the action and show a toast.
-   Valid but disconnected generator placement: allow placement without
    an error toast.
-   Connected generator: show its assigned road network and contribution
    to generation.
-   Building without road connectivity: indicate that it cannot receive
    power.
-   Building with insufficient available capacity: indicate that it
    cannot currently be activated.
-   Powered building: show its active state.
-   Network reset: clearly communicate that the affected network has
    lost its powered state and requires new activation choices.

### 11.4 Solver help UI

-   Offer the two solver modes: respect current placements or allow
    rearrangement.
-   Show the resulting generator positions and activation plan.
-   Show basic solver statistics.
-   Do not penalize the player's score for using help.

## 12. Level Data and Validation

### 12.1 Data-driven format

Campaign levels should be stored as JSON from the beginning. This allows
a future Level Creator to use the same level schema.

A level definition should include: - Level ID and name - Grid width and
height - Fixed road coordinates - Generator inventory by type and
quantity - Building instances, including ID, variant, position, and
score - Restricted terrain and footprints - Mandatory objective
definitions - Star score thresholds

Static building and generator definitions should be stored separately
from individual level data.

### 12.2 Example building definitions

The following values are illustrative only and are not final balance
values:

``` json
{
  "small_hospital": {
    "name": "Small Hospital",
    "category": "hospital",
    "width": 2,
    "height": 2,
    "demand": 5,
    "output": 0
  },
  "solar_plant": {
    "name": "Solar Plant",
    "category": "power_plant",
    "width": 2,
    "height": 2,
    "demand": 2,
    "output": 5
  }
}
```

### 12.3 Load-time validation

Validate level data when loading it. At minimum, check: - Grid
dimensions are valid. - Road coordinates are within the grid. - Building
and terrain footprints are within the grid. - Fixed objects do not
overlap illegally. - Generator inventory quantities are valid. -
Building and generator variant IDs exist. - Objective definitions follow
the supported schema. - Star thresholds are valid and ordered. -
Buildings have an unambiguous road-network assignment under the MVP
rules. - Level coordinates and footprints are valid. - The level
contains usable road networks where required.

Invalid level data should produce a clear development-time/load-time
error rather than causing undefined gameplay behavior.

## 13. Technical Stack

Recommended MVP stack:

  Concern                   Technology
  ------------------------- --------------------------------------------
  Application               React
  Language                  TypeScript
  Build tooling             Vite
  Grid rendering            CSS Grid
  State management          Zustand
  Styling                   Tailwind CSS or equivalent project styling
  Runtime data validation   Zod
  Unit testing              Vitest
  Road components           BFS or DFS
  CSP solver                Custom TypeScript implementation
  Solver execution          Web Worker
  Campaign progress         localStorage

A game engine such as Phaser or Godot is not required for the MVP. React
and CSS Grid are sufficient for the board-based interaction and
interface.

## 14. Suggested Project Structure

``` text
src/
├── app/
├── components/
│   ├── game/
│   │   ├── GameGrid.tsx
│   │   ├── GridCell.tsx
│   │   ├── Road.tsx
│   │   ├── Building.tsx
│   │   ├── Generator.tsx
│   │   ├── GameHUD.tsx
│   │   └── GameToolbar.tsx
│   └── ui/
├── data/
│   ├── buildings.json
│   ├── generators.json
│   └── campaign/
├── engine/
│   ├── grid/
│   │   ├── grid.ts
│   │   └── placement.ts
│   ├── connectivity/
│   │   ├── roadGraph.ts
│   │   ├── connectedComponents.ts
│   │   └── networkAssignment.ts
│   ├── simulation/
│   │   ├── powerCalculation.ts
│   │   ├── activation.ts
│   │   ├── networkReset.ts
│   │   └── simulation.ts
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
├── stores/
│   └── gameStore.ts
├── workers/
│   └── solver.worker.ts
├── types/
│   ├── level.ts
│   ├── building.ts
│   ├── grid.ts
│   ├── generator.ts
│   └── solver.ts
└── tests/
    ├── connectivity/
    ├── simulation/
    ├── objectives/
    └── csp/
```

## 15. Simulation Pipeline

A typical level initialization and simulation flow:

1.  Load and validate level data.
2.  Build the grid representation.
3.  Calculate fixed road connected components using orthogonal BFS/DFS.
4.  Assign buildings to their road components.
5.  Validate generator positions.
6.  For each valid generator, calculate orthogonal adjacent road
    components:
    -   Zero components: valid, disconnected, no network assignment.
    -   One component: valid, connected, assigned to that network.
    -   More than one component: invalid; reject the placement
        operation.
7.  Calculate generator capacity per network.
8.  Process player building activation choices.
9.  Apply deterministic automatic activation where its conditions are
    met.
10. Evaluate mandatory objectives.
11. Calculate score and star rating.
12. Update saved best campaign result when appropriate.

The fixed road components can be cached for the duration of the level.
Generator and building assignments should be recalculated only when
relevant state changes.

## 16. Testing Requirements

The MVP should include automated tests for at least the following.

### 16.1 Road connectivity

-   Orthogonally adjacent road cells belong to the same component.
-   Diagonally adjacent road cells belong to separate components.
-   Multiple disconnected road systems receive distinct IDs.

### 16.2 Generator placement

-   Generator adjacent to zero road components is valid and
    disconnected.
-   Generator adjacent to one road component is valid and connected.
-   Generator adjacent to multiple cells of the same component is valid.
-   Generator adjacent to two distinct components is invalid.
-   Diagonal-only road adjacency does not establish connectivity.
-   Invalid new placement is rejected and inventory remains unchanged.
-   Invalid movement restores the generator's previous position.
-   Valid disconnected placement does not trigger an invalid-placement
    toast.

### 16.3 Power simulation

-   Only connected generators contribute output.
-   Generator output is assigned to exactly one network.
-   Disconnected networks do not share capacity.
-   Full demand is required for building activation.
-   A power plant contributes output only after activation.
-   Activating a building updates capacity correctly.
-   Deterministic automatic activation produces repeatable results.
-   Removing a generator preserves powered buildings if capacity remains
    sufficient.
-   Removing a generator resets only the affected network when capacity
    becomes insufficient.
-   A reset turns off activated power plants and removes their output.
-   Other road networks remain unaffected by a reset.

### 16.4 Objectives and scoring

-   AND objectives require all child conditions.
-   OR objectives require at least one child condition.
-   Category-count objectives count powered buildings only.
-   Individual-building objectives check the correct instance.
-   Score includes only powered buildings.
-   Star thresholds are applied only after mandatory objectives are
    satisfied.

### 16.5 CSP

-   Solver never returns an invalid generator placement.
-   Solver respects fixed placements in respect-current-placement mode.
-   Solver may rearrange generators in rearrangement mode.
-   Solver respects network independence and activation order.
-   Solver and gameplay agree on solution validity and score.
-   Backtracking, MRV, and forward checking variants produce valid
    results.

## 17. Development Roadmap

### Phase 1 --- MVP

1.  **Grid foundation**
    -   Fixed roads
    -   Buildings and footprints
    -   Restricted terrain
    -   Generator representation
2.  **Connectivity**
    -   Orthogonal road components
    -   Building-to-road assignment
    -   Generator placement validation
    -   Generator connectivity and network assignment
3.  **Generator mechanics**
    -   Placement
    -   Rejection of invalid placements
    -   Movement and removal
    -   Inventory
    -   Network recalculation
4.  **Electrical simulation**
    -   Per-network capacity
    -   Building activation
    -   Power-generating buildings
    -   Automatic activation
    -   Network reset behavior
5.  **Campaign**
    -   JSON level definitions
    -   Mandatory objectives
    -   Score and stars
    -   Level selection and progress persistence
6.  **CSP solver**
    -   Backtracking
    -   MRV
    -   Forward checking
    -   Feasibility mode
    -   Optimization mode
    -   Solver statistics
7.  **Polish**
    -   HUD and visual power states
    -   Placement feedback
    -   Building information panel
    -   Solver help interface
    -   Reset and local progress
    -   Approximately 5--10 campaign levels

### Phase 2

-   Level Creator
-   Custom level validation and testing
-   Partial power and advanced building mechanics
-   Automatic priority-based activation
-   Educational CSP visualization
-   Save/resume unfinished levels
-   More configurable building properties
-   Public community level library
-   User accounts and cloud persistence
-   Supabase authentication and PostgreSQL
-   Solver difficulty estimation
-   Campaign expansion to 30 or more levels

### Phase 3 --- Potential

-   Additional building and generator types
-   Advanced electrical infrastructure
-   Community discovery features
-   Leaderboards and other social features

## 18. Explicit MVP Exclusions

The following are intentionally outside the MVP: - Player-created,
removed, or edited roads. - Road placement tools. - Electricity transfer
between disconnected road networks. - Diagonal connectivity. - Buildings
acting as electricity paths between roads. - Partial building power. -
Random activation behavior. - Mandatory building activation priority
when the player has a choice. - Level Creator. - Public community level
library. - Multiplayer. - Saving and resuming unfinished levels. -
Educational visualization of CSP internals.

## 19. Decisions That Must Remain Consistent

These are core rules and must not drift between UI, simulation, solver,
and tests:

1.  Roads are fixed and use orthogonal connectivity.
2.  Each connected road component is an independent electrical network.
3.  Generator placement validity is determined by the number of distinct
    **orthogonally adjacent** road components.
4.  Zero adjacent components means valid but disconnected.
5.  Exactly one adjacent component means valid and connected.
6.  Two or more adjacent components means invalid.
7.  Invalid generator placement is rejected; invalid generators never
    remain on the board.
8.  Valid but disconnected generators are allowed and do not produce an
    invalid-placement toast.
9.  Only connected generators contribute power.
10. Buildings require road connectivity and full demand to activate.
11. Power plants contribute output only after activation.
12. Network capacity and activation are independent for each road
    component.
13. If a generator change makes the current powered state unsustainable,
    all powered buildings in that affected network reset.
14. Mandatory objectives determine completion; score determines the
    additional star thresholds.
15. The CSP solver must obey exactly the same rules as gameplay.
16. All campaign levels are unlocked from the beginning.
17. Solver assistance has no score penalty.

------------------------------------------------------------------------

**End of specification.**

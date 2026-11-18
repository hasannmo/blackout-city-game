# System Architecture — Blackout City

## 1. Overview
**Blackout City** is a single-player, grid-based simulation puzzle game where players restore power to an urban grid under strict spatial and resource constraints. The architecture separates the interactive user interface, deterministic grid state management, simulation evaluation engine, and an automated Constraint Satisfaction Problem (CSP) hint solver.

---

## 2. High-Level Architecture

```text
+-----------------------------------------------------------------------+
|                        Presentation Layer (UI)                        |
|        React Components  |  Tailwind CSS  |  Grid Renderer            |
+-----------------------------------+-----------------------------------+
                                    | Dispatches Actions / Subscribes
                                    v
+-----------------------------------------------------------------------+
|                       State Management Layer                          |
|                    Zustand Store (Game & Grid State)                  |
+-----------------+-----------------------------------+-----------------+
                  | Evaluates                         | Queries Hint
                  v                                   v
+-----------------------------------+ +---------------------------------+
|      Simulation Engine            | |       CSP Solver Engine         |
|  - Adjacency & Road Validation    | |  - Plain Backtracking           |
|  - Power Load & Capacity Check    | |  - MRV (Minimum Remaining Val)  |
|  - Level Objective Verification   | |  - Forward Checking             |
+-----------------------------------+ +---------------------------------+

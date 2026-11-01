import { z } from 'zod'

export const CoordinateSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
})
export type Coordinate = z.infer<typeof CoordinateSchema>

export const GridDimensionsSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})
export type GridDimensions = z.infer<typeof GridDimensionsSchema>

export const BuildingCategorySchema = z.enum([
  'residential',
  'commercial',
  'industrial',
  'hospital',
  'generator',
  'special',
])
export type BuildingCategory = z.infer<typeof BuildingCategorySchema>

export const BuildingDefinitionSchema = z.object({
  name: z.string().min(1),
  category: BuildingCategorySchema,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  demand: z.number().int().min(0),
  output: z.number().int().min(0),
})
export type BuildingDefinition = z.infer<typeof BuildingDefinitionSchema>

export const BuildingDefinitionsMapSchema = z.record(z.string(), BuildingDefinitionSchema)
export type BuildingDefinitionsMap = z.infer<typeof BuildingDefinitionsMapSchema>

export const BuildingInstanceSchema = z.object({
  id: z.string().min(1),
  variant: z.string().min(1),
  origin: CoordinateSchema,
  score: z.number().int().min(0),
})
export type BuildingInstance = z.infer<typeof BuildingInstanceSchema>

export type ObjectiveCondition =
  | { type: 'categoryCount'; category: BuildingCategory; min: number }
  | { type: 'buildingPowered'; buildingId: string }
  | { type: 'allBuildingsPowered' }
  | { type: 'minTotalPowered'; min: number }
  | { type: 'and'; children: ObjectiveCondition[] }
  | { type: 'or'; children: ObjectiveCondition[] }

export const ObjectiveConditionSchema: z.ZodType<ObjectiveCondition> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('categoryCount'),
      category: BuildingCategorySchema,
      min: z.number().int().positive(),
    }),
    z.object({
      type: z.literal('buildingPowered'),
      buildingId: z.string().min(1),
    }),
    z.object({
      type: z.literal('allBuildingsPowered'),
    }),
    z.object({
      type: z.literal('minTotalPowered'),
      min: z.number().int().positive(),
    }),
    z.object({
      type: z.literal('and'),
      children: z.array(ObjectiveConditionSchema).min(1),
    }),
    z.object({
      type: z.literal('or'),
      children: z.array(ObjectiveConditionSchema).min(1),
    }),
  ])
)

export const StarThresholdsSchema = z
  .object({
    two: z.number().int().min(0),
    three: z.number().int().min(0),
  })
  .refine((val) => val.two <= val.three, {
    message: 'Two-star threshold must be less than or equal to three-star threshold',
  })
export type StarThresholds = z.infer<typeof StarThresholdsSchema>

export const LevelDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  grid: GridDimensionsSchema,
  roads: z.array(CoordinateSchema),
  terrain: z.array(CoordinateSchema).default([]),
  buildings: z.array(BuildingInstanceSchema),
  inventory: z.record(z.string(), z.number().int().min(0)),
  objective: ObjectiveConditionSchema,
  stars: StarThresholdsSchema,
})
export type LevelDefinition = z.infer<typeof LevelDefinitionSchema>

export type Phase = 'placement' | 'activation' | 'simulation' | 'result'

export interface PlacedGenerator {
  instanceId: string
  typeId: string
  origin: Coordinate
}

export interface NetworkCapacityReport {
  networkId: string
  generation: number
  demand: number
  surplus: number
  canPowerAll: boolean
}

export interface NetworkActivationReport {
  networkId: string
  generation: number
  consumed: number
  remaining: number
}

export interface SimulationResult {
  completed: boolean
  mandatoryMet: boolean
  score: number
  stars: number
  poweredBuildingIds: string[]
  unpoweredBuildingIds: string[]
}

export interface GameState {
  phase: Phase
  generators: PlacedGenerator[]
  activeBuildingIds: Set<string>
  result: SimulationResult | null
}


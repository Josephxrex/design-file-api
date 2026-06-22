import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const createProjectSchema = z.object({
  name: z.string().min(1),
});

const pageFormatSchema = z.union([
  z.enum(['A4', 'LETTER', 'LEGAL']),
  z.object({ width: z.number(), height: z.number() }),
]);

const placementRuleSchema = z.union([
  z.object({ type: z.enum(['all', 'first', 'last', 'odd', 'even']) }),
  z.object({ type: z.literal('range'), range: z.tuple([z.number(), z.number()]) }),
]);

const componentInstanceSchema = z.object({
  id: z.string(),
  componentDefinitionId: z.string(),
  mode: z.enum(['linked', 'detached']),
  placement: placementRuleSchema,
  zIndex: z.number().optional(),
  detachedElements: z.array(z.record(z.any())).optional(),
});

export const updateProjectSchema = z.object({
  canvasJSON: z.string().optional(),
  thumbnail: z.string().optional(),
  variables: z.array(z.object({
    key: z.string(),
    label: z.string().optional(),
    type: z.enum(['text', 'table']),
    required: z.boolean(),
    tableColumns: z.array(z.string()).optional(),
    tableHeaderColor: z.string().optional(),
    tableRowColor: z.string().optional(),
    tableFontSize: z.number().optional()
  })).optional(),
  pageFormat: pageFormatSchema.optional(),
  componentInstances: z.array(componentInstanceSchema).optional(),
});

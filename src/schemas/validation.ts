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
});

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
    value: z.string().optional()
  })).optional(),
});

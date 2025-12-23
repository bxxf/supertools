import { z } from "@supertools-ai/core";

// =============================================================================
// Define schemas - single source of truth for types AND runtime validation
// =============================================================================

export const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  role: z.enum(["admin", "user"]),
});

export const OrderSchema = z.object({
  id: z.number(),
  userId: z.number(),
  total: z.number(),
  status: z.enum(["pending", "completed", "shipped"]),
});

export const StatsSchema = z.object({
  mean: z.number(),
  median: z.number(),
  min: z.number(),
  max: z.number(),
  sum: z.number(),
  count: z.number(),
});

// Derive TypeScript types from schemas
export type User = z.infer<typeof UserSchema>;
export type Order = z.infer<typeof OrderSchema>;
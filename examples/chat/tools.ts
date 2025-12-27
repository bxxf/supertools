import { defineTool, z } from "@supertools-ai/core";
import { orders, users } from "./db";

// =============================================================================
// Simple tools for chat example
// =============================================================================

export const tools = [
  defineTool({
    name: "getUsers",
    description: "Get all users or filter by role",
    parameters: z.object({
      role: z.enum(["admin", "user"]).optional().describe("Filter by role"),
    }),
    execute: async ({ role }) => (role ? users.filter((u) => u.role === role) : users),
  }),

  defineTool({
    name: "getOrders",
    description: "Get orders, optionally filtered by user or status",
    parameters: z.object({
      userId: z.number().optional().describe("Filter by user ID"),
      status: z.enum(["pending", "completed", "shipped"]).optional(),
    }),
    execute: async ({ userId, status }) => {
      let result = orders;
      if (userId) result = result.filter((o) => o.userId === userId);
      if (status) result = result.filter((o) => o.status === status);
      return result;
    },
  }),
];

// =============================================================================
// Fake database data for chat example
// =============================================================================

export const users = [
  { id: 1, name: "Alice", email: "alice@example.com", role: "admin" },
  { id: 2, name: "Bob", email: "bob@example.com", role: "user" },
  { id: 3, name: "Charlie", email: "charlie@example.com", role: "user" },
];

export const orders = [
  { id: 101, userId: 1, total: 150.0, status: "completed" },
  { id: 102, userId: 2, total: 75.5, status: "pending" },
  { id: 103, userId: 1, total: 200.0, status: "completed" },
  { id: 104, userId: 3, total: 50.0, status: "shipped" },
];

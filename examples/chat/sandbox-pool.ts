// =============================================================================
// Simple sandbox pool - you'd use Redis or similar in production to manage sandboxes
// =============================================================================

import { Sandbox } from 'e2b';

export class SandboxPool {
  private available: Sandbox[] = [];
  private maxSize: number;

  constructor(maxSize = 3) {
    this.maxSize = maxSize;
  }

  async acquire(): Promise<Sandbox> {
    // Grab from pool or create new
    const sandbox = this.available.pop();
    if (sandbox) {
      console.log("  [pool] reusing sandbox from pool");
      return sandbox;
    }
    console.log("  [pool] creating new sandbox...");
    return Sandbox.create("supertools-bun", { timeoutMs: 5 * 60 * 1000 });
  }

  async release(sandbox: Sandbox): Promise<void> {
    if (this.available.length < this.maxSize) {
      this.available.push(sandbox);
      console.log(
        `  [pool] Returned to pool (${this.available.length}/${this.maxSize})`
      );
    } else {
      await sandbox.kill();
      console.log("  [pool] pool full, killed sandbox");
    }
  }

  async shutdown(): Promise<void> {
    console.log("\n  [pool] shutting down all sandboxes...");
    await Promise.all(this.available.map((sb) => sb.kill()));
    this.available = [];
  }
}

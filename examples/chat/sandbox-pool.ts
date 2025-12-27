import { SANDBOX_TEMPLATE } from "@supertools-ai/core";
import { Sandbox } from "e2b";

export class SandboxPool {
  private available: Sandbox[] = [];
  private inFlight = 0;
  private activeCount = 0;
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

    // Prevent unbounded creation from concurrent acquire() calls
    if (this.inFlight + this.activeCount >= this.maxSize) {
      throw new Error("Too many sandboxes in flight");
    }

    this.inFlight++;
    try {
      console.log("  [pool] creating new sandbox...");
      const newSandbox = await Sandbox.create(SANDBOX_TEMPLATE, { timeoutMs: 5 * 60 * 1000 });
      this.activeCount++;
      return newSandbox;
    } finally {
      this.inFlight--;
    }
  }

  async release(sandbox: Sandbox): Promise<void> {
    if (this.available.length < this.maxSize) {
      this.available.push(sandbox);
      console.log(`  [pool] Returned to pool (${this.available.length}/${this.maxSize})`);
    } else {
      try {
        await sandbox.kill();
      } catch (error) {
        console.error("  [pool] failed to kill sandbox:", error);
      } finally {
        this.activeCount--;
      }
      console.log("  [pool] pool full, killed sandbox");
    }
  }

  async shutdown(): Promise<void> {
    console.log("\n  [pool] shutting down all sandboxes...");
    await Promise.all(
      this.available.map(async (sb) => {
        try {
          await sb.kill();
        } catch (error) {
          console.error("  [pool] failed to kill sandbox during shutdown:", error);
        } finally {
          this.activeCount--;
        }
      })
    );
    this.available = [];
  }
}

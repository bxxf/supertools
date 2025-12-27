/**
 * E2B Custom Template with Bun Runtime and Pre-baked Relay Server
 *
 * The relay server starts automatically when sandbox boots,
 * eliminating ~1.7s of startup time per execution.
 *
 * Build with: bun run build-template
 */

import { Template } from "e2b";

export const template = Template()
  .fromBunImage("1.3")
  .setWorkdir("/home/user")
  .copy("files/relay.ts", "/home/user/relay.ts")
  .copy("files/mcp-router.ts", "/home/user/mcp-router.ts")
  .copy("files/proto/codec.ts", "/home/user/proto/codec.ts")
  .copy("files/proto/generated.js", "/home/user/proto/generated.js")
  .bunInstall(["protobufjs"])
  .setStartCmd("bun run /home/user/relay.ts", "sleep 0.5");

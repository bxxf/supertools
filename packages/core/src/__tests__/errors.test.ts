import { describe, expect, it } from "bun:test";
import {
  CodeGenerationError,
  ConfigurationError,
  ExecutionError,
  OPTError,
  RelayConnectionError,
  RelayTimeoutError,
  SandboxError,
  ToolError,
} from "../utils/errors";

describe("OPTError", () => {
  it("creates error with message and code", () => {
    const error = new OPTError("Something went wrong", "EXECUTION_ERROR");

    expect(error.message).toBe("Something went wrong");
    expect(error.code).toBe("EXECUTION_ERROR");
    expect(error.name).toBe("OPTError");
    expect(error.cause).toBeUndefined();
  });

  it("creates error with cause", () => {
    const cause = new Error("Root cause");
    const error = new OPTError("Wrapper error", "TOOL_ERROR", cause);

    expect(error.cause).toBe(cause);
    expect(error.cause?.message).toBe("Root cause");
  });

  it("serializes to JSON correctly", () => {
    const cause = new Error("Root cause");
    const error = new OPTError("Test error", "PROTOCOL_ERROR", cause);
    const json = error.toJSON();

    expect(json).toEqual({
      name: "OPTError",
      code: "PROTOCOL_ERROR",
      message: "Test error",
      cause: "Root cause",
    });
  });

  it("serializes without cause", () => {
    const error = new OPTError("No cause", "SANDBOX_ERROR");
    const json = error.toJSON();

    expect(json.cause).toBeUndefined();
  });

  it("is instanceof Error", () => {
    const error = new OPTError("Test", "EXECUTION_ERROR");
    expect(error instanceof Error).toBe(true);
    expect(error instanceof OPTError).toBe(true);
  });
});

describe("CodeGenerationError", () => {
  it("creates with correct code and name", () => {
    const error = new CodeGenerationError("Failed to generate");

    expect(error.code).toBe("CODE_GENERATION_ERROR");
    expect(error.name).toBe("CodeGenerationError");
    expect(error.message).toBe("Failed to generate");
  });

  it("inherits from OPTError", () => {
    const error = new CodeGenerationError("Test");
    expect(error instanceof OPTError).toBe(true);
  });
});

describe("ExecutionError", () => {
  it("creates with output", () => {
    const error = new ExecutionError("Execution failed", "console output here");

    expect(error.code).toBe("EXECUTION_ERROR");
    expect(error.name).toBe("ExecutionError");
    expect(error.output).toBe("console output here");
  });

  it("serializes output in JSON", () => {
    const error = new ExecutionError("Failed", "output log");
    const json = error.toJSON();

    expect(json.output).toBe("output log");
    expect(json.code).toBe("EXECUTION_ERROR");
  });

  it("handles undefined output", () => {
    const error = new ExecutionError("Failed");
    expect(error.output).toBeUndefined();
  });
});

describe("ToolError", () => {
  it("creates with tool name", () => {
    const error = new ToolError("Tool failed", "get_users");

    expect(error.code).toBe("TOOL_ERROR");
    expect(error.name).toBe("ToolError");
    expect(error.toolName).toBe("get_users");
  });

  it("serializes toolName in JSON", () => {
    const error = new ToolError("Failed", "search_items");
    const json = error.toJSON();

    expect(json.toolName).toBe("search_items");
  });
});

describe("RelayConnectionError", () => {
  it("creates with correct code", () => {
    const error = new RelayConnectionError("Connection refused");

    expect(error.code).toBe("RELAY_CONNECTION_ERROR");
    expect(error.name).toBe("RelayConnectionError");
  });
});

describe("RelayTimeoutError", () => {
  it("creates with correct code", () => {
    const error = new RelayTimeoutError("Timeout after 30s");

    expect(error.code).toBe("RELAY_TIMEOUT_ERROR");
    expect(error.name).toBe("RelayTimeoutError");
  });
});

describe("SandboxError", () => {
  it("creates with correct code", () => {
    const error = new SandboxError("Sandbox crashed");

    expect(error.code).toBe("SANDBOX_ERROR");
    expect(error.name).toBe("SandboxError");
  });
});

describe("ConfigurationError", () => {
  it("creates with correct code", () => {
    const error = new ConfigurationError("Missing API key");

    expect(error.code).toBe("CONFIGURATION_ERROR");
    expect(error.name).toBe("ConfigurationError");
  });
});

describe("Error inheritance chain", () => {
  it("all errors inherit from OPTError and Error", () => {
    const errors = [
      new CodeGenerationError("test"),
      new ExecutionError("test"),
      new ToolError("test", "tool"),
      new RelayConnectionError("test"),
      new RelayTimeoutError("test"),
      new SandboxError("test"),
      new ConfigurationError("test"),
    ];

    for (const error of errors) {
      expect(error instanceof Error).toBe(true);
      expect(error instanceof OPTError).toBe(true);
    }
  });
});

export type ErrorCode =
  | 'CODE_GENERATION_ERROR'
  | 'EXECUTION_ERROR'
  | 'TOOL_ERROR'
  | 'RELAY_CONNECTION_ERROR'
  | 'RELAY_TIMEOUT_ERROR'
  | 'PROTOCOL_ERROR'
  | 'SANDBOX_ERROR'
  | 'CONFIGURATION_ERROR';

export class OPTError extends Error {
  readonly code: ErrorCode;
  readonly cause?: Error;

  constructor(message: string, code: ErrorCode, cause?: Error) {
    super(message);
    this.name = 'OPTError';
    this.code = code;
    this.cause = cause;
    Error.captureStackTrace?.(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      cause: this.cause?.message,
    };
  }
}

export class CodeGenerationError extends OPTError {
  constructor(message: string, cause?: Error) {
    super(message, 'CODE_GENERATION_ERROR', cause);
    this.name = 'CodeGenerationError';
  }
}

export class ExecutionError extends OPTError {
  readonly output?: string;

  constructor(message: string, output?: string, cause?: Error) {
    super(message, 'EXECUTION_ERROR', cause);
    this.name = 'ExecutionError';
    this.output = output;
  }

  override toJSON() {
    return { ...super.toJSON(), output: this.output };
  }
}

export class ToolError extends OPTError {
  readonly toolName: string;

  constructor(message: string, toolName: string, cause?: Error) {
    super(message, 'TOOL_ERROR', cause);
    this.name = 'ToolError';
    this.toolName = toolName;
  }

  override toJSON() {
    return { ...super.toJSON(), toolName: this.toolName };
  }
}

export class RelayConnectionError extends OPTError {
  constructor(message: string, cause?: Error) {
    super(message, 'RELAY_CONNECTION_ERROR', cause);
    this.name = 'RelayConnectionError';
  }
}

export class RelayTimeoutError extends OPTError {
  constructor(message: string) {
    super(message, 'RELAY_TIMEOUT_ERROR');
    this.name = 'RelayTimeoutError';
  }
}

export class SandboxError extends OPTError {
  constructor(message: string, cause?: Error) {
    super(message, 'SANDBOX_ERROR', cause);
    this.name = 'SandboxError';
  }
}

export class ConfigurationError extends OPTError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}


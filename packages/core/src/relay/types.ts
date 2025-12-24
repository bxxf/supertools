/**
 * Relay configuration and constants
 */

export interface RelayConfig {
  readonly port: number;
  readonly token: string;
  readonly timeout: number;
  readonly debug: boolean;
}

/**
 * Default relay config.
 * Note: token is empty by default - callers should generate a secure random token
 * using crypto.randomUUID() or similar before connecting.
 */
export const DEFAULT_RELAY_CONFIG: RelayConfig = {
  port: 8080,
  token: '',
  timeout: 300,
  debug: false,
} as const;

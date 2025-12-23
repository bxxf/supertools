/**
 * Relay configuration and constants
 */

export interface RelayConfig {
  readonly port: number;
  readonly token: string;
  readonly timeout: number;
  readonly debug: boolean;
}

export const DEFAULT_RELAY_CONFIG: RelayConfig = {
  port: 8080,
  token: '',
  timeout: 300,
  debug: false,
} as const;

export const DEFAULT_BASE_URL = 'https://app.catalystmonitor.com:4173'

export const DEFAULT_HTTP_PROTO_TRACES_URL =
  'https://app.catalystmonitor.com/api/ingest/otlp/traces'

export const DEFAULT_HTTP_PROTO_LOGS_URL =
  'https://app.catalystmonitor.com/api/ingest/otlp/logs'

export const COOKIE_NAME = 'catalystmonitorsession'

export type Severity = 'info' | 'warn' | 'error'

export type HeadersType =
  | Headers
  | { [key: string]: undefined | string | string[] }

export interface CatalystServerConfig {
  version: string
  systemName: string
  privateKey: string
  disabled?: boolean
  ignoreOptionsMethod?: boolean
}

export interface CatalystInstallConfig {
  patchConsole?: boolean
  patchFetch?: boolean
  sendCookie?: boolean
}

export interface NodeOnlyConfig {
  baseUrl?: string
  fetchImpl?: typeof fetch
}

export interface VercelOnlyConfig {
  tracesUrl: string
  logsUrl: string
}

export interface PropagationOptions {
  propagateHosts?: string[]
  propagatePathOnly?: boolean
}

export interface QuirksConfig {
  __catalystGetPropagationHeaders?: () => {
    [key: string]: string
  }
}

export type CatalystConfig = CatalystServerConfig &
  CatalystInstallConfig &
  PropagationOptions &
  QuirksConfig

export interface SessionUserInfo {
  loggedInId?: string
  loggedInName?: string
}

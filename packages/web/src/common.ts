export const PUBLIC_KEY_HEADER = 'X-Catalyst-Public-Key'
export const PRIVATE_KEY_HEADER = 'X-Catalyst-Private-Key'

export const SESSION_ID_HEADER = 'X-Catalyst-SessionId'
export const PARENT_FETCH_ID_HEADER = 'X-Catalyst-ParentFetchId'
export const PAGE_VIEW_ID_HEADER = 'X-Catalyst-PageViewId'

export const COOKIE_NAME = 'catalystmonitorsession'

export const DEFAULT_BASE_URL = 'https://app.catalystmonitor.com'

export type Severity = 'info' | 'warn' | 'error'

export interface CatalystClientConfig {
  baseUrl?: string
  version: string
  systemName: string
  userAgent?: string
  publicKey?: string
  disabled?: boolean
  existingSessionId?: string
}

export interface ClientFetchHeaders {
  [SESSION_ID_HEADER]: string
  [PAGE_VIEW_ID_HEADER]?: string
}

export interface CatalystInstallConfig {
  patchConsole?: boolean
  patchFetch?: boolean
  listenUnhandledExceptions?: boolean
  listenClick?: boolean
}

export interface PropagationOptions {
  propagateHosts?: string[]
  propagatePathOnly?: boolean
}

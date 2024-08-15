import type {
  CatalystConfig,
  VercelOnlyConfig,
} from '@catalyst-monitor/server/vercel'

export type CatalystNextJSConfig = CatalystConfig &
  VercelOnlyConfig & {
    clientBaseUrl: string
    publicKey: string
  }

declare global {
  // eslint-disable-next-line no-var
  var __catalystSetConfig: CatalystNextJSConfig | null
}

export function getConfig(): CatalystNextJSConfig | null {
  return globalThis.__catalystSetConfig
}

export function setConfig(newConfig: CatalystNextJSConfig) {
  globalThis.__catalystSetConfig = newConfig
}

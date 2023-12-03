import { CatalystServer, CatalystServerConfig } from './server'
import { installConsoleWrappers } from './common'
import { getCatalystContext } from './async_hooks'
import crypto from 'crypto'

export function catalystNodeFetch(
  input: RequestInfo | URL,
  init?: RequestInit | undefined
): Promise<Response> {
  const context = getCatalystContext()
  if (context == null) {
    throw new Error('Tried to fetch without context!')
  }
  const newInit: RequestInit = {
    ...(init ?? {}),
    headers: {
      ...(init?.headers ?? {}),
      ...getCatalystNode().getFetchHeaders(context),
    },
  }
  return fetch(input, newInit)
}

declare global {
  // Must be var for global declaration.
  // eslint-disable-next-line no-var
  var __catalystNodeInstance: CatalystServer | undefined

  interface Console {
    __catalystOldLog: typeof window.console.log | undefined
    __catalystOldWarn: typeof window.console.warn | undefined
    __catalystOldError: typeof window.console.error | undefined
  }
}

export function getCatalystNode(): CatalystServer {
  if (globalThis.__catalystNodeInstance == null) {
    throw Error(
      'Catalyst has not been instantiated yet! Try running "installNodeBase" first!'
    )
  }
  return globalThis.__catalystNodeInstance
}

export function installNodeBase(config: CatalystServerConfig): CatalystServer {
  if (globalThis.__catalystNodeInstance != null) {
    if (globalThis.console.__catalystOldWarn != null) {
      globalThis.console.__catalystOldWarn(
        'Catalyst has already been instantiated!'
      )
    }
    return globalThis.__catalystNodeInstance
  }

  const server = new CatalystServer(config, () => crypto.randomUUID())

  installConsoleWrappers(globalThis, (severity, message, params) => {
    const context = getCatalystContext()
    if (context != null) {
      server.recordLog(severity, message, params, context)
    }
  })

  globalThis.__catalystNodeInstance = server
  return server
}

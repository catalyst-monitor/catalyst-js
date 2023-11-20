import type { AsyncLocalStorage } from 'async_hooks'
import {
  CatalystServer,
  CatalystServerConfig,
  ServerRequestContext,
} from './server'
import { Severity, parseConsoleArgs } from './common'

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

  const server = new CatalystServer(config)

  globalThis.console.__catalystOldLog = globalThis.console.log
  globalThis.console.__catalystOldWarn = globalThis.console.warn
  globalThis.console.__catalystOldError = globalThis.console.error

  globalThis.console.log = buildNewConsoleMethod(
    globalThis.console.__catalystOldLog,
    server,
    'info'
  )
  globalThis.console.warn = buildNewConsoleMethod(
    globalThis.console.__catalystOldWarn,
    server,
    'warn'
  )
  globalThis.console.error = buildNewConsoleMethod(
    globalThis.console.__catalystOldError,
    server,
    'error'
  )

  globalThis.__catalystNodeInstance = server

  return server
}

let doctorContextStorage: AsyncLocalStorage<CatalystContextType> | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const asyncHooks = require('async_hooks')
  doctorContextStorage =
    new asyncHooks.AsyncLocalStorage() as AsyncLocalStorage<CatalystContextType>
} catch (e) {
  // Do nothing. This will fail for clients.
}

export interface CatalystContextType {
  context: ServerRequestContext
}

export function createCatalystContext<T>(
  context: ServerRequestContext,
  callback: () => T
): T {
  if (doctorContextStorage == null) {
    return callback()
  }
  return doctorContextStorage.run(
    {
      context,
    },
    callback
  )
}

export function updateCatalystContext(context: ServerRequestContext) {
  if (doctorContextStorage == null) {
    return
  }
  const store = doctorContextStorage.getStore()
  if (store != null) {
    store.context = context
  }
}

export function getCatalystContext(): ServerRequestContext | undefined {
  if (doctorContextStorage == null) {
    return
  }
  return doctorContextStorage.getStore()?.context
}

function buildNewConsoleMethod(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  old: (...d: any[]) => void,
  server: CatalystServer,
  severity: Severity
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): (...d: any[]) => void {
  return (...data) => {
    old(...data)
    const context = getCatalystContext()
    if (context == null) {
      return
    }
    const parsed = parseConsoleArgs(data)
    if (parsed != null) {
      server.recordLog(severity, parsed[0], parsed[1], context)
    }
  }
}

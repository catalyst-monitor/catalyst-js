import type { AsyncLocalStorage } from 'async_hooks'
import { ServerRequestContext } from './server'

// Ideally, this should be tree shaken-out.
// Unfortunately, there doesn't seem to be a way to do so right now.
let doctorContextStorage: AsyncLocalStorage<CatalystContextType> | null = null
try {
  if (typeof window == 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const asyncHooks = require('async_hooks')
    doctorContextStorage =
      new asyncHooks.AsyncLocalStorage() as AsyncLocalStorage<CatalystContextType>
  }
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
  const store = doctorContextStorage?.getStore()
  if (store != null) {
    store.context = context
  }
}

export function getCatalystContext(): ServerRequestContext | undefined {
  return doctorContextStorage?.getStore()?.context
}

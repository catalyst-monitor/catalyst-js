import type { AsyncLocalStorage } from 'async_hooks'
import { ServerRequestContext } from './server.js'

let doctorContextStorage: AsyncLocalStorage<CatalystContextType> | null = null
if (typeof window == 'undefined') {
  import('async_hooks').then(
    ({ AsyncLocalStorage }) => {
      doctorContextStorage = new AsyncLocalStorage<CatalystContextType>()
    },
    () => {
      // Do Nothing
    }
  )
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

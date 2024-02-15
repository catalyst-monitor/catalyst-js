import async_hooks from 'async_hooks'
import { ServerRequestContext } from './server.js'

const doctorContextStorage =
  new async_hooks.AsyncLocalStorage<CatalystContextType>()

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

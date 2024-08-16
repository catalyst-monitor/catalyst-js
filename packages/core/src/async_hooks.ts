import type { AsyncLocalStorage } from 'async_hooks'
import type { ServerRequestContext } from './server.js'

let doctorContextStorage: AsyncLocalStorage<CatalystContextStoreType> | null =
  null
if (typeof window == 'undefined') {
  import('async_hooks').then(
    ({ AsyncLocalStorage }) => {
      doctorContextStorage = new AsyncLocalStorage<CatalystContextStoreType>()
    },
    () => {
      // Do Nothing
    }
  )
}

export interface CatalystContextStoreType {
  context: ServerRequestContext
}

export function createCatalystContext<T>(
  store: CatalystContextStoreType,
  callback: () => T
): T {
  if (doctorContextStorage == null) {
    return callback()
  }
  return doctorContextStorage.run(store, callback)
}

export function updateCatalystContext(context: ServerRequestContext) {
  const store = doctorContextStorage?.getStore()
  if (store != null) {
    store.context = context
  }
}

export function updateCatalystUserInfoContext(
  loginContext: { loggedInUserName: string; loggedInId: string } | null
) {
  const context = getCatalystContext()
  if (context == null) {
    console.warn(
      'Catalyst: tried to update login context without first setting a context!'
    )
    return
  }
  updateCatalystContext({
    ...context,
    loggedInUserName: loginContext?.loggedInUserName,
    loggedInId: loginContext?.loggedInId,
  })
}

export function getCatalystContext(): ServerRequestContext | undefined {
  return doctorContextStorage?.getStore()?.context
}

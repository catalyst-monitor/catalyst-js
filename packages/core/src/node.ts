import type { AsyncLocalStorage } from 'async_hooks'
import { ServerRequestContext } from './server'

let doctorContextStorage: AsyncLocalStorage<DoctorContextType> | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const asyncHooks = require('async_hooks')
  doctorContextStorage =
    new asyncHooks.AsyncLocalStorage() as AsyncLocalStorage<DoctorContextType>
} catch (e) {
  // Do nothing. This will fail for clients.
}

export interface DoctorContextType {
  context: ServerRequestContext
}

export function createDoctorContext<T>(
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

export function updateDoctorContext(context: ServerRequestContext) {
  if (doctorContextStorage == null) {
    return
  }
  const store = doctorContextStorage.getStore()
  if (store != null) {
    store.context = context
  }
}

export function getDoctorContext(): ServerRequestContext | undefined {
  if (doctorContextStorage == null) {
    return
  }
  return doctorContextStorage.getStore()?.context
}

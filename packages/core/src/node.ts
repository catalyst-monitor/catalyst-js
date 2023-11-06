import type { AsyncLocalStorage } from 'async_hooks'
import { DoctorServer, ServerRequestContext } from './server'

export function catalystNodeFetch(
  input: RequestInfo | URL,
  init?: RequestInit | undefined
): Promise<Response> {
  const context = getDoctorContext()
  if (context == null) {
    throw new Error('Tried to fetch without context!')
  }
  const newInit: RequestInit = {
    ...(init ?? {}),
    headers: {
      ...(init?.headers ?? {}),
      ...DoctorServer.get().getFetchHeaders(context),
    },
  }
  return fetch(input, newInit)
}

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

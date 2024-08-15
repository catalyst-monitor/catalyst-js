import { AsyncLocalStorage } from 'async_hooks'
import {
  requestAsyncStorage,
  type RequestStore,
} from 'next/dist/client/components/request-async-storage.external.js'
import { staticGenerationAsyncStorage } from 'next/dist/client/components/static-generation-async-storage.external.js'

export interface CatalystPropagationHeaders {
  [key: string]: string
}

type ExtendedRequestAsyncStorageType = RequestStore & {
  __catalystPropagationHeaders?: CatalystPropagationHeaders
  __catalystSessionId?: string
}

export function isStaticGeneration(): boolean {
  const staticStore =
    staticGenerationAsyncStorage.getStore()?.isStaticGeneration
  if (staticStore == null) {
    // Error here.
    return true
  }
  return staticStore
}

export function getHeaders() {
  return withRequestStore((store) => store.headers)
}

export function getCookies() {
  return withRequestStore((store) => store.cookies)
}

export function getPropagationHeaders(): CatalystPropagationHeaders | null {
  return withRequestStore((store) => store.__catalystPropagationHeaders ?? null)
}

export function setPropagationHeaders(newHeaders: CatalystPropagationHeaders) {
  withRequestStore((store) => {
    store.__catalystPropagationHeaders = newHeaders
  })
}

export function getSessionId(): string | null {
  return withRequestStore((store) => store.__catalystSessionId) ?? null
}

export function setSessionId(sessionId: string) {
  withRequestStore((store) => {
    store.__catalystSessionId = sessionId
  })
}

function withRequestStore<R>(
  withStoreCb: (store: ExtendedRequestAsyncStorageType) => R
): R | null {
  const store = (
    requestAsyncStorage as AsyncLocalStorage<ExtendedRequestAsyncStorageType>
  ).getStore()
  if (store == null) {
    return null
  }
  return withStoreCb(store)
}

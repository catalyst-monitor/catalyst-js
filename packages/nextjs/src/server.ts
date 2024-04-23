import { AsyncLocalStorage } from 'async_hooks'
import {
  createCatalystContext,
  COOKIE_NAME,
  ServerRequestContext,
  SESSION_ID_HEADER,
  PARENT_FETCH_ID_HEADER,
  PAGE_VIEW_ID_HEADER,
  CatalystServer,
  installConsoleWrappers,
  getCatalystContext,
} from '@catalyst-monitor/core/node'
import {
  requestAsyncStorage,
  RequestStore,
} from 'next/dist/client/components/request-async-storage.external'
import { staticGenerationAsyncStorage } from 'next/dist/client/components/static-generation-async-storage.external'
import { differenceInSeconds } from 'date-fns'
import { NextRequest } from 'next/dist/server/web/spec-extension/request'
import { NextResponse } from 'next/dist/server/web/spec-extension/response'
import { CatalystInitOptions } from './loader'

export function wrapServerPage<
  T extends { params?: { [key: string]: string } },
>(
  options: CatalystInitOptions,
  pageName: string,
  component: (props: T) => React.ReactNode | Promise<React.ReactNode>
): (props: T) => React.ReactNode | Promise<React.ReactNode> {
  globalCatalystOptions = options
  installNextJS()

  return (props) => {
    const store = getStore()
    if (store == null) {
      return component(props)
    }
    if (isStaticGeneration()) {
      return component(props)
    }

    const context = getOrInitContext(store)
    const startTime = new Date()
    return wrapResults(
      context,
      () => component(props),
      (v) => {
        if (!isFirstRecordFetch(store)) {
          return v
        }
        getCatalystNextJS().recordFetch(
          'get',
          pageName,
          props.params ?? {},
          200,
          {
            seconds: differenceInSeconds(new Date(), startTime),
            nanos: 0,
          },
          context
        )
        return getCatalystNextJS()
          .flushEvents()
          .then(() => v)
      },
      async (e) => {
        if (isFirstRecordFetch(store)) {
          getCatalystNextJS().recordFetch(
            'get',
            pageName,
            props.params ?? {},
            500,
            {
              seconds: differenceInSeconds(new Date(), startTime),
              nanos: 0,
            },
            context
          )
        }
        getCatalystNextJS().recordLog('error', e, {}, context)
        await getCatalystNextJS().flushEvents()
      }
    )
  }
}

export function wrapServerComponent<T>(
  options: CatalystInitOptions,
  component: (props: T) => React.ReactNode | Promise<React.ReactNode>
): (props: T) => React.ReactNode | Promise<React.ReactNode> {
  globalCatalystOptions = options
  installNextJS()

  return (props) => {
    if (isStaticGeneration()) {
      return component(props)
    }

    const store = getStore()
    if (store == null) {
      return component(props)
    }
    const context = getOrInitContext(store)
    return wrapResults(
      context,
      () => component(props),
      (v) => v,
      async (e) => {
        getCatalystNextJS().recordLog('error', e, {}, context)
        await getCatalystNextJS().flushEvents()
      }
    )
  }
}

export function wrapRouteHandler(
  options: CatalystInitOptions,
  method: string,
  path: string,
  original: (
    req: NextRequest,
    dynamicRouteOptions?: { params?: { [key: string]: string } }
  ) => NextResponse | Promise<NextResponse> | null
) {
  globalCatalystOptions = options
  installNextJS()

  return (
    req: NextRequest,
    dynamicRouteOptions?: { params?: { [key: string]: string } }
  ) => {
    const context = {
      sessionId:
        req.headers.get(SESSION_ID_HEADER) ??
        req.cookies.get(COOKIE_NAME)?.value ??
        crypto.randomUUID(),
      parentFetchId: req.headers.get(PARENT_FETCH_ID_HEADER) ?? undefined,
      fetchId: crypto.randomUUID(),
      pageViewId: req.headers.get(PAGE_VIEW_ID_HEADER) ?? undefined,
    }
    const startTime = new Date()
    return wrapResults(
      context,
      () => original(req, dynamicRouteOptions),
      async (val) => {
        let statusCode = 200
        if (val instanceof NextResponse) {
          statusCode = val.status
        }
        getCatalystNextJS().recordFetch(
          method,
          path,
          dynamicRouteOptions?.params ?? {},
          statusCode,
          {
            seconds: differenceInSeconds(new Date(), startTime),
            nanos: 0,
          },
          context
        )
        await getCatalystNextJS().flushEvents()
        return val
      },
      async (e) => {
        getCatalystNextJS().recordFetch(
          method,
          path,
          dynamicRouteOptions?.params ?? {},
          500,
          {
            seconds: differenceInSeconds(new Date(), startTime),
            nanos: 0,
          },
          context
        )
        getCatalystNextJS().recordLog('error', e, {}, context)
        await getCatalystNextJS().flushEvents()
      }
    )
  }
}

export function wrapMiddleware(
  options: CatalystInitOptions,
  mw: (
    request: NextRequest
  ) => NextResponse | Promise<NextResponse | undefined> | undefined
): (
  request: NextRequest
) => NextResponse | Promise<NextResponse | undefined> | undefined {
  globalCatalystOptions = options
  installNextJS()

  return (request: NextRequest) => {
    const store = getStore()
    if (store == null) {
      return mw(request)
    }
    const context = getOrInitContext(store)

    const startTime = new Date()
    return wrapResults(
      context,
      () => mw(request),
      async (r) => {
        getCatalystNextJS().recordFetch(
          'get',
          'Next.JS Middleware',
          {},
          200,
          {
            seconds: differenceInSeconds(new Date(), startTime),
            nanos: 0,
          },
          context
        )
        await getCatalystNextJS().flushEvents()

        if (r == null) {
          const newHeaders = new Headers(request.headers)
          newHeaders.set(SESSION_ID_HEADER, context.sessionId)
          newHeaders.set(PARENT_FETCH_ID_HEADER, context.fetchId)
          const newResp = NextResponse.next({
            request: {
              headers: newHeaders,
            },
          })
          if (request.cookies.get(COOKIE_NAME) != null) {
            newResp.cookies.set(COOKIE_NAME, context.sessionId)
          }
          return newResp
        } else if (r instanceof NextResponse) {
          if (r.headers.get('x-middleware-next') == null) {
            return r
          }
          const overrideHeader = r.headers.get('x-middleware-override-headers')
          r.headers.set(
            `x-middleware-request-${SESSION_ID_HEADER.toLowerCase()}`,
            context.sessionId
          )
          r.headers.set(
            `x-middleware-request-${PARENT_FETCH_ID_HEADER.toLowerCase()}`,
            context.fetchId
          )
          r.headers.set(
            'x-middleware-override-headers',
            [
              ...(overrideHeader != null && overrideHeader.length > 0
                ? [overrideHeader]
                : []),
              SESSION_ID_HEADER.toLowerCase(),
              PARENT_FETCH_ID_HEADER.toLowerCase(),
            ].join(',')
          )
          if (request.cookies.get(COOKIE_NAME) != null) {
            r.cookies.set(COOKIE_NAME, context.sessionId)
          }
          return r
        }
        return r
      },
      async () => {
        getCatalystNextJS().recordFetch(
          'get',
          'Next.JS Middleware',
          {},
          500,
          {
            seconds: differenceInSeconds(new Date(), startTime),
            nanos: 0,
          },
          context
        )
        await getCatalystNextJS().flushEvents()
      }
    )
  }
}

declare global {
  // Must be var for global declaration.
  // eslint-disable-next-line no-var
  var __catalystNextJSInstance: CatalystServer | undefined

  interface Console {
    __catalystOldLog: typeof window.console.log | undefined
    __catalystOldWarn: typeof window.console.warn | undefined
    __catalystOldError: typeof window.console.error | undefined
  }
}

function installNextJS() {
  if (globalThis.__catalystNextJSInstance != null) {
    return globalThis.__catalystNextJSInstance
  }
  if (globalCatalystOptions == null) {
    throw new Error(
      'We could not read your Catalyst settings! Please report this bug.'
    )
  }
  const server = new CatalystServer(globalCatalystOptions, () =>
    crypto.randomUUID()
  )

  installConsoleWrappers(globalThis, (severity, message, params) => {
    const context = getCatalystContext()
    if (context != null) {
      server.recordLog(severity, message, params, context)
    }
  })

  globalThis.__catalystNextJSInstance = server
  return server
}

export function getCatalystNextJS(): CatalystServer {
  if (globalThis.__catalystNextJSInstance == null) {
    throw new Error(
      'We could not get the Catalyst instance! Please report this bug.'
    )
  }
  return globalThis.__catalystNextJSInstance
}

async function wrapResults<R>(
  context: ServerRequestContext,
  toWrap: () => R | Promise<R>,
  onSuccess: (value: R) => R | Promise<R>,
  onError: (e: unknown) => void | Promise<void>
): Promise<R> {
  let value
  try {
    value = await promisify(createCatalystContext({ context }, () => toWrap()))
  } catch (e) {
    await promisify(onError(e))
    throw e
  }
  return onSuccess(value)
}

function promisify<R>(toPromisify: R | Promise<R>): Promise<R> {
  if (toPromisify instanceof Promise) {
    return toPromisify
  }
  return Promise.resolve(toPromisify)
}

interface NextJSCatalystContext {
  sessionId: string
  parentFetchId?: string
  fetchId: string
}

type ExtendedRequestAsyncStorageType = RequestStore & {
  __catalystContext?: NextJSCatalystContext
  __catalystFetchRecorded?: boolean
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

export function getStore() {
  return (
    requestAsyncStorage as
      | AsyncLocalStorage<ExtendedRequestAsyncStorageType>
      | undefined
  )?.getStore()
}

export function maybeGetContext(
  store: ExtendedRequestAsyncStorageType
): NextJSCatalystContext | undefined {
  return store.__catalystContext
}

export function getOrInitContext(
  store: ExtendedRequestAsyncStorageType
): NextJSCatalystContext {
  if (store.__catalystContext == null) {
    const sessionId =
      store.headers.get(SESSION_ID_HEADER) ??
      store.cookies.get(COOKIE_NAME)?.value ??
      crypto.randomUUID()
    const parentFetchId = store.headers.get(PARENT_FETCH_ID_HEADER) ?? undefined
    store.__catalystContext = {
      sessionId: sessionId,
      parentFetchId,
      fetchId: crypto.randomUUID(),
    }
  }

  return store.__catalystContext
}

function isFirstRecordFetch(store: ExtendedRequestAsyncStorageType): boolean {
  const isFirst = store.__catalystFetchRecorded != true
  store.__catalystFetchRecorded = true
  return isFirst
}

let globalCatalystOptions: CatalystInitOptions | null = null
export function getCatalystOptions(): CatalystInitOptions | null {
  return globalCatalystOptions
}

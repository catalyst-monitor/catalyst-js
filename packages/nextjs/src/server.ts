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
import { NextRequest } from 'next/dist/server/web/spec-extension/request'
import { NextResponse } from 'next/dist/server/web/spec-extension/response'
import { CatalystInitOptions } from './loader'

export function wrapServerPage<
  T extends { params?: { [key: string]: string | Array<string> } },
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

    const paramsAsStrings: { [key: string]: string } = {}
    let builtRawPath = pageName
    if (props.params != null) {
      for (const [key, value] of Object.entries(props.params)) {
        if (Array.isArray(value)) {
          const stringValue = value.join('/')
          builtRawPath = builtRawPath.replace(
            new RegExp(`/\\[\\[?...${key}\\]\\]?($|/)`),
            `/${stringValue}$1`
          )
          paramsAsStrings[key] = stringValue
        } else {
          builtRawPath = builtRawPath.replace(
            new RegExp(`/\\[${key}\\]($|/)`),
            `/${value}$1`
          )
          paramsAsStrings[key] = value
        }
      }
    }
    // Optional rest params are not in the params list if not populated
    // Replace it with an empty string.
    builtRawPath = builtRawPath.replace(/\/\[\[...[^\]]+?\]\]$/, '')

    const commonFetchParams = {
      method: 'get',
      rawPath: builtRawPath,
      pathPattern: pageName,
      args: paramsAsStrings ?? {},
    }
    return wrapResults(
      context,
      () => component(props),
      (v) => {
        if (!isFirstRecordFetch(store)) {
          return v
        }
        getCatalystNextJS().recordFetch(
          {
            ...commonFetchParams,
            statusCode: 200,
            duration: durationBetween(startTime, new Date()),
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
            {
              ...commonFetchParams,
              statusCode: 500,
              duration: durationBetween(startTime, new Date()),
            },
            context
          )
        }
        if (e instanceof Error) {
          getCatalystNextJS().recordError('error', e, context)
        } else {
          getCatalystNextJS().recordLog(
            {
              severity: 'error',
              message: '' + e,
              rawMessage: '' + e,
              args: {},
            },
            context
          )
        }
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
        if (e instanceof Error) {
          getCatalystNextJS().recordError('error', e, context)
        } else {
          getCatalystNextJS().recordLog(
            {
              severity: 'error',
              message: '' + e,
              rawMessage: '' + e,
              args: {},
            },
            context
          )
        }
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

    const commonFetchParams = {
      method,
      pathPattern: path,
      rawPath: req.nextUrl.pathname,
      args: dynamicRouteOptions?.params ?? {},
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
          {
            ...commonFetchParams,
            statusCode,
            duration: durationBetween(startTime, new Date()),
          },
          context
        )
        await getCatalystNextJS().flushEvents()
        return val
      },
      async (e) => {
        getCatalystNextJS().recordFetch(
          {
            ...commonFetchParams,
            statusCode: 500,
            duration: durationBetween(startTime, new Date()),
          },
          context
        )
        if (e instanceof Error) {
          getCatalystNextJS().recordError('error', e, context)
        } else {
          getCatalystNextJS().recordLog(
            {
              severity: 'error',
              message: '' + e,
              rawMessage: '' + e,
              args: {},
            },
            context
          )
        }
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

    const commonFetchParams = {
      // request.method may be undefined.
      // Also, while the incoming request may actually not be a get,
      // there is only one Middleware function, so grouping all
      // the results together may be better.
      method: 'get',
      rawPath: 'Next.JS Middleware',
      pathPattern: 'Next.JS Middleware',
      args: {},
    }

    const startTime = new Date()
    return wrapResults(
      context,
      () => mw(request),
      async (r) => {
        getCatalystNextJS().recordFetch(
          {
            ...commonFetchParams,
            statusCode: 200,
            duration: durationBetween(startTime, new Date()),
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
          {
            ...commonFetchParams,
            statusCode: 500,
            duration: durationBetween(startTime, new Date()),
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

  installConsoleWrappers(
    globalThis,
    (severity, message, params, rawMessage) => {
      server.recordLog(
        { severity, message, rawMessage, args: params },
        getCatalystContext()
      )
    },
    (severity, error) =>
      server.recordError(severity, error, getCatalystContext())
  )

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

function durationBetween(
  start: Date,
  end: Date
): { seconds: number; nanos: number } {
  const millisDiff = end.getTime() - start.getTime()
  return {
    seconds: Math.floor(millisDiff / 1000),
    nanos: (millisDiff % 1000) * 1000000,
  }
}

let globalCatalystOptions: CatalystInitOptions | null = null
export function getCatalystOptions(): CatalystInitOptions | null {
  return globalCatalystOptions
}

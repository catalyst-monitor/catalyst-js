import CatalystVercel, { COOKIE_NAME } from '@catalyst-monitor/server/vercel'
import { NextRequest } from 'next/dist/server/web/spec-extension/request.js'
import { NextResponse } from 'next/dist/server/web/spec-extension/response.js'
import {
  getCookies,
  getHeaders,
  getPropagationHeaders,
  isStaticGeneration,
  setPropagationHeaders,
  setSessionId,
} from './store.js'

export function wrapServerPage<
  T extends { params?: { [key: string]: string | Array<string> } },
>(
  pageName: string,
  component: (props: T) => React.ReactNode | Promise<React.ReactNode>
): (props: T) => React.ReactNode | Promise<React.ReactNode> {
  return (props) => {
    if (isStaticGeneration()) {
      return component(props)
    }

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

    // Handle parallel routes: the other page may have already
    // set the propagation headers, use those instead.
    const headers = getPropagationHeaders() ?? getHeaders()

    return CatalystVercel.getReporter().recordServerAction(
      {
        method: 'get',
        rawPath: builtRawPath,
        pathPattern: pageName,
        args: paramsAsStrings ?? {},
        headers: headers != null ? new Headers(headers) : {},
        sessionIdFromCookies: getCookies()?.get(COOKIE_NAME)?.value,
      },
      () => {
        if (getPropagationHeaders() == null) {
          setPropagationHeaders(
            CatalystVercel.getReporter().getPropagationHeaders()
          )
          const sessionId = CatalystVercel.getReporter().getSessionId()
          if (sessionId != null) {
            setSessionId(sessionId)
          }
        }
        return maybePromise(
          () => component(props),
          (v) => v,
          () => {}
        )
      }
    )
  }
}

export function wrapServerComponent<T>(
  component: (props: T) => React.ReactNode | Promise<React.ReactNode>
): (props: T) => React.ReactNode | Promise<React.ReactNode> {
  return (props) => {
    if (isStaticGeneration()) {
      return component(props)
    }

    const propagationHeaders = getPropagationHeaders() ?? {}
    return maybePromise(
      () => component(props),
      (v) => v,
      async (e) => {
        if (e instanceof Error) {
          CatalystVercel.getReporter().recordError(
            'error',
            e,
            propagationHeaders
          )
        } else {
          CatalystVercel.getReporter().recordLog({
            severity: 'error',
            message: '' + e,
            rawMessage: '' + e,
            args: {},
            headers: propagationHeaders,
          })
        }
      }
    )
  }
}

export function wrapRouteHandler(
  method: string,
  path: string,
  original: (
    req: NextRequest,
    dynamicRouteOptions?: { params?: { [key: string]: string } }
  ) => NextResponse | Promise<NextResponse> | null
) {
  return (
    req: NextRequest,
    dynamicRouteOptions?: { params?: { [key: string]: string } }
  ) => {
    return CatalystVercel.getReporter().recordServerAction(
      {
        method,
        pathPattern: path,
        rawPath: req.nextUrl.pathname,
        args: dynamicRouteOptions?.params ?? {},
        headers: Object.fromEntries(req.headers.entries()),
        sessionIdFromCookies: req.cookies.get(COOKIE_NAME)?.value,
      },
      (setStatusCode) =>
        maybePromise(
          () => original(req, dynamicRouteOptions),
          (resp) => {
            if (resp instanceof NextResponse) {
              setStatusCode(resp.status)
            }
            return resp
          },
          () => {}
        )
    )
  }
}

export function wrapMiddleware(
  mw: (
    request: NextRequest
  ) => NextResponse | Promise<NextResponse | undefined> | undefined
): (
  request: NextRequest
) => NextResponse | Promise<NextResponse | undefined> | undefined {
  return (request: NextRequest) => {
    return CatalystVercel.getReporter().recordServerAction(
      {
        // request.method may be undefined.
        // Also, while the incoming request may actually not be a get,
        // there is only one Middleware function, so grouping all
        // the results together may be better.
        method: 'get',
        rawPath: 'Next.JS Middleware',
        pathPattern: 'Next.JS Middleware',
        args: {},
        headers: Object.fromEntries(request.headers.entries()),
        sessionIdFromCookies: request.cookies.get(COOKIE_NAME)?.value,
      },
      (setStatus) => {
        return maybePromise(
          () => mw(request),
          (r) => {
            const propagationHeaders =
              CatalystVercel.getReporter().getPropagationHeaders()
            const sessionId = CatalystVercel.getReporter().getSessionId()
            if (r == null) {
              const newHeaders = new Headers(request.headers)
              for (const [k, v] of Object.entries(propagationHeaders)) {
                newHeaders.set(k, v)
              }
              const newResp = NextResponse.next({
                request: {
                  headers: newHeaders,
                },
              })
              if (
                request.cookies.get(COOKIE_NAME) == null &&
                sessionId != null
              ) {
                newResp.cookies.set(COOKIE_NAME, sessionId)
              }
              return newResp
            } else if (r instanceof NextResponse) {
              if (r.headers.get('x-middleware-next') == null) {
                return r
              }

              for (const [k, v] of Object.entries(propagationHeaders)) {
                r.headers.set(`x-middleware-request-${k.toLowerCase()}`, v)
              }

              const overriddenHeaders = []
              const overrideHeader = r.headers.get(
                'x-middleware-override-headers'
              )
              if (overrideHeader != null && overrideHeader.length > 0) {
                overriddenHeaders.push(overrideHeader)
              }
              for (const key of Object.keys(propagationHeaders)) {
                overriddenHeaders.push(key)
              }
              r.headers.set(
                'x-middleware-override-headers',
                overriddenHeaders.join(',')
              )
              if (
                request.cookies.get(COOKIE_NAME) == null &&
                sessionId != null
              ) {
                r.cookies.set(COOKIE_NAME, sessionId)
              }
              setStatus(r.status)
              return r
            }
            return r
          },
          () => {}
        )
      }
    )
  }
}

function maybePromise<R, T>(
  getValue: () => R | Promise<R>,
  onSuccess: (value: R) => T,
  onError: (e: unknown) => void
): T | Promise<T> {
  try {
    const value = getValue()
    if (value instanceof Promise) {
      return value.then(
        (promiseResult) => onSuccess(promiseResult),
        (e) => {
          onError(e)
          throw e
        }
      )
    } else {
      return onSuccess(value)
    }
  } catch (e) {
    onError(e)
    throw e
  }
}

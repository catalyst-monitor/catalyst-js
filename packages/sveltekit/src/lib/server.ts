export { default as Catalyst } from '@catalyst-monitor/server'
export * from '@catalyst-monitor/server'
import type { Handle, HandleFetch, HandleServerError } from '@sveltejs/kit'
import Catalyst, { COOKIE_NAME } from '@catalyst-monitor/server'
import { getRouteParams } from './util.js'

export const catalystHandler: Handle = async ({ event, resolve }) => {
  const {
    cookies,
    url,
    route,
    params,
    request: { method, headers },
  } = event

  let pattern = route.id
  if (pattern != null && method == 'POST') {
    for (const key of url.searchParams.keys()) {
      if (key.startsWith('/')) {
        pattern += `?${key}`
        break
      }
    }
  } else if (pattern == null) {
    pattern = 'Unknown'
  }
  const populatedParams = getRouteParams(params)

  const builtHeaders: { [key: string]: string } = {}
  headers.forEach((v, k) => {
    builtHeaders[v] = k
  })

  return Catalyst.getReporter().recordServerAction(
    {
      method,
      pathPattern: pattern,
      args: populatedParams,
      rawPath: url.pathname,
      headers: builtHeaders,
      sessionIdFromCookies: cookies.get(COOKIE_NAME),
    },
    async (finish) => {
      const sessionIdFromContext = Catalyst.getReporter().getSessionId()
      if (cookies.get(COOKIE_NAME) == null && sessionIdFromContext != null) {
        cookies.set(COOKIE_NAME, sessionIdFromContext, {
          path: '/',
          sameSite: 'strict',
          httpOnly: false,
        })
      }

      const resp = await resolve(event)
      finish(resp.status)
      return resp
    }
  )
}

export function wrapCatalystServerErrorHandler(
  errorHandler?: HandleServerError
): HandleServerError {
  return (input) => {
    const { error } = input
    if (error instanceof Error) {
      Catalyst.getReporter().recordError(
        'error',
        error,
        Catalyst.getReporter().getPropagationHeaders()
      )
    } else {
      Catalyst.getReporter().recordLog({
        severity: 'error',
        message: '' + error,
        rawMessage: '' + error,
        args: {},
        headers: Catalyst.getReporter().getPropagationHeaders(),
      })
    }
    if (errorHandler != null) {
      errorHandler(input)
    }
  }
}

export function wrapCatalystFetchHandler(
  fetchHandler?: HandleFetch
): HandleFetch {
  return (input) => {
    const { request, fetch } = input

    if (fetchHandler != null) {
      return fetchHandler({
        ...input,
        fetch: Catalyst.buildFetch(fetch),
      })
    } else {
      return Catalyst.buildFetch(fetch)(request)
    }
  }
}

export * from '@catalyst-monitor/core/node'
import type { Handle, HandleFetch, HandleServerError } from '@sveltejs/kit'
import {
  createCatalystContext,
  getCatalystContext,
  getCatalystNode,
  COOKIE_NAME,
  PAGE_VIEW_ID_HEADER,
  PARENT_FETCH_ID_HEADER,
  SESSION_ID_HEADER,
} from '@catalyst-monitor/core/node'
import { getRouteParams } from './util.js'

export const catalystHandler: Handle = async ({ event, resolve }) => {
  const {
    cookies,
    url,
    route,
    params,
    request: { method, headers },
  } = event

  const store = {
    context: {
      sessionId:
        headers.get(SESSION_ID_HEADER) ??
        cookies.get(COOKIE_NAME) ??
        crypto.randomUUID(),
      parentFetchId: headers.get(PARENT_FETCH_ID_HEADER) ?? undefined,
      fetchId: crypto.randomUUID(),
      pageViewId: headers.get(PAGE_VIEW_ID_HEADER) ?? undefined,
    },
  }

  if (cookies.get(COOKIE_NAME) == null) {
    cookies.set(COOKIE_NAME, store.context.sessionId, {
      path: '/',
      sameSite: 'strict',
      httpOnly: false,
    })
  }

  const startTime = new Date()
  const resp = await createCatalystContext(store, () => resolve(event))
  const endTime = new Date()

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
  const millisDiff = endTime.getTime() - startTime.getTime()
  getCatalystNode().recordFetch(
    {
      method,
      pathPattern: pattern,
      args: populatedParams,
      rawPath: url.pathname,
      statusCode: resp.status,
      duration: {
        seconds: Math.floor(millisDiff / 1000),
        nanos: (millisDiff % 1000) * 1000000,
      },
    },
    store.context
  )

  return resp
}

export function wrapCatalystServerErrorHandler(
  errorHandler?: HandleServerError
): HandleServerError {
  return (input) => {
    const { error } = input
    if (error instanceof Error) {
      getCatalystNode().recordError('error', error, getCatalystContext())
    } else {
      getCatalystNode().recordLog(
        {
          severity: 'error',
          message: '' + error,
          rawMessage: '' + error,
          args: {},
        },
        getCatalystContext()
      )
    }
    if (errorHandler != null) {
      errorHandler(input)
    }
  }
}

export function wrapCatalystFetchHandler(
  baseUrlsToPropagate: string[],
  fetchHandler?: HandleFetch
): HandleFetch {
  return (input) => {
    const { request, fetch } = input
    const context = getCatalystContext()
    if (
      context != null &&
      (input.event.isSubRequest ||
        request.url.startsWith('/') ||
        baseUrlsToPropagate.find((u) => request.url.startsWith(u)))
    ) {
      request.headers.set(SESSION_ID_HEADER, context.sessionId)
      request.headers.set(PARENT_FETCH_ID_HEADER, context.fetchId)
    }
    if (fetchHandler != null) {
      return fetchHandler(input)
    } else {
      return fetch(request)
    }
  }
}

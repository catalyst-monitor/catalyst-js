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
    route,
    params,
    request: { method, headers },
  } = event

  const context = {
    sessionId:
      headers.get(SESSION_ID_HEADER) ??
      cookies.get(COOKIE_NAME) ??
      crypto.randomUUID(),
    parentFetchId: headers.get(PARENT_FETCH_ID_HEADER) ?? undefined,
    fetchId: crypto.randomUUID(),
    pageViewId: headers.get(PAGE_VIEW_ID_HEADER) ?? undefined,
  }
  const startTime = new Date()
  return createCatalystContext(context, async () => {
    const resp = await resolve(event)
    const endTime = new Date()
    const populatedParams = getRouteParams(params)
    const millisDiff = endTime.getTime() - startTime.getTime()
    getCatalystNode().recordFetch(
      method,
      route.id ?? 'Unknown',
      populatedParams,
      resp.status,
      {
        seconds: Math.floor(millisDiff / 1000),
        nanos: (millisDiff % 1000) * 1000000,
      },
      context
    )

    return resp
  })
}

export function wrapCatalystServerErrorHandler(
  errorHandler?: HandleServerError
): HandleServerError {
  return (input) => {
    const { error, status } = input
    const context = getCatalystContext()
    if (context != null) {
      getCatalystNode().recordLog('error', error, { status }, context)
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

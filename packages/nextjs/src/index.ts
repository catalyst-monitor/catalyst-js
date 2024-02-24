import { catalystWebFetch } from './index.client'
import { getCatalystNextJS, getStore, maybeGetContext } from './server'

export function catalystNextJSFetch(
  input: RequestInfo | URL,
  init?: RequestInit | undefined
): Promise<Response> {
  if (typeof window == 'undefined') {
    const store = getStore()
    if (store == null) {
      return fetch(input, init)
    }
    const context = maybeGetContext(store)
    if (context == null) {
      return fetch(input, init)
    }

    const newInit: RequestInit = {
      ...(init ?? {}),
      headers: {
        ...(init?.headers ?? {}),
        ...getCatalystNextJS().getFetchHeaders(context),
      },
    }
    return fetch(input, newInit)
  } else {
    return catalystWebFetch(input, init)
  }
}

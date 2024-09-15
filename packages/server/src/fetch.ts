import type { PropagationOptions, QuirksConfig } from './common.js'
import Reporter from './reporter.js'

declare global {
  // eslint-disable-next-line no-var
  var __catalystOldFetch: typeof fetch | undefined
}

export function installGlobalFetch(
  reporter: Reporter,
  options: PropagationOptions
) {
  if (globalThis.__catalystOldFetch != null) {
    return
  }
  globalThis.__catalystOldFetch = globalThis.fetch
  globalThis.fetch = wrapFetch(reporter, globalThis.fetch, options)
}

export function wrapFetch(
  reporter: Reporter,
  fetchImpl: typeof fetch,
  options: PropagationOptions & QuirksConfig
): typeof fetch {
  return (input: RequestInfo | URL, init?: RequestInit | undefined) => {
    if (!shouldPropagate(input, options)) {
      return fetchImpl(input, init)
    }

    const propagationHeaders =
      options.__catalystGetPropagationHeaders != null
        ? options.__catalystGetPropagationHeaders()
        : reporter.getPropagationHeaders()

    const newInit: RequestInit = {
      ...(init ?? {}),
      headers: {
        ...(init?.headers ?? {}),
        ...propagationHeaders,
      },
    }
    return fetchImpl(input, newInit)
  }
}

function shouldPropagate(
  input: RequestInfo | URL,
  options: PropagationOptions
): boolean {
  if (options.propagateHosts == null) {
    return true
  }
  let host
  if (typeof input == 'string') {
    if (!URL.canParse(input)) {
      return options.propagatePathOnly == true
    }
    host = new URL(input).host
  } else if (input instanceof URL) {
    host = input.host
  } else {
    if (!URL.canParse(input.url)) {
      return options.propagatePathOnly == true
    }
    host = new URL(input.url).host
  }

  return options.propagateHosts.includes(host)
}

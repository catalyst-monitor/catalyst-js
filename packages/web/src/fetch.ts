import type { PropagationOptions } from './common.js'
import { CatalystWebReporter } from './web_reporter.js'

declare global {
  // eslint-disable-next-line no-var
  var __catalystOldFetch: typeof fetch | undefined
}

export function installGlobalFetch(
  instance: CatalystWebReporter,
  options: PropagationOptions
) {
  const fetchImpl = window.fetch
  window.__catalystOldFetch = fetchImpl
  window.fetch = (input: RequestInfo | URL, init?: RequestInit | undefined) => {
    if (!shouldPropagate(input, options)) {
      return fetchImpl(input, init)
    }

    const newInit: RequestInit = {
      ...(init ?? {}),
      headers: {
        ...(init?.headers ?? {}),
        ...instance.getFetchHeaders(),
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

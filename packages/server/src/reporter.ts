import {
  SpanKind,
  context,
  propagation,
  trace,
  type Context,
} from '@opentelemetry/api'
import {
  type Severity,
  type SessionUserInfo,
  type HeadersType,
} from './common.js'
import {
  SEMATTRS_HTTP_METHOD,
  SEMATTRS_HTTP_ROUTE,
  SEMATTRS_HTTP_STATUS_CODE,
} from '@opentelemetry/semantic-conventions'
import { SeverityNumber, logs } from '@opentelemetry/api-logs'

export const SESSION_ID_HEADER = 'x-catalyst-sessionid'
export const PAGE_VIEW_ID_HEADER = 'x-catalyst-pageviewid'

class Reporter {
  constructor(private getRandomValues: (arr: Uint8Array) => Uint8Array) {}

  setLoggedInUserInfo(info: SessionUserInfo | null) {
    const activeSpan = trace.getActiveSpan()
    if (activeSpan == null) {
      return
    }
    activeSpan.setAttribute('catalyst.loggedInId', info?.loggedInId ?? '')
    activeSpan.setAttribute('catalyst.loggedInName', info?.loggedInName ?? '')
  }

  getSessionId(): string | null {
    return trace.getSpanContext(context.active())?.traceId ?? null
  }

  getPropagationHeaders(): { [key: string]: string } {
    const carrier = {}
    propagation.inject(context.active(), carrier)
    return carrier
  }

  recordServerAction<T>(
    {
      method,
      rawPath,
      pathPattern,
      args,
      headers,
      sessionIdFromCookies,
    }: {
      method: string
      rawPath: string
      pathPattern: string
      args: { [key: string]: string }
      headers: HeadersType
      sessionIdFromCookies?: string
    },
    handler: (setStatusCode: (statusCode: number) => void) => T
  ): T {
    const paramAttrs: { [key: string]: string } = {}
    for (const [key, val] of Object.entries(args)) {
      paramAttrs[`catalyst.route.params.${key}`] = val
    }

    const { context: activeContext, attributes: propagatedAttributes } =
      this.getPropagatedContext(context.active(), headers, sessionIdFromCookies)
    return trace.getTracer('catalyst-javascript', '0.0.1').startActiveSpan(
      `${method} ${pathPattern}`,
      {
        kind: SpanKind.SERVER,
        attributes: {
          [SEMATTRS_HTTP_METHOD]: method,
          [SEMATTRS_HTTP_ROUTE]: pathPattern,
          'catalyst.route.rawPath': rawPath,
          ...paramAttrs,
          ...propagatedAttributes,
        },
      },
      activeContext,
      (span) => {
        let result
        let statusCode: number = 200

        const successFn = () => {
          span.setAttribute(SEMATTRS_HTTP_STATUS_CODE, statusCode)
          span.end()
        }

        const errorFn = (e: unknown) => {
          if (e instanceof Error || typeof e == 'string') {
            span.recordException(e)
          } else {
            span.recordException('' + e)
          }
          span.setAttribute(SEMATTRS_HTTP_STATUS_CODE, 500)
          span.end()
          throw e
        }

        try {
          result = handler((sc) => {
            statusCode = sc
          })
          if (result instanceof Promise) {
            result.then((promiseResult) => {
              successFn()
              return promiseResult
            }, errorFn)
          } else {
            successFn()
          }
        } catch (e) {
          errorFn(e)
          throw e
        }
        return result
      }
    )
  }

  recordError(severity: Severity, error: Error, headers: HeadersType) {
    this.recordLog({
      severity,
      message: error.message,
      rawMessage: error.message,
      stackTrace: error.stack,
      args: {},
      headers,
    })
  }

  recordLog({
    severity,
    message,
    rawMessage,
    stackTrace,
    args,
    headers,
  }: {
    severity: Severity
    message: string
    rawMessage: string
    stackTrace?: string
    args: { [key: string | number]: string | number }
    headers: HeadersType
  }) {
    const propagated = this.getPropagatedContext(context.active(), headers)
    const activeContext = propagated.context

    const paramAttrs: { [key: string]: string | number } = {}
    for (const [key, val] of Object.entries(args)) {
      paramAttrs[`catalyst.log.params.${key}`] = val
    }
    const logBody: { [key: string]: string } = {
      'catalyst.log.rawMessage': rawMessage,
      'catalyst.log.messagePattern': message,
    }
    if (stackTrace != null) {
      logBody['catalyst.log.stackTrace'] = stackTrace
    }
    const now = Date.now()

    const [severityNumber, severityText] = severityToProto(severity)

    logs.getLogger('catalyst-javascript', '0.0.1').emit({
      attributes: paramAttrs,
      body: logBody,
      observedTimestamp: now,
      timestamp: now,
      context: activeContext,
      severityNumber,
      severityText,
    })
  }

  private newId(bytes: number) {
    const array = new Uint8Array(bytes)
    this.getRandomValues(array)
    let id = ''
    for (const byte of array) {
      id += byte.toString(16).padStart(2, '0')
    }
    return id
  }

  private getPropagatedContext(
    oldContext: Context,
    headers: HeadersType,
    sessionIdFromCookies?: string | undefined
  ): {
    context: Context
    attributes: { [key: string]: string }
  } {
    let newContext = oldContext
    const newAttrs: { [key: string]: string } = {}

    let headersAsObjects = headers
    if ('entries' in headers && typeof headers.entries == 'function') {
      headersAsObjects = Object.fromEntries(headers.entries())
    }

    const sessionId = getFirstHeaderValue(headersAsObjects, SESSION_ID_HEADER)
    if (sessionId != null) {
      newContext = trace.setSpanContext(newContext, {
        traceFlags: 1,
        traceId: sessionId,
        spanId: this.newId(8),
        isRemote: true,
      })
      const pageViewId = getFirstHeaderValue(
        headersAsObjects,
        PAGE_VIEW_ID_HEADER
      )
      if (pageViewId != null) {
        newAttrs[`catalyst.pageViewId`] = pageViewId
      }
    } else {
      newContext = propagation.extract(newContext, headersAsObjects)
    }
    if (
      trace.getSpanContext(newContext)?.isRemote != true &&
      sessionIdFromCookies != null
    ) {
      newContext = trace.setSpanContext(oldContext, {
        traceFlags: 1,
        traceId: sessionIdFromCookies,
        spanId: this.newId(8),
        isRemote: true,
      })
    }

    return {
      context: newContext,
      attributes: newAttrs,
    }
  }
}
export default Reporter

function getFirstHeaderValue(
  headers: HeadersType,
  headerKey: string
): string | null {
  const headerLowered = headerKey.toLowerCase()

  const foundEntry = Object.entries(headers).find(
    ([k]) => k.toLowerCase() == headerLowered
  )
  if (foundEntry == null) {
    return null
  }
  const [, headerVal] = foundEntry
  if (Array.isArray(headerVal) && headerVal.length > 0) {
    return headerVal[0]
  } else if (typeof headerVal == 'string') {
    return headerVal
  }
  return null
}

function severityToProto(severity: Severity): [SeverityNumber, string] {
  switch (severity) {
    case 'info':
      return [SeverityNumber.INFO, 'info']
    case 'warn':
      return [SeverityNumber.WARN, 'warn']
    case 'error':
      return [SeverityNumber.ERROR, 'error']
  }
}

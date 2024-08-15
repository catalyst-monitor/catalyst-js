export * from './common.js'
export * from './reporter.js'
import {
  DEFAULT_HTTP_PROTO_LOGS_URL,
  DEFAULT_HTTP_PROTO_TRACES_URL,
  type CatalystConfig,
  type VercelOnlyConfig,
} from './common.js'
import Reporter from './reporter.js'
import { installConsoleWrappers } from './console_logs.js'
import { installGlobalFetch, wrapFetch } from './fetch.js'
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from '@opentelemetry/sdk-logs'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { OTLPHttpJsonTraceExporter, registerOTel } from '@vercel/otel'
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions'
import { logs } from '@opentelemetry/api-logs'
import { Resource } from '@opentelemetry/resources'
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'

const reporterInstance = new Reporter((v) => crypto.getRandomValues(v))

export let fetch = globalThis.fetch

let started = false
const CatalystVercel = {
  start(config: CatalystConfig & VercelOnlyConfig) {
    if (started) {
      return
    }
    started = true
    const headers = {
      'X-Catalyst-Private-Key': config.privateKey,
    }

    registerOTel({
      serviceName: config.systemName,
      attributes: {
        [SEMRESATTRS_SERVICE_VERSION]: config.version,
        'catalyst.systemName': config.systemName,
        'catalyst.systemVersion': config.version,
      },
      autoDetectResources: false,
      instrumentations: [],
      propagators: ['auto'],
      spanProcessors: [
        new SimpleSpanProcessor(
          // Note that using the OTEL provided "@opentelemetry/exporter-trace-otlp-http" causes issues.
          // The barrel file eventually calls XMLHttpRequest causes Next.JS middleware traces
          // to error out and not send.
          new OTLPHttpJsonTraceExporter({
            url: config.tracesUrl ?? DEFAULT_HTTP_PROTO_TRACES_URL,
            headers,
          })
        ),
      ],
    })

    // Cannot use Vercel OTEL to set logging provider: https://github.com/vercel/otel/issues/104
    const loggingProvider = new LoggerProvider({
      resource: new Resource({
        [SEMRESATTRS_SERVICE_NAME]: config.systemName,
        [SEMRESATTRS_SERVICE_VERSION]: config.version,
        'catalyst.systemName': config.systemName,
        'catalyst.systemVersion': config.version,
      }),
      logRecordLimits: {
        attributeValueLengthLimit: undefined,
        attributeCountLimit: undefined,
      },
    })
    loggingProvider.addLogRecordProcessor(
      new BatchLogRecordProcessor(
        new OTLPLogExporter({
          url: config.logsUrl ?? DEFAULT_HTTP_PROTO_LOGS_URL,
          headers,
        })
      )
    )
    logs.setGlobalLoggerProvider(loggingProvider)

    if (config.patchConsole != false) {
      installConsoleWrappers(
        (severity, message, params, rawMessage) => {
          const headers = config.__catalystGetPropagationHeaders
            ? config.__catalystGetPropagationHeaders()
            : reporterInstance.getPropagationHeaders()
          reporterInstance.recordLog({
            severity,
            message,
            rawMessage,
            args: params,
            headers,
          })
        },
        (severity, error) => {
          const headers = config.__catalystGetPropagationHeaders
            ? config.__catalystGetPropagationHeaders()
            : reporterInstance.getPropagationHeaders()
          reporterInstance.recordError(severity, error, headers)
        }
      )
    }
    if (config.patchFetch != false) {
      installGlobalFetch(reporterInstance, config)
    }
    fetch = wrapFetch(reporterInstance, globalThis.fetch, config)
  },
  getReporter() {
    return reporterInstance
  },
}

export default CatalystVercel

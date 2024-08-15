import { NodeSDK } from '@opentelemetry/sdk-node'
import Reporter from './reporter.js'
import {
  DEFAULT_BASE_URL,
  type CatalystConfig,
  type NodeOnlyConfig,
} from './common.js'
import { installConsoleWrappers } from './console_logs.js'
import { installGlobalFetch, wrapFetch } from './fetch.js'
import { Metadata } from '@grpc/grpc-js'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc'
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs'
import { Resource } from '@opentelemetry/resources'
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions'
import crypto from 'crypto'

export * from './common.js'

const reporterInstance = new Reporter(crypto.getRandomValues)
let otelInstance: NodeSDK | null = null
export let fetch = globalThis.fetch

const Catalyst = {
  config: null as (CatalystConfig & NodeOnlyConfig) | null,
  start(config: CatalystConfig & NodeOnlyConfig) {
    Catalyst.config = config

    const metadata = new Metadata()
    metadata.add('X-Catalyst-Private-Key', config.privateKey)
    const collectorOptions = {
      metadata,
      url: config.baseUrl ?? DEFAULT_BASE_URL,
    }
    otelInstance = new NodeSDK({
      autoDetectResources: false,
      resource: new Resource({
        [SEMRESATTRS_SERVICE_NAME]: config.systemName,
        [SEMRESATTRS_SERVICE_VERSION]: config.version,
        'catalyst.systemName': config.systemName,
        'catalyst.systemVersion': config.version,
      }),
      traceExporter: new OTLPTraceExporter(collectorOptions),
      logRecordProcessor: new BatchLogRecordProcessor(
        new OTLPLogExporter(collectorOptions)
      ),
    })
    otelInstance.start()

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
    if (config.fetchImpl != null) {
      fetch = wrapFetch(reporterInstance, config.fetchImpl, config)
    } else {
      fetch = wrapFetch(reporterInstance, globalThis.fetch, config)
    }
  },

  stop() {
    otelInstance?.shutdown()
  },

  getReporter(): Reporter {
    return reporterInstance
  },

  buildFetch(oldFetch: typeof fetch): typeof fetch {
    if (Catalyst.config == null) {
      return fetch
    }
    return wrapFetch(reporterInstance, oldFetch, Catalyst.config)
  },
}
export default Catalyst

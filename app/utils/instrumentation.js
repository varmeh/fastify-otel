import { NodeSDK } from '@opentelemetry/sdk-node'
import { trace } from '@opentelemetry/api'
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'

import logger from './logger.js'
import env from './env.js'

// Check environment variables
const traceDebug = process.env.TRACE_TYPE.toLowerCase() === 'console'
const exportTraces = process.env.TRACE_TYPE.toLowerCase() === 'otlp'

let traceExporter

if (traceDebug && env.isDevelopment()) {
    traceExporter = new ConsoleSpanExporter()
    logger.info('Console Trace Exporter Loaded')
} else if (exportTraces) {
    const otlpExporterConfig = {
        url: process.env.OTLP_ENDPOINT,
        headers: {
            'api-key': process.env.OTLP_API_KEY
        },
        concurrencyLimit: 10,
        timeoutMillis: 2000
    }

    traceExporter = new OTLPTraceExporter(otlpExporterConfig)
    logger.info('OTLP Trace Exporter Loaded')
} else {
    logger.info('No Tracing')
}

if (traceExporter) {
    logger.info('Configuring Trace Exporter Loaded')
    const sdk = new NodeSDK({
        resource: new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: 'saas-app',
            [SemanticResourceAttributes.SERVICE_VERSION]: '0.1.0',
            [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: env
        }),
        traceExporter: traceExporter
    })

    sdk.start()

    process.on('SIGINT', () => {
        sdk.shutdown()
            .then(() => logger.info('SDK shut down gracefully.'))
            .catch(err => logger.error('Error during SDK shutdown:', err))
            .finally(() => process.exit(0))
    })
}

// Configuring Tracers
export const serviceTracer = trace.getTracer('service')
export const dbTracer = trace.getTracer('database')
export const axiosTracer = trace.getTracer('axios')

// Tracing Enabled
export const TracerActivated = () => !!traceExporter

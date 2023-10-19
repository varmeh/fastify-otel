import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc'
import { ConsoleSpanExporter, BasicTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'

import logger from './logger.js'
import env from './env.js'

let traceExporter, spanProcessor, provider
let traceEnabled = false

switch (process.env.TRACE_TYPE.toLowerCase()) {
    case 'otlp':
        // DEBUG - Enable OpenTelemetry internal logging
        diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG)

        traceExporter = new OTLPTraceExporter({
            concurrencyLimit: 10,
            compression: 'gzip'
        })
        logger.debug('@Otel - OTLP Trace Exporter Selected')
        traceEnabled = true
        break

    case 'console':
        traceExporter = new ConsoleSpanExporter()
        logger.debug('@Otel - Console Trace Exporter Selected')
        traceEnabled = true
        break

    default:
        logger.debug('@Otel - No Tracing Enabled')
}

if (traceEnabled) {
    logger.info('@Otel - Configuring Trace Exporter')

    const resource = Resource.default().merge(
        new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: `${process.env.APP_NAME}-${env.getEnvironment()}`,
            [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION,
            [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: env.getEnvironment()
        })
    )

    provider = new BasicTracerProvider({
        resource: resource
    })

    spanProcessor = new BatchSpanProcessor(traceExporter, {
        maxQueueSize: 1000, // The maximum queue size. After the size is reached spans are dropped.
        scheduledDelayMillis: 1000 // The interval between two consecutive exports
    })

    provider.addSpanProcessor(spanProcessor)
    provider.register()

    process.on('SIGTERM', traceShudown)
    process.on('SIGINT', traceShudown)
}

// Function to handle the shutdown logic
async function traceShudown() {
    try {
        logger.info('@Otel - Tracer Shutting down in progress')
        await spanProcessor.shutdown() // Shutdown the span processor to ensure all spans are exported
        logger.info('@Otel - Tracer Shutdown complete')
    } catch (err) {
        logger.error('@Otel - Tracer Shutdown error', err)
    } finally {
        process.exit(0) // Exit the process with a success status code
    }
}

// Configuring Tracers
export const serviceTracer = provider?.getTracer('service')
export const dbTracer = provider?.getTracer('database')
export const axiosTracer = provider?.getTracer('axios')

// Tracing Enabled
export const TracerActivated = traceEnabled

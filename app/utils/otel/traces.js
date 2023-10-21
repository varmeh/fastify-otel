import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc'
import { NodeTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-node'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'

// import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
import { env } from '../env.js'

let traceExporter, spanProcessor, provider
const traceEnabled = process.env.OTEL_ENABLED === 'true'

if (traceEnabled) {
    console.info('@Otel - Tracing Enabled')

    // DEBUG - Enable OpenTelemetry internal logging
    // diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG)

    traceExporter = new OTLPTraceExporter({
        concurrencyLimit: 10,
        compression: 'gzip'
    })

    const resource = Resource.default().merge(
        new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: `${process.env.APP_NAME}-${env.getEnvironment()}`,
            [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION,
            [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: env.getEnvironment()
        })
    )

    provider = new NodeTracerProvider({
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
        console.info('@Otel - Tracer Shutdown In Progress')
        await spanProcessor.shutdown() // Shutdown the span processor to ensure all spans are exported
        console.info('@Otel - Tracer Shutdown Complete')
    } catch (err) {
        console.error('@Otel - Tracer Shutdown Failure', err)
    } finally {
        process.exit(0) // Exit the process with a success status code
    }
}

// Configuring Tracers
export const otelServiceTracer = provider?.getTracer('service')
export const otelDbTracer = provider?.getTracer('database')
export const otelAxiosTracer = provider?.getTracer('axios')

// Tracing Enabled
export const isOtelTracerEnabled = traceEnabled

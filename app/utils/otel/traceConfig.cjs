const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc')
const { NodeTracerProvider, BatchSpanProcessor } = require('@opentelemetry/sdk-trace-node')
const { Resource } = require('@opentelemetry/resources')
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions')

const { registerInstrumentations } = require('@opentelemetry/instrumentation')
const { PinoInstrumentation } = require('@opentelemetry/instrumentation-pino')

const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api')

const env = require('../env.cjs')

let spanProcessor, provider

if (env.isOtelEnabled()) {
    console.info('@Otel - Tracing Enabled')

    // DEBUG - Enable OpenTelemetry internal logging
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG)

    const traceExporter = new OTLPTraceExporter({
        concurrencyLimit: 10,
        compression: 'gzip'
    })

    const resource = Resource.default().merge(
        new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: env.serviceName(),
            [SemanticResourceAttributes.SERVICE_VERSION]: env.appVersion(),
            [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: env.envName()
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

    registerInstrumentations({
        instrumentations: [
            new PinoInstrumentation({
                logHook: (span, record, level) => {
                    console.log('record', record)
                    console.log('level', level)
                    console.log('span', span)
                    record['resource.service.name'] = provider.resource.attributes['service.name']
                }
            })
        ]
    })

    process.on('SIGTERM', traceShutdown)
    process.on('SIGINT', traceShutdown)
}

// Function to handle the shutdown logic
async function traceShutdown() {
    try {
        console.info('@Otel - Tracer Shutdown In Progress')
        await spanProcessor?.shutdown() // Shutdown the span processor to ensure all spans are exported
        await provider?.shutdown()
        console.info('@Otel - Tracer Shutdown Complete')
    } catch (err) {
        console.error('@Otel - Tracer Shutdown Failure', err)
    } finally {
        process.exit(0) // Exit the process with a success status code
    }
}

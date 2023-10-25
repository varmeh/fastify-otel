import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import build from 'pino-abstract-transport'

// import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'

import env from '../env.cjs'

// DEBUG - Enable OpenTelemetry internal logging
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG)

let otelLogger, loggerProvider

if (env.isOtelEnabled()) {
    console.info('@Otel - Logging Enabled')
    const loggerExporter = new OTLPLogExporter()

    const resource = Resource.default().merge(
        new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: env.serviceName(),
            [SemanticResourceAttributes.SERVICE_VERSION]: env.appVersion(),
            [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: env.envName()
        })
    )

    // To start a logger, you first need to initialize the Logger provider.
    loggerProvider = new LoggerProvider({
        resource: resource
    })

    // Add a processor to export log record
    loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(loggerExporter))

    // logging
    otelLogger = loggerProvider.getLogger('fastify-logger', env.appVersion())

    // Graceful Shutdown
    process.on('SIGTERM', loggerShutdown)
    process.on('SIGINT', loggerShutdown)
}

// Pino Log Transport
export default async function (_opts) {
    return build(async source => {
        for await (const logObject of source) {
            otelLogger.emit(mapPinoLogsToOtelLogRecord(logObject))
        }
    })
}

function mapPinoLogsToOtelLogRecord(pinoData) {
    const { msg, level, time, ...attributes } = pinoData

    const [severityNumber, severityText] = mapPinoToOtelLevel(level)
    const message = pinoData.reqId ? `[${pinoData.reqId.slice(0, 8)}] ${msg}` : `${msg}`

    // Serialize any non-primitive attribute values to a string representation
    const serializedAttributes = Object.fromEntries(
        Object.entries(attributes).map(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
                return [key, JSON.stringify(value)]
            }
            return [key, value]
        })
    )

    // Following Configuration required to connect traces with logs in NewRelic
    if (attributes.span_id && env.isOtelBackendNewRelic()) {
        serializedAttributes['span.id'] = attributes.span_id
        serializedAttributes['trace.id'] = attributes.trace_id
    }

    const logRecord = {
        timestamp: time,
        severityNumber: severityNumber,
        severityText: severityText,
        body: message,
        attributes: {
            ...serializedAttributes,
            level // used by NewRelic to filter logs by level
        }
    }

    return logRecord
}

function mapPinoToOtelLevel(pinoLevel) {
    switch (pinoLevel) {
        case 10: // trace
            return [4, 'TRACE']
        case 20: // debug
            return [7, 'DEBUG']
        case 30: // info
            return [9, 'INFO']
        case 40: // warn
            return [14, 'WARN']
        case 50: // error
            return [18, 'ERROR']
        case 60: // fatal
            return [24, 'FATAL']
        default:
            return [9, 'INFO'] // Default to INFO
    }
}

// Function to handle the shutdown logic
async function loggerShutdown() {
    try {
        console.info('@Otel - Logger Shutdown On Progress')
        await loggerProvider.shutdown()
        console.info('@Otel - Logger Shutdown Complete')
    } catch (err) {
        console.error('@Otel - Logger Shutdown Failure', err)
    } finally {
        process.exit(0) // Exit the process with a success status code
    }
}

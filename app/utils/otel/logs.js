import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import build from 'pino-abstract-transport'

// import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'

import { env } from '../env.js'

// DEBUG - Enable OpenTelemetry internal logging
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG)

const loggerExporter = new OTLPLogExporter()

const resource = Resource.default().merge(
    new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: `${process.env.APP_NAME}-${env.getEnvironment()}`,
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: env.getEnvironment()
    })
)
const loggerProvider = new LoggerProvider({
    resource: resource
})

loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(loggerExporter))
;['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, () => loggerProvider.shutdown().catch(console.error))
})

// logging
const otelLogger = loggerProvider.getLogger('fastify-logger', process.env.APP_VERSION)

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
    const message = msg

    // Serialize any non-primitive attribute values to a string representation
    const serializedAttributes = Object.fromEntries(
        Object.entries(attributes).map(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
                return [key, JSON.stringify(value)]
            }
            return [key, value]
        })
    )

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

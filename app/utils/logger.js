// const { PinoInstrumentation } = require('@opentelemetry/instrumentation-pino')
// const { registerInstrumentations } = require('@opentelemetry/instrumentation')

// // Register the Pino instrumentation
// registerInstrumentations({
//     instrumentations: [new PinoInstrumentation()]
// })

import pino from 'pino'

import { isOtelTracerEnabled } from './otel/traces.js'

const logLevel = process.env.LOG_LEVEL ?? 'debug'
const env = process.env.NODE_ENV ?? 'development'

const baseLogOptions = {
    level: logLevel,
    redact: {
        paths: ['req.headers.authorization', 'username', 'password', 'req.headers.cookie'],
        remove: true
    }
}

const transportTargets = []

if (env !== 'prod') {
    // Pretty Console prints for Non-Prod Environment
    transportTargets.push({
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'yyyy-mm-dd HH:MM:ss'
        }
    })
} else {
    // Standard Console prints for Prod Environment
    transportTargets.push({
        target: 'pino/file',
        level: 'debug'
    })
}

if (isOtelTracerEnabled) {
    // Add the otelTransport to the transportTargets array
    transportTargets.push({
        target: './otel/logs.js',
        level: 'debug' // Set the desired log level for OpenTelemetry export
    })
}

const transport = pino.transport({
    targets: transportTargets
})

export const logger = pino(baseLogOptions, transport)

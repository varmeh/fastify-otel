const pino = require('pino')

const env = require('./env.cjs')

const baseLogOptions = {
    level: env.logLevel(),
    redact: {
        paths: ['req.headers.authorization', 'username', 'password', 'req.headers.cookie'],
        remove: true
    }
}

const transportTargets = []

if (env.isProduction()) {
    // Standard Console prints for Prod Environment
    transportTargets.push({
        target: 'pino/file',
        level: env.logLevel()
    })
} else {
    // Pretty Console prints for Non-Prod Environment
    transportTargets.push({
        target: 'pino-pretty',
        level: env.logLevel(),
        options: {
            colorize: true,
            translateTime: 'yyyy-mm-dd HH:MM:ss'
        }
    })
}

if (env.isOtelEnabled()) {
    // Add the otelTransport to the transportTargets array
    transportTargets.push({
        target: './otel/logs.js',
        level: env.logLevel()
    })
}

const transport = pino.transport({
    targets: transportTargets
})

module.exports.logger = pino(baseLogOptions, transport)

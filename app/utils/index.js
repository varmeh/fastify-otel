import './env.js'

import './otel/traces.js'

import configureFastify from './configuration.js'
import logger from './logger.js'

export * from './otel/traces.js'

export { configureFastify, logger }

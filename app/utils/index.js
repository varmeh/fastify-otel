import './env.js'

import './instrumentation.js'

import configureFastify from './configuration.js'
import logger from './logger.js'

export * from './instrumentation.js'

export { configureFastify, logger }

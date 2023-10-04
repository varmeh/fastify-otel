import Fastify from 'fastify'
import { v4 as uuidv4 } from 'uuid'

import { configureFastify, logger } from './utils/index.js'
import registerRoutes from './api/routes.js'

const fastify = Fastify({
    logger: logger,
    genReqId: () => uuidv4()
})

configureFastify(fastify)

// Register Routes
registerRoutes(fastify)

// Run the server!
const start = async () => {
    try {
        await fastify.listen({ port: process.env.PORT, host: process.env.HOST })
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}

start()

import Fastify from 'fastify'

import { logger } from './app/utils/index.mjs'

const fastify = Fastify({
    logger: logger
})

// Declare a route
fastify.get('/', async (_request, _reply) => {
    return { hello: 'world' }
})

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

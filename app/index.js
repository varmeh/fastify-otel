import Fastify from 'fastify'

import { configureFastify, logger } from './utils/index.js'

const fastify = Fastify({
    logger: logger
})

configureFastify(fastify)

// Declare a route
fastify.get('/', async (_request, _reply) => {
    return { hello: 'world' }
})

// Define the JSON Schema for the POST request
const userSchema = {
    body: {
        type: 'object',
        required: ['name', 'age'],
        properties: {
            name: { type: 'string' },
            age: { type: 'integer', minimum: 0 }
        }
    }
}

// Define the POST route with the schema
fastify.post('/user', { schema: userSchema }, async (request, _reply) => {
    return { success: true, data: request.body }
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

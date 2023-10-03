import { userSchema } from './user.validator.js'

export default async fastify => {
    fastify.get('/users', async (_req, reply) => {
        reply.send({ message: 'Not much of users now' })
    })

    fastify.post(
        '/user',
        {
            schema: {
                body: userSchema
            }
        },
        async (req, reply) => {
            reply.send(req.body)
        }
    )
}

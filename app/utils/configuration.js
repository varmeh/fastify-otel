function getStatusMessage(code) {
    switch (code) {
        case 400:
            return 'Bad Request'
        case 401:
            return 'Unauthorized'
        case 403:
            return 'Forbidden'
        default:
            return 'Internal Server Error'
    }
}

export default fastify => {
    fastify.setValidatorCompiler(({ schema }) => {
        // "\"name\" must be a string" -> "name must be a string"
        const options = {
            errors: {
                wrap: {
                    label: ''
                }
            }
        }

        return data => schema.validate(data, options)
    })

    fastify.setNotFoundHandler((request, reply) => {
        const message = `Route ${request.url} not found`

        request.log.error(
            {
                reqId: request.reqId,
                req: {
                    method: request.method,
                    url: request.url,
                    hostname: request.hostname,
                    remoteAddress: request.ip,
                    remotePort: request.connection.remotePort
                }
            },
            message
        )

        reply.code(404).send({ error: 'Not found', message: `The requested resource ${request.url} does not exist.` })
    })

    fastify.setErrorHandler((error, request, reply) => {
        request.log.error(error)

        // Customizing Centralized Error Responses
        const statusCode = error.statusCode || 500
        reply.status(statusCode).send({
            error: getStatusMessage(statusCode),
            message: error.message,
            code: error.code // assuming your errors might have a specific 'code'
            // details: error.details // again, assuming you might have more details in some cases
        })
    })
}

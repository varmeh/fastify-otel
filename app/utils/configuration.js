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
    /* Logging Request Body for Debugging */
    if (process.env.LOG_REQUEST_BODY === 'true') {
        fastify.addHook('preValidation', async (request, _reply) => {
            request.log.info(
                {
                    reqId: request.reqId,
                    reqData: {
                        url: request.url,
                        hostname: request.hostname,
                        body: request.body,
                        params: request.params,
                        query: request.query,
                        headers: request.headers
                    }
                },
                'request data'
            )
        })
    }

    /* Logging Response Body for Debugging */
    if (process.env.LOG_RESPONSE_BODY === 'true') {
        fastify.addHook('onSend', async (request, reply, payload) => {
            try {
                const parsedPayload = JSON.parse(payload)
                request.log.info(
                    {
                        headers: reply.getHeaders(),
                        body: parsedPayload
                    },
                    'response data'
                )
            } catch (error) {
                // If parsing fails, just log the error and continue
                request.log.error({ error }, 'error while parsing response data')
            }
        })
    }

    /* Configuration for JOI Validator */
    fastify.setValidatorCompiler(({ schema }) => {
        /* Changing "\"name\" must be a string" -> "name must be a string" */
        const options = {
            errors: {
                wrap: {
                    label: ''
                }
            }
        }

        return data => schema.validate(data, options)
    })

    /* Customizing 404 Responses */
    fastify.setNotFoundHandler((request, reply) => {
        const message = `Route ${request.url} not found`

        request.log.error(
            {
                reqId: request.reqId,
                req: {
                    method: request.method,
                    url: request.url,
                    hostname: request.hostname
                }
            },
            message
        )

        reply.code(404).send({ error: 'Not found', message: `The requested resource ${request.url} does not exist.` })
    })

    /* Customizing Centralized Error Responses */
    fastify.setErrorHandler((error, request, reply) => {
        request.log.error(error)

        const statusCode = error.statusCode || 500
        reply.status(statusCode).send({
            error: getStatusMessage(statusCode),
            message: error.message,
            code: error.code // assuming your errors might have a specific 'code'
            // details: error.details // again, assuming you might have more details in some cases
        })
    })
}

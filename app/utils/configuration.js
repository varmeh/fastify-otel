import env from './env.cjs'

export const configureFastify = fastify => {
    fastify.addHook('preValidation', async (request, _reply) => {
        logRequestData(request)
    })

    fastify.addHook('onSend', async (request, reply, payload) => {
        logResponseData(request, reply, payload)
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
}

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

/* Logging Request Body for Debugging */
function logRequestData(request) {
    if (!env.logRequestData()) return

    const data = {}
    if (request.body) {
        data.body = request.body
    }

    request.log.info(
        {
            ...data,
            url: request.url,
            headers: request.headers
        },
        'request data'
    )
}

/* Logging Response Body for Debugging */
function logResponseData(request, reply, payload) {
    if (!env.logResponseData()) return

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
}

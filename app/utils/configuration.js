import { SemanticAttributes } from '@opentelemetry/semantic-conventions'
import { otelServiceTracer } from './otel/tracers.js'

import env from './env.cjs'

export const configureFastify = fastify => {
    fastify.addHook('preValidation', async (request, _reply) => {
        logRequestData(request)
        startSpan(request)
    })

    fastify.addHook('onSend', async (request, reply, payload) => {
        logResponseData(request, reply, payload)
        endSpan(request, reply)
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
    if (process.env.LOG_REQUEST_BODY !== 'true') {
        return
    }

    const data = {}
    if (request.body) {
        data.body = request.body
    }

    request.log.info(
        {
            ...data,
            url: request.url,
            hostname: request.hostname,
            headers: request.headers
        },
        'request data'
    )
}

/* Logging Response Body for Debugging */
function logResponseData(request, reply, payload) {
    if (process.env.LOG_RESPONSE_BODY !== 'true') {
        return
    }

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

function startSpan(request) {
    if (!env.isOtelEnabled()) return

    const span = otelServiceTracer.startSpan(`Http ${request.method} ${request.url}`)

    // Storing span in the request object for potential child spans.
    request.span = span

    // Add attributes to the span.
    span.setAttribute('request.uuid', request.id)
    span.setAttribute(SemanticAttributes.HTTP_METHOD, request.method)
    span.setAttribute(SemanticAttributes.HTTP_URL, request.url)
    span.setAttribute(SemanticAttributes.HTTP_USER_AGENT, request.headers['user-agent'])
    span.setAttribute(SemanticAttributes.HTTP_HOST, request.hostname)
    span.setAttribute(SemanticAttributes.HTTP_CLIENT_IP, request.ip)
}

function endSpan(request, reply) {
    if (request.span) {
        const span = request.span

        // Adding attributes
        span.setAttribute(SemanticAttributes.HTTP_STATUS_CODE, reply.statusCode)

        span.end()
    }
}

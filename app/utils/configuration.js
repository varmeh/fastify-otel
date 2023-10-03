function getStatusMessage(code) {
    switch (code) {
        case 400:
            return 'Bad Request'
        case 401:
            return 'Unauthorized'
        case 403:
            return 'Forbidden'
        case 404:
            return 'Not Found'
        default:
            return 'Internal Server Error'
    }
}

export default fastify => {
    fastify.setErrorHandler((error, request, reply) => {
        request.log.error(error)

        // Customizing Centralized Error Responses
        const statusCode = error.statusCode || 500
        reply.status(statusCode).send({
            error: getStatusMessage(statusCode),
            message: error.message,
            code: error.code, // assuming your errors might have a specific 'code'
            details: error.details // again, assuming you might have more details in some cases
        })
    })
}

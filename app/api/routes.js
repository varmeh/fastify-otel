export default fastify => {
    fastify.register(import('./user/user.routes.js'))
}

import { config } from 'dotenv'

// Load environment variables from .env file
config()

class Environment {
    constructor(nodeEnv) {
        this.nodeEnv = nodeEnv.toLowerCase()
    }

    isProduction() {
        return this.nodeEnv === 'prod'
    }

    isDevelopment() {
        return this.nodeEnv === 'dev'
    }

    isTest() {
        return this.nodeEnv === 'test'
    }

    getEnvironment() {
        return this.nodeEnv
    }
}

/* Check MANDATORY env variables are present in env file */
function checkMissingVariables() {
    const REQUIRED_ENV_VARS = ['HOST', 'PORT', 'LOG_LEVEL']

    const missingVars = REQUIRED_ENV_VARS.filter(key => typeof process.env[key] === 'undefined' || process.env[key] === '')

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
    }
}

/* Verify if OTEL configured properly */
function verifyOtelConfiguration() {
    const traceType = process.env.TRACE_TYPE
    if (!traceType) {
        return // TRACE_TYPE is not defined, do nothing
    }

    if (traceType.toLowerCase() === 'otlp') {
        const requiredOtelVars = ['OTLP_API_KEY', 'OTLP_ENDPOINT']
        const missingOtelVars = requiredOtelVars.filter(key => typeof process.env[key] === 'undefined' || process.env[key] === '')

        if (missingOtelVars.length > 0) {
            throw new Error(`Missing required OTLP environment variables: ${missingOtelVars.join(', ')}`)
        }
    }
}

function setupEnvironment() {
    checkMissingVariables()

    verifyOtelConfiguration()

    return new Environment(process.env.NODE_ENV)
}

// Export a singleton instance of Environment
const env = setupEnvironment()
export default env

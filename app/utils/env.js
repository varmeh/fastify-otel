import { config } from 'dotenv'

// Load environment variables from .env file
config()

class Environment {
    constructor() {
        this.nodeEnv = process.env.NODE_ENV.toLowerCase()
    }

    isProduction() {
        return this.nodeEnv === 'prod'
    }

    isOtelEnabled() {
        return process.env.OTEL_ENABLED === 'true'
    }

    envName() {
        return this.nodeEnv
    }

    logLevel() {
        const logLevel = process.env.LOG_LEVEL.toLowerCase() ?? 'info'
        return logLevel
    }

    appName() {
        return process.env.APP_NAME.toLowerCase()
    }

    appVersion() {
        return process.env.APP_VERSION
    }

    serviceName() {
        return `${this.appName()}-${this.envName()}`
    }
}

/* Check MANDATORY env variables are present in env file */
function checkMissingVariables() {
    const REQUIRED_ENV_VARS = ['HOST', 'PORT', 'LOG_LEVEL', 'APP_NAME', 'APP_VERSION']

    const missingVars = REQUIRED_ENV_VARS.filter(key => typeof process.env[key] === 'undefined' || process.env[key] === '')

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
    }
}

function setupEnvironment() {
    checkMissingVariables()

    return new Environment()
}

// Export a singleton instance of Environment
export const env = setupEnvironment()

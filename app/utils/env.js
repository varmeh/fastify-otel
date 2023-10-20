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
const env = setupEnvironment()
export default env

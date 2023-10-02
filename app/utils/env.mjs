import { config } from 'dotenv'

// Load environment variables from .env file
config()

const REQUIRED_ENV_VARS = ['HOST', 'PORT', 'LOG_LEVEL']

const missingVars = REQUIRED_ENV_VARS.filter(key => typeof process.env[key] === 'undefined' || process.env[key] === '')

if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
}


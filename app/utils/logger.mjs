import pino from 'pino';

const logLevel = process.env.LOG_LEVEL ?? 'debug';
const env = process.env.NODE_ENV ?? 'development';

const baseLogOptions = {
    level: logLevel,
    formatters: {
        level(label) {
            return { level: label };
        }
    }
};

if (env !== 'production') {
    baseLogOptions.transport = {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'yyyy-mm-dd HH:MM:ss'
        }
    };
}

const logger = pino(baseLogOptions);

// Refer link to understand logging options for pino - https://github.com/pinojs/pino/blob/25ba61f40ea5a1a753c85002812426d765da52a4/examples/basic.js

export default logger;


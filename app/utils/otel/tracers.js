import { trace } from '@opentelemetry/api'

export const otelServiceTracer = trace.getTracer('service')
export const otelDbTracer = trace.getTracer('database')
export const otelAxiosTracer = trace.getTracer('axios')

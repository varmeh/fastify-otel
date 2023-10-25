# OpenTelemetry

- [OpenTelemetry](#opentelemetry)
  - [References](#references)
  - [Traces](#traces)
    - [Configuration Steps](#configuration-steps)
      - [Create a Trace Provider](#create-a-trace-provider)
      - [Configure Trace Exporter](#configure-trace-exporter)
      - [Registering Instrumentations](#registering-instrumentations)
      - [Pre Loading Instrumentation Libraries](#pre-loading-instrumentation-libraries)
  - [Logs](#logs)
    - [Pino Log Transport to Log Exporter](#pino-log-transport-to-log-exporter)
    - [Pino Logs Transformation to OTLP Log Format](#pino-logs-transformation-to-otlp-log-format)
  - [Connecting Traces \& Logs](#connecting-traces--logs)
  - [Debugging Traces \& Logs](#debugging-traces--logs)

## References

Use following References to understand it better:

- [Unpacking Observability](https://adri-v.medium.com/list/unpacking-observability-be1835c6dd23)
- [Understanding Logs, Traces, Events & Metrics](https://medium.com/dzerolabs/observability-journey-understanding-logs-events-traces-and-spans-836524d63172)
- [OpenTelemetry](https://opentelemetry.io/)
- [OpenTelemetry vs APM](https://www.youtube.com/watch?v=CAQ_a2-9UOI&list=PLOspHqNVtKAC-_ZAGresP-i0okHe5FjcJ&index=15&ab_channel=IBMTechnology)

## Traces

- Traces provides mechanism to understand the [flow of execution of a process or workflow](https://developer.newrelic.com/opentelemetry-masterclass/telemetry/traces/)

- Tracing is configured in the module `traceConfig.cjs`.

### Configuration Steps

It's a 3 step process:

- Create a Trace Provider
- Configure a Trace Exporter
- Register Instrumentations

#### Create a Trace Provider

- Recommeded trace provider for any node app is `NodeTraceProvider`
- It is created with a `Resource` and `ContextManager`
  - `Resource` identifies the service
  - `Context Manager` is responsible for Trace Context Management (`trace_id`, `span_id`) for each request
- It gives `tracers()` which are then used to generate `trace context` for a request

```javascript
const resource = Resource.default().merge(
    new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: env.serviceName(),
        [SemanticResourceAttributes.SERVICE_VERSION]: env.appVersion(),
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: env.envName()
    })
);

const contextManager = new AsyncLocalStorageContextManager().enable();

provider = new NodeTracerProvider({
    resource: resource,
    contextManager: contextManager
});

// A. Exporter Code Follows

provider.register();

// B. Instrumentation Code Follows
```

#### Configure Trace Exporter

- The traces generated above could be exported to a backend or collector using a **exporter**
- We have used `OTLPTraceExporter` as it is vendor agnostic
- It can exports traces to:
  - Directly to the Backend - eg. `New Relic`
  - A Collector Service - eg. `OpenTelemetry Collector` in `Kubernetes`
  - Refer [diagram](https://docs.newrelic.com/docs/more-integrations/open-source-telemetry-integrations/opentelemetry/get-started/opentelemetry-set-up-your-app/#review-settings) to get an idea
- For both cases, `NO changes` are required from in code
- Set the `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable to backend or collector service url appropriately

```javascript
// A. Exporter Code Follows
    const traceExporter = new OTLPTraceExporter({
        concurrencyLimit: 10,
        compression: 'gzip'
    })

    spanProcessor = new BatchSpanProcessor(traceExporter, {
        maxQueueSize: 1000, // The maximum queue size. After the size is reached spans are dropped.
        scheduledDelayMillis: 1000 // The interval between two consecutive exports
    })

    provider.addSpanProcessor(spanProcessor)
```

#### Registering Instrumentations

- We could instrument traces `manually` or `automatically`
- `Manual instrumentation` needs following steps done programtically:
  - Trace Creation using `startActiveSpan()` or `startSpan()` with `bind()` or `with()` Apis
  - Trace Context Management
  - Trace Propagation

- `Auto-Instrumentation` is a simplar alternative:
- It is done using `registerInstrumentations` method in `traceConfig.cjs`

```javascript
// B. Instrumentation Code Follows
registerInstrumentations({
        instrumentations: [
            new PinoInstrumentation(),
            new HttpInstrumentation({
                requestHook: (span, request) => {
                    span.updateName(`${request.method} ${request.url}`)
                    span.setAttribute('request.uuid', request.id)
                    span.setAttribute(SemanticAttributes.HTTP_USER_AGENT, request.headers['user-agent'])
                    span.setAttribute(SemanticAttributes.HTTP_HOST, request.hostname)
                },
                responseHook: (span, response) => {
                    span.setAttribute(SemanticAttributes.HTTP_STATUS_CODE, response.statusCode)
                },
                headersToSpanAttributes: ['user-agent', 'http.url', 'http.method', 'http.host', 'http.client_ip']
            }),
            new FastifyInstrumentation()
        ]
    })
```

- Following Instrumentations are used:
  - `HttpInstrumentation`:
    - It adds `tracing record` with following information - `span_id`, `trace_id` & `trace_flags` to each incoming request
    - Additional Attributes are added to span as well in its `requestHook` & `responseHook`

  - `PinoInstrumentation`:
    - Pino is the default logger used in Fastify
    - This instrumentation adds `context of a request` to the corresponding log statement

#### Pre Loading Instrumentation Libraries

- Instrumentation libraries work only if they are pre-loaded before importing the attaching libary eg. `PinoInstrumentation` attachs to `pino`. So, it is essential to ensure that this instrumentation is loaded before `pino` is imported
- To ensure this, `tracerConfig.cjs` is loaded as a module in npm scripts

```json
    "scripts": {
        "dev": "NODE_ENV=dev nodemon --inspect=0.0.0.0:9229 -r ./app/utils/otel/traceConfig.cjs app/index.js"
    },
```

- Note the extension of file is `.cjs` and not `.js`.
- While the default module system for app is `ES Module`, Pre-loaded modules are only supported for `CommonJS` modules
- So, this & it's dependent modules are converted to CommonJS Module format

## Logs

- Structures logs are also called `Events`  
- `pino` which is the default logging library for fastify, by default supports JSON logs
- These logs need to be forwarded to a backend
- This could be done in [multiple ways](https://docs.newrelic.com/docs/logs/forward-logs/enable-log-management-new-relic/). eg.
  - Save logs to a file & use `Fluentd` or `LogStash` to forward it to a backend or collector

- A `log exporter` is used here in `otel/logs.js`

```javascript
    const loggerExporter = new OTLPLogExporter()

    const resource = Resource.default().merge(
        new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: env.serviceName(),
            [SemanticResourceAttributes.SERVICE_VERSION]: env.appVersion(),
            [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: env.envName()
        })
    )

    // To start a logger, you first need to initialize the Logger provider.
    loggerProvider = new LoggerProvider({
        resource: resource
    })

    // Add a processor to export log record
    loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(loggerExporter))

    // logging
    otelLogger = loggerProvider.getLogger('fastify-logger', env.appVersion())

```

- `OTLPLogExporter` is vendor agnostic & can send logs to a `collector` or `a backend` like New Relic

- Connecting this exporter with pino is a 2 steps process:
  - Transporting Logs to Log Exporter
  - Transforming Logs

### Pino Log Transport to Log Exporter

- `pino` supports `transport` option to forward logs to a backend
- To transport logs to `OTLPLogExporter`, a custom transport is created in `app/utils/otel/pinoTransport.js` using `pino-abstract-transport`

```javascript
import build from 'pino-abstract-transport'

// Otel logger Configuration as shown above...
otelLogger = loggerProvider.getLogger('fastify-logger', env.appVersion())

// Creating a transport for pino
export default async function (_opts) {
    return build(async source => {
        for await (const logObject of source) {
            otelLogger.emit(mapPinoLogsToOtelLogRecord(logObject))
        }
    })
}
```

- The above pino transport is then integrated in pino logger in `app/utils/logger.cjs`

```javascript
const transportTargets = []

if (env.isOtelEnabled()) {
    // Add the otelTransport to the transportTargets array
    transportTargets.push({
        target: './otel/logs.js',
        level: env.logLevel()
    })
}

const transport = pino.transport({
    targets: transportTargets
})
```

- With above code, logs would be send to OTLPLogExporter

### Pino Logs Transformation to OTLP Log Format

- Backends expect the log in format as defined in [OTLP Log Protocol](https://opentelemetry.io/docs/specs/otel/logs/data-model)
- This means pino logs needs to be transformed into this format at the time of export
- This is done in `app/utils/otels/logs.js` using `mapPinoLogsToOtelLogRecord` which is configured in log transport function created above

```javascript
// Pino Log Transport
export default async function (_opts) {
    return build(async source => {
        for await (const logObject of source) {
            otelLogger.emit(mapPinoLogsToOtelLogRecord(logObject))
        }
    })
}

function mapPinoLogsToOtelLogRecord(pinoData) {
    // Transformation Code

    // OTLP Log Record Format
    const logRecord = {
        timestamp: time,
        severityNumber: severityNumber,
        severityText: severityText,
        body: message,
        attributes: {
            ...serializedAttributes,
            level // used by NewRelic to filter logs by level
        }
    }

    return logRecord
}
```

## Connecting Traces & Logs

- Traces & Logs are connected using `trace_id` & `span_id` - the trace context
  - `HttpInstrumentation` automatically adds trace context to each incoming request
  - `PinoInstrumentation` adds this context to each log statement

- But New Relic does not support this out of the box
- To connect traces with logs, sync is required in [following configuration variable](https://docs.newrelic.com/docs/more-integrations/open-source-telemetry-integrations/opentelemetry/view-your-data/opentelemetry-logs-page/):
  - `service.name` - Should be same as `service.name` in traces. Done using `Resource` object in `LoggerProvider` & `NodeTraceProvider`

    ```javascript
    const resource = Resource.default().merge(
        new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: env.serviceName(),
        })
    )
    ```

  - `trace.id` & `span.id` in logs. OTLPExporter adds `trace_id` & `span_id` to each log statement
  - Covert it into expected fields in `mapPinoLogsToOtelLogRecord` function

    ```javascript

    // Following Configuration required to connect traces with logs in NewRelic
    if (attributes.span_id && env.isOtelBackendNewRelic()) {
        serializedAttributes['span.id'] = attributes.span_id
        serializedAttributes['trace.id'] = attributes.trace_id
    }
    ```

- Post the above changes, traces & logs would be connected in New Relic UI

## Debugging Traces & Logs

- To debug trace spans & logs which are being exported, add following code at the top of either of the `traceConfig.cjs` or `log.cjs` file

```javascript
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG)

    const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api')
```

- It will show a `Span` for a request

```log
  Span {
    attributes: {
      'http.url': 'http://localhost:3000/user?val=11',
      'http.host': 'localhost:3000',
      'net.host.name': 'localhost',
      'http.method': 'POST',
      'http.scheme': 'http',
      'http.target': '/user?val=11',
      'http.user_agent': 'PostmanRuntime/7.33.0',
      'http.request_content_length_uncompressed': 36,
      'http.flavor': '1.1',
      'net.transport': 'ip_tcp',
      'http.status_code': 200,
      'net.host.ip': '::1',
      'net.host.port': 3000,
      'net.peer.ip': '::1',
      'net.peer.port': 55971,
      'http.status_text': 'OK'
    },
    links: [],
    events: [],
    _droppedAttributesCount: 0,
    _droppedEventsCount: 0,
    _droppedLinksCount: 0,
    status: { code: 0 },
    endTime: [ 1698235729, 571059500 ],
    _ended: true,
    _duration: [ 0, 12059500 ],
    name: 'POST /user?val=11',
    _spanContext: {
      traceId: '8eeaff54b803d70c274b44231221411a',
      spanId: '9403d711b0f955f9',
      traceFlags: 1,
      traceState: undefined
    },
    parentSpanId: undefined,
    kind: 1,
    _performanceStartTime: 4818.937082767487,
    _performanceOffset: -0.64111328125,
    _startTimeProvided: false,
    startTime: [ 1698235729, 559000000 ],
    resource: Resource {
      _attributes: [Object],
      asyncAttributesPending: false,
      _syncAttributes: [Object],
      _asyncAttributesPromise: undefined
    },
    instrumentationLibrary: {
      name: '@opentelemetry/instrumentation-http',
      version: '0.44.0',
      schemaUrl: undefined
    },
    _spanLimits: {
      attributeValueLengthLimit: Infinity,
      attributeCountLimit: 128,
      linkCountLimit: 128,
      eventCountLimit: 128,
      attributePerEventCountLimit: 128,
      attributePerLinkCountLimit: 128
    },
    _spanProcessor: MultiSpanProcessor { _spanProcessors: [Array] },
    _attributeValueLengthLimit: Infinity
  }
```

- And a `Log Record` for each pino log statement

```log
LogRecord {
    attributes: {
      pid: 22312,
      hostname: 'VMAir.local',
      reqId: '378daeba-08d9-4b0b-a61f-91ed60b76022',
      trace_id: '8eeaff54b803d70c274b44231221411a',
      span_id: '9403d711b0f955f9',
      trace_flags: '01',
      req: '{"method":"POST","url":"/user?val=11","hostname":"localhost:3000","remoteAddress":"::1","remotePort":55971}',
      'span.id': '9403d711b0f955f9',
      'trace.id': '8eeaff54b803d70c274b44231221411a',
      level: 30
    },
    _isReadonly: true,
    hrTime: [ 1698235729, 562000000 ],
    hrTimeObserved: [ 1698235729, 678000000 ],
    _severityNumber: 9,
    _severityText: 'INFO',
    _body: '[378daeba] incoming request',
    resource: Resource {
      _attributes: [Object],
      asyncAttributesPending: false,
      _syncAttributes: [Object],
      _asyncAttributesPromise: undefined
    },
    instrumentationScope: { name: 'fastify-logger', version: '0.1.0', schemaUrl: undefined },
    _logRecordLimits: { attributeCountLimit: 128, attributeValueLengthLimit: Infinity }
  }
```

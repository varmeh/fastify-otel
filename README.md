# Saas Backend

## Running App Locally

- Easiest way is using docker compose

```bash
docker compose up
```

- It will build the app using dockerfile `Dockerfile.local`
- Make sure you have a `.env.docker` file in repo root with `HOST` set to `0.0.0.0` to allow access from host machine
- Your local `app` directory will be mounted to `/usr/src/app` in container
- This will ensure that any changes you make locally will be reflected in container immediately

- Following changes will require you to rebuild the container:
  - `package.json` Updates
  - `docker-compose.yml` or `Dockerfile.local` updates
  - `.env.docker` updates

```bash
docker compose up --build
```

## CommonJS vs ES Modules

| Feature / Aspect     | CommonJS                                        | ES Modules (ESM)                               |
|----------------------|-------------------------------------------------|------------------------------------------------|
| **Syntax**           | `const module = require('module');`            | `import module from 'module';`                |
| **File Extension**   | `.js` or `.cjs`                                | `.mjs` or `.js` with `"type": "module"` in `package.json` |
| **Dynamic Imports**  | Supported natively                              | Supported using `import()` function           |
| **Static Analysis**  | Not supported natively                          | Supported natively                             |
| **Top-level Imports**| Imports can be placed anywhere                  | Imports must be at the top-level              |
| **Export Syntax**    | `module.exports = { ... };`                    | `export { ... };`                             |
| **Loading Mechanism**| Synchronous Runtime loading                    | `Asynchronous` Static loading                 |

- In essence, benefits of ESM over CommonJS are:
  - `import` and `export` syntax
  - Asynchchronous loading of modules
  - Future proof
  - Static analysis

### Importing CommonJS in ES Modules

In ES Modules, you can import CommonJS modules using the `import` statement.
However, the imported module will be a single default export.

```javascript
// ESM syntax
import commonjsModule from './commonjs-module.js';
```

### Importing ES Modules in CommonJS

In CommonJS, you can use the `import()` function to dynamically import ES Modules. This returns a promise.

```javascript
// CommonJS syntax
import('./es-module.mjs').then(esModule => {
  console.log(esModule.default);
});
```

## CommonJS Modules in App

- ESM is set as default module system for the app by setting `"type": "module"` in `package.json`
- So, all files with `.js` extension will be treated as ES Modules
- To create a CommonJS module, use `.cjs` extension

- Following files have `.cjs` extension
  - `tracerConfig.cjs` -  `Pre-loaded` using `-r` flag in `scripts` in `package.json`
  - `env.cjs` - Used by `tracerConfig.cjs` & CJS Module can't import ESM module directly
  - `logger.cjs` - Changed to `.cjs` as it uses `env.cjs` which is CJS module

## Known Issues

### Tracing Config Loaded Twice

- `tracerConfig.cjs` is preloaded using `-r` flag in `scripts` in `package.json`
- And for some reason, `tracerConfig.cjs` is loaded twice - once in `MainThread` & other in `WorkerThread`
- If we add checks to stop it, logs emitting stops

eg.

```js
// tracerConfig.cjs
const { isMainThread } = require('worker_threads');


// This check breaks span & log emitting
if (env.isOtelEnabled() && isMainThread) {
  // ...
}
```

- It does not effect the app in any way, but it is not ideal

### Pre-loading of `tracerConfig.cjs`

- Primary requirement for auto-instrumentation to work is to ensure it's loading before any of the modules are loaded. eg.
  - pino module should be loaded after `tracerConfig.cjs`
- To ensure this behaviour, we are pre-loading `tracerConfig.cjs` using `-r` flag in `scripts` in `package.json`

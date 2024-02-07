#  `@sap-ux/reload-middleware`

The `@sap-ux/reload-middleware` is a [Custom UI5 Server Middleware](https://sap.github.io/ui5-tooling/pages/extensibility/CustomServerMiddleware) which creates a websocket server upon the current running UI5 Server and also creates a filesystem watcher that listens for filesystem changes to the current project's flex changes files.

This allows to create websocket connections to the current UI5 server and receive notifications through it about updated, created, or deleted flex change files.

The middleware is intended to be used as an external file changes notification tool for Control Property Editor to notify the user about external manual changes to flex changes files and provide an ability to manually reload app preview editor after them.


## Configuration Options
| Option                 | Type      | Default Value    | Description                                                                                                                         |
| ---------------------- | --------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `debug`                | `boolean` | `false`          | Enables debug output                                                                                                                |

## Usage
The middleware can be used without configuration. However, since the middleware intercepts a few requests that might otherwise be handled by a different middleware, it is recommended to run it before other file serving middlewares e.g. `backend-proxy-middleware` and `ui5-proxy-middleware` (and the corresponding middlewares in the `@sap/ux-ui5-tooling`).


### Minimal Configuration
With no configuration provided, the local FLP will be available at `/test/flp.html` and the log level is `info`.
```Yaml
server:
  customMiddleware:
  - name: reload-middleware
    afterMiddleware: compression
```

### Debugging enabled
With this configuration the log level is `debug`.
```Yaml
server:
  customMiddleware:
  - name: reload-middleware
    afterMiddleware: compression
    configuration:
      debug: true
```

### Programmatic Usage
Alternatively you can use the underlying middleware function programmatically, e.g. for the case when you want to incorporate the `reload-middleware` functionality in your own middleware.

```typescript
import { reloadMiddleware } from '@sap-ux/reload-middleware';
import type { RequestHandler } from 'express';

const mw = await (reloadMiddleware as RequestHandler).default(
    {
        options: { debug: false },
        resources: {},
        middlewareUtil
    }
);

const app = express();
app.use(mw);
app.listen(3000);

const ws = new WebSocket('ws://localhost:3000');
ws.addEventListener('message', (event) => {
    const receivedMessage = event.data;
});

// wait for ws.readyState === WebSocket.OPEN)
// then trigger the project's flex changes file change event (update / delete / create)
// expect the websocket event listener to be called with the changed file name

```
- `middlewareUtil` - [MiddlewareUtil](https://sap.github.io/ui5-tooling/v3/api/@ui5_server_middleware_MiddlewareUtil.html) of the UI5 server

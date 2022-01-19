# `@sap-ux/logger`

This is a simple logging library. It uses [Winston](https://github.com/winstonjs/winston) underneath to do the heavy-lifting. The API is agnostic to any particular logging library. Don't depend on any Winston-specific implemenation as the underlying library may change in the future.

### Quick Usage
Add the package `@sap-ux/logger` to your project using your preferred package manager.

In Typescript/ES6, import the logger and instantiate it. By default the log level is `info` and the logs are sent to the console.

```typescript
import { ToolsLogger } from '@sap-ux/logger';
...

const logger = new ToolsLogger();
...
logger.info('This is an information message');
...
logger.warn('This is a warning');
...
logger.error('This is an error!');
// Can also log objects
logger.debug({a: 42, b: 'some value'});
```

### Logger Options
| Option | Default Value | Description |
| ------ | ------------- | ----------- |
| `logLevel` | LogLevel.Info | Log only if equal to or more severe than this level ([supported levels](#log-levels)) |
| `transports` | [`ConsoleTransport`](#consoletransport) | An array of [transports](#transports) |

### Log Levels
Log levels are exposed an as enumeration.
The following levels are available, in decreasing order of severity:
* Error
* Warn
* Info
* Verbose
* Debug
* Silly

### Transports
These are the targets of the log messages. You can have multiple targets for a single logger. The targets can be added and removed dynamically, if required.

The following transports are currently supported:
#### `ConsoleTransport`
This is used to write to the `console`.
#### `FileTransport`
This is used to write to files. Logs are appended to files. Currently there's no support to rotate logs.

#### `VSCodeTransport`
This is used to write to an [output channel](https://code.visualstudio.com/api/extension-capabilities/common-capabilities#output-channel) in VS Code.
#### `NullTransport`
This is the equivalent of writing to `/dev/null`. If an API needs a logger and you really don't want to capture logs, you can use `NullTransport` to use completely ignore the logs.

### Logger API

#### Logging methods
`error()`, `warn()`, `info()` and `debug()` methods can be used to either print log a string or an object.

#### Transport management
You can `add()`, `remove()` transport dynamically. `transports()` returns a list of the current transports of the logger.

### Examples
The unit test file can be used as an example to explore the logger's API: [./test/unit/wiston-logger/logger.test.ts](./test/unit/wiston-logger/logger.test.ts)

Please refer to the debugging section in the project root [README](../../README.md) for help debugging the test.
### Not supported
The following options are not supported yet. There are no definite plans to add them in the future. They will be considered on a need-basis.

* Custom formatters
    - `VSCodeTransport` logs timestamped lines
    -  `FileTransport` logs in JSON
    -  `ConsoleTransport` logs colored and timestamped lines (piping will remove color encoding though)
* File rotation - the file transport appends to an existing file or creates a new one if missing

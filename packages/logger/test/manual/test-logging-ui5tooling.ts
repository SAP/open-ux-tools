import { LogLevel, ToolsLogger } from '../../src';
import { FileTransport, UI5ToolingTransport } from '../../src/transports';

function main() {
    const logger = new ToolsLogger({
        logLevel: LogLevel.Debug,
        transports: [new UI5ToolingTransport({ moduleName: 'test:module' })]
    });
    let [info, warn, error, debug] = [0, 0, 0, 0];
    logger.add(new FileTransport({ filename: 'foo.log' }));
    logger.info(`Info: ${++info}`);
    logger.error(`Error: ${++error}`);
    logger.warn(`Warn: ${++warn}`);
    logger.debug(`Debug: ${++debug}`);
    logger.info(`Info: ${++info}`);
    logger.error(`Error: ${++error}`);
    logger.warn(`Warn: ${++warn}`);
    logger.debug(`Debug: ${++debug}`);
    logger.info(`Info: ${++info}`);
    logger.error(`Error: ${++error}`);
    logger.warn(`Warn: ${++warn}`);
    logger.debug(`Debug: ${++debug}`);
    logger.debug({ a: 42, b: 'something' });
    logger.add(new FileTransport({ filename: 'bar.log', logLevel: LogLevel.Error }));
    logger.error(`Error: ${++error}`);
    logger.info(`Info: ${++info}`);
    logger.log('More debug?');
    logger.log({ level: LogLevel.Verbose, message: 'can we keep this short? no?' });
}

main();

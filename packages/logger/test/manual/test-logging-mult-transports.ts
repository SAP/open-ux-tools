import { LogLevel, ToolsLogger } from '../../src';
import { ConsoleTransport, FileTransport, NullTransport } from '../../src/transports';

function main() {
    const logger = new ToolsLogger({
        logLevel: LogLevel.Debug,
        transports: [new ConsoleTransport(), new ConsoleTransport(), new NullTransport()]
    });
    logger.add(new ConsoleTransport());
    logger.add(new FileTransport({ filename: 'foo.log' }));
    logger.info('Info line 1');
    logger.error('Error line 1');
    logger.warn('Warning line 1');
    logger.debug('Debug line 1');
    logger.info('Info line 2');
    logger.error('Error line 2');
    logger.warn('Warning line 2');
    logger.debug('Debug line 2');
    logger.info('Info line 3');
    logger.error('Error line 3');
    logger.warn('Warning line 3');
    logger.debug('Debug line 3');
    logger.debug({ a: 42, b: 'something' });

    logger.remove(new ConsoleTransport());
    logger.info('We should not see this');
    logger.add(new ConsoleTransport());
    logger.info('We should see logs again');
    logger.remove(new ConsoleTransport());
    try {
        logger.remove(new ConsoleTransport());
    } catch (e) {
        console.log('Error removing console transport');
    }
    logger.info('We should not see this');
    logger.add(new FileTransport({ filename: 'bar.log', logLevel: LogLevel.Info }));
    logger.info('We should see logs in the file');
}

main();

import { LogLevel, ToolsLogger } from '../../src';
import { ConsoleTransport, FileTransport, NullTransport } from '../../src/transports';

function main() {
    const logger = new ToolsLogger({
        logLevel: LogLevel.Silly,
        transports: [new ConsoleTransport()]
    });
    logger.info('app log 1');
    logger.info('app log 2');
    logger.info('app log 3');

    const childLogger1 = logger.child({ logPrefix: 'child1' });
    childLogger1.info('child log 1');
    childLogger1.info('child log 2');

    const grandChild1 = childLogger1.child({ logPrefix: 'grandchild1' });
    grandChild1.info('grandchild info 1');
    grandChild1.info('grandchild info 2');

    const childLogger2 = logger.child({ logPrefix: 'child2' });
    childLogger2.info('child2 log 1');
    childLogger2.log({ level: LogLevel.Silly, message: 'child2 log 2' });
    childLogger2.log({ level: LogLevel.Verbose, message: 'child2 log 2' });
    childLogger2.debug({ level: LogLevel.Debug, message: 'child2 log 2' });

    const childLogger3 = logger.child({ logPrefix: 'child3' });
    childLogger3.info('child2 log 1');
    childLogger3.log({ level: LogLevel.Silly, message: 'child2 log 2' });
    childLogger3.log({ level: LogLevel.Verbose, message: 'child2 log 2' });
    childLogger3.debug({ level: LogLevel.Debug, message: 'child2 log 2' });

    logger.info('app log 1');
    logger.info('app log 2');
    logger.info('app log 3');
}

main();

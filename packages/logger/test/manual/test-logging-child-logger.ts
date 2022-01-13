import { LogLevel, ToolsLogger } from '../../src';
import { ConsoleTransport, FileTransport, NullTransport } from '../../src/transports';

function main() {
    const logger = new ToolsLogger({
        logLevel: LogLevel.Debug,
        logPrefix: 'app',
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
}

main();

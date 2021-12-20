import { getExtendedLogger, Logger } from '../../src/utils';
import { migrateSystemsToHybridStore } from '../../src/services/system-migration';

async function main(): Promise<void> {
    const logger: Logger = getExtendedLogger(console);
    await migrateSystemsToHybridStore(logger);
}

if (require.main === module) {
    main();
}

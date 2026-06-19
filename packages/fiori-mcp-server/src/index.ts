#!/usr/bin/env node

import { parseCliArgs } from './cli.js';
import { PACKAGE_VERSION } from './package-info.js';

const cli = parseCliArgs(process.argv.slice(2), PACKAGE_VERSION);

if (cli.action === 'exit') {
    if (cli.stdout) {
        process.stdout.write(cli.stdout);
    }
    if (cli.stderr) {
        process.stderr.write(cli.stderr);
    }
    process.exit(cli.exitCode);
} else {
    const [{ FioriFunctionalityServer }, { logger }] = await Promise.all([
        import('./server.js'),
        import('./utils/logger.js')
    ]);

    const server = new FioriFunctionalityServer();
    try {
        await server.run();
    } catch (error) {
        logger.error(`Server error: ${error}`);
    }
}

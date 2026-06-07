#!/usr/bin/env node

import { FioriFunctionalityServer } from './server.js';
import { logger } from './utils/logger.js';
import { handleCliInfoFlags } from './cli.js';

if (!handleCliInfoFlags()) {
    const server = new FioriFunctionalityServer();
    try {
        await server.run();
    } catch (error) {
        logger.error(`Server error: ${error}`);
    }
}

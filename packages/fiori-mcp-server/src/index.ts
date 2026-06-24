#!/usr/bin/env node

import { FioriFunctionalityServer } from './server.js';
import { logger } from './utils/logger.js';

const server = new FioriFunctionalityServer();
try {
    await server.run();
    logger.info('Fiori MCP Server started successfully.');
} catch (error) {
    logger.error(`Server error: ${error}`);
}

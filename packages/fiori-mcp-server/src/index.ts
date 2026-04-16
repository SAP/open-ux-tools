#!/usr/bin/env node

import { FioriFunctionalityServer } from './server.js';
import { logger } from './utils/logger.js';

const server = new FioriFunctionalityServer();
server.run().catch((error) => logger.error(`Server error: ${error}`));

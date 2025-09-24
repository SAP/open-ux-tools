#!/usr/bin/env node

import { FioriFunctionalityServer } from './server';
import { logger } from './utils/logger';

const server = new FioriFunctionalityServer();
server.run().catch((error) => logger.error(`Server error: ${error}`));

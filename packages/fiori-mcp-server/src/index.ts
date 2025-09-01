#!/usr/bin/env node

import { FioriFunctionalityServer } from './server';

const server = new FioriFunctionalityServer();
server.run().catch(console.error);

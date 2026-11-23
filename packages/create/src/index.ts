#!/usr/bin/env node
import { handleCreateFioriCommand } from './cli/index.js';

// Use top-level await since handleCreateFioriCommand is now async (for i18n init)
await handleCreateFioriCommand(process.argv);

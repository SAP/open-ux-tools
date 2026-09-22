#!/usr/bin/env node

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { executeCaptureAppCommand } from './lib/capture-app.mjs';

function isMainModule() {
    try {
        return (
            Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
        );
    } catch {
        return false;
    }
}

if (isMainModule()) {
    executeCaptureAppCommand(process.argv.slice(2))
        .then((summary) => process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`))
        .catch((error) => {
            process.stderr.write(
                `MockGen capture failed: ${error instanceof Error ? error.message : 'unknown error'}\n`
            );
            process.exitCode = 1;
        });
}

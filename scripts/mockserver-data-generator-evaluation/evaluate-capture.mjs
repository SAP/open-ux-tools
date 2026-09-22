#!/usr/bin/env node

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { executeEvaluateCaptureCommand } from './lib/evaluate-capture.mjs';

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
    executeEvaluateCaptureCommand(process.argv.slice(2))
        .then((summary) => {
            process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
            if (!summary.passed) process.exitCode = 1;
        })
        .catch((error) => {
            process.stderr.write(
                `MockGen capture evaluation failed: ${error instanceof Error ? error.message : 'unknown error'}\n`
            );
            process.exitCode = 1;
        });
}

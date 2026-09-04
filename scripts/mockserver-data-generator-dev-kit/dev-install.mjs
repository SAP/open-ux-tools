#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDevKit } from './build-dev-kit.mjs';

function readOption(argv, name) {
    const index = argv.indexOf(name);
    return index < 0 ? undefined : argv[index + 1];
}

/**
 * Build current packages and install them into an existing Fiori application.
 *
 * @param {string[]} argv command-line arguments
 */
export function devInstall(argv) {
    const appRoot = readOption(argv, '--app');
    const hostRoot = readOption(argv, '--host-root');
    if (!appRoot || !hostRoot) {
        throw new Error(
            'Usage: dev-install.mjs --app <absolute-path> --host-root <absolute-path> [--dry-run|--offline]'
        );
    }
    const temporaryRoot = mkdtempSync(join(tmpdir(), 'mockserver-data-generator-direct-install-'));
    try {
        const outputDirectory = join(temporaryRoot, 'output');
        const extractDirectory = join(temporaryRoot, 'extracted');
        mkdirSync(outputDirectory, { recursive: true });
        mkdirSync(extractDirectory, { recursive: true });
        const report = buildDevKit({
            hostRoot,
            outDir: outputDirectory,
            requireClean: argv.includes('--require-clean')
        });
        execFileSync('tar', ['-xzf', report.archivePath, '-C', extractDirectory], { stdio: 'inherit' });
        const kitRoot = join(extractDirectory, basename(report.archivePath, '.tgz'));
        const installerArgs = [join(kitRoot, 'setup-local-fiori-app.mjs'), '--app', appRoot, '--kit-root', kitRoot];
        for (const flag of ['--dry-run', '--offline', '--restore', '--verify']) {
            if (argv.includes(flag)) {
                installerArgs.push(flag);
            }
        }
        for (const option of ['--model-manifest', '--model-cache']) {
            const value = readOption(argv, option);
            if (value) {
                installerArgs.push(option, value);
            }
        }
        execFileSync(process.execPath, installerArgs, { stdio: 'inherit' });
    } finally {
        rmSync(temporaryRoot, { recursive: true, force: true });
    }
}

if (process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])) {
    try {
        devInstall(process.argv.slice(2));
    } catch (error) {
        process.stderr.write(
            `MockGen direct install failed: ${error instanceof Error ? error.message : String(error)}\n`
        );
        process.exitCode = 1;
    }
}

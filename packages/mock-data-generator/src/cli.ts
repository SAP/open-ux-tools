#!/usr/bin/env node

import { readFile, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConsoleTransport, ToolsLogger, type Logger } from '@sap-ux/logger';
import { generateProjectData } from './project-data.js';
import { parseGenerateProjectDataInput } from './project-data-input.js';
import { getMockDataGeneratorInfo } from './standalone.js';
import type { GenerateProjectDataInput } from './project-data.js';
import { errorMessage } from './guards.js';
import { MOCKGEN_ERROR_CODE, MockGenError } from './errors.js';
import { t } from './i18n.js';

function commandOptions(args: readonly string[]): Map<string, string> {
    const values = new Map<string, string>();
    for (let index = 0; index < args.length; index += 2) {
        const name = args[index];
        const value = args[index + 1];
        if (!name?.startsWith('--') || !value || value.startsWith('--') || values.has(name)) {
            throw new MockGenError(MOCKGEN_ERROR_CODE.CLI_USAGE, t('cli.uniqueOptions'));
        }
        values.set(name, value);
    }
    return values;
}

async function readRequestDocument(inputPath: string): Promise<GenerateProjectDataInput> {
    let document: unknown;
    try {
        document = JSON.parse(await readFile(inputPath, 'utf8'));
    } catch (error) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.FILE_UNREADABLE,
            t('cli.requestDocumentUnreadable', { path: inputPath, reason: errorMessage(error) }),
            { cause: error }
        );
    }
    return parseGenerateProjectDataInput(document);
}

/**
 * The CLI's logger: messages for people go to the console through `@sap-ux/logger`, as in the other
 * `@sap-ux` command-line tools. Standard output carries the command's JSON result only when the command
 * succeeds (exit code 0); a failure logs its message and exits with code 1 without a result.
 *
 * @returns the console logger
 */
export function createCliLogger(): Logger {
    return new ToolsLogger({ logPrefix: 'mockgen', transports: [new ConsoleTransport()] });
}

/**
 * Run one CLI command. The command's result is one JSON document on standard output, so it stays
 * machine-readable; messages for people go through the logger.
 *
 * @param args command-line arguments after the executable
 * @param logger where messages for people go
 * @returns the process exit code
 */
async function runCommand(args: readonly string[], logger: Logger): Promise<number> {
    if (args.length === 1 && (args[0] === 'help' || args[0] === '--help')) {
        logger.info(t('cli.usage'));
        return 0;
    }
    if (args.length === 1 && args[0] === 'info') {
        process.stdout.write(`${JSON.stringify(getMockDataGeneratorInfo())}\n`);
        return 0;
    }
    if (args[0] !== 'generate') {
        throw new MockGenError(MOCKGEN_ERROR_CODE.CLI_USAGE, t('cli.usage'));
    }
    const options = commandOptions(args.slice(1));
    if (options.size !== 1 || !options.has('--input')) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.CLI_USAGE, t('cli.generateUsage'));
    }
    const inputPath = resolve(options.get('--input') ?? '');
    const input = await readRequestDocument(inputPath);
    const generated = await generateProjectData(input);
    process.stdout.write(
        `${JSON.stringify({
            files: generated.files,
            executionMode: generated.generation.executionMode,
            validation: generated.generation.validation,
            fingerprints: generated.generation.fingerprints
        })}\n`
    );
    return 0;
}

/**
 * Run the opt-in standalone CLI; the application mockserver is never modified by this command. A failure
 * is logged as an error through the logger and rethrown, so the caller decides the exit code.
 *
 * @param args command-line arguments after the executable: `help`, `info` or `generate --input <request.json>`
 * @param logger where messages for people go; the console logger by default
 * @returns the process exit code
 * @throws {MockGenError} for a usage error, an unreadable or invalid request document, or a failed generation
 * @example
 * process.exitCode = await runMockgenCli(['generate', '--input', 'request.json']);
 */
export async function runMockgenCli(args: readonly string[], logger: Logger = createCliLogger()): Promise<number> {
    try {
        return await runCommand(args, logger);
    } catch (error) {
        logger.error(errorMessage(error));
        throw error;
    }
}

const modulePath = fileURLToPath(import.meta.url);
if (
    process.argv[1] &&
    (resolve(process.argv[1]) === modulePath ||
        (await realpath(process.argv[1]).catch((): undefined => undefined)) === modulePath)
) {
    runMockgenCli(process.argv.slice(2)).catch(() => {
        // runMockgenCli has logged the failure.
        process.exitCode = 1;
    });
}

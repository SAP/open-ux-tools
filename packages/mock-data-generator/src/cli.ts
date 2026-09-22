#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateProjectData } from './project-data.js';
import { getMockDataGeneratorInfo } from './standalone.js';
import type { GenerateProjectDataInput } from './project-data.js';

function commandOptions(args: readonly string[]): Map<string, string> {
    const values = new Map<string, string>();
    for (let index = 0; index < args.length; index += 2) {
        const name = args[index];
        const value = args[index + 1];
        if (!name?.startsWith('--') || !value || value.startsWith('--') || values.has(name)) {
            throw new TypeError('MockGen requires unique --name value options');
        }
        values.set(name, value);
    }
    return values;
}

/**
 * Run the opt-in standalone CLI; the application mockserver is never modified by this command.
 *
 * @param args
 */
export async function runMockgenCli(args: readonly string[]): Promise<number> {
    if (args.length === 1 && args[0] === 'info') {
        process.stdout.write(`${JSON.stringify(getMockDataGeneratorInfo())}\n`);
        return 0;
    }
    if (args[0] !== 'generate') {
        throw new TypeError('Usage: mockgen info | mockgen generate --input <request.json>');
    }
    const options = commandOptions(args.slice(1));
    if (options.size !== 1 || !options.has('--input')) {
        throw new TypeError('Usage: mockgen generate --input <request.json>');
    }
    const inputPath = resolve(options.get('--input') ?? '');
    const input = JSON.parse(await readFile(inputPath, 'utf8')) as GenerateProjectDataInput;
    const generated = await generateProjectData(input);
    process.stdout.write(
        `${JSON.stringify({
            files: generated.files,
            executionMode: generated.generation.executionMode,
            validation: generated.generation.validation,
            realismReady: generated.generation.realismReady,
            fingerprints: generated.generation.fingerprints
        })}\n`
    );
    return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    runMockgenCli(process.argv.slice(2)).catch((error: unknown) => {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
    });
}

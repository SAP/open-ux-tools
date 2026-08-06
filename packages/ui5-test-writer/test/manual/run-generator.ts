/**
 * Manual testing script — runs generateOPAFiles on a given project path and writes the output to disk.
 *
 * IMPORTANT: This script imports from `../../dist`, so the package must be built first.
 * Run `pnpm build` (or `pnpm --filter @sap-ux/ui5-test-writer build`) before invoking,
 * and rebuild whenever `src/` changes.
 *
 * Usage:
 *   node --loader ts-node/esm run-generator.ts <project-path> [metadata-path]
 *   # or, after build, plain ts-node also works since the import resolves to dist:
 *   npx ts-node --esm run-generator.ts <project-path> [metadata-path]
 *
 * Examples:
 *   npx ts-node --esm run-generator.ts test/test-input/test.sample.mdsk.v4
 *   npx ts-node --esm run-generator.ts test/test-input/LROPv4
 *   npx ts-node --esm run-generator.ts test/test-input/LROPv4 test/test-input/LROPv4/webapp/localService/mainService/metadata.xml
 *
 * If metadata-path is not provided, the script looks for webapp/localService/mainService/metadata.xml
 * inside the project path.
 */

import { resolve, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { generateOPAFiles } from '../../dist/fiori-elements-opa-writer.js';

const projectPath = process.argv[2];
if (!projectPath) {
    console.error('Usage: npx ts-node run-generator.ts <project-path> [metadata-path]');
    process.exit(1);
}

const absProjectPath = resolve(projectPath);
if (!existsSync(absProjectPath)) {
    console.error(`Project path does not exist: ${absProjectPath}`);
    process.exit(1);
}

const metadataArg = process.argv[3];
const metadataPath = metadataArg
    ? resolve(metadataArg)
    : join(absProjectPath, 'webapp', 'localService', 'mainService', 'metadata.xml');

let metadata: string | undefined;
if (existsSync(metadataPath)) {
    metadata = readFileSync(metadataPath, 'utf8');
    console.log(`Metadata loaded from: ${metadataPath}`);
} else {
    console.log(`No metadata found at: ${metadataPath} — running without metadata`);
}

const logger = {
    debug: (...args: unknown[]) => console.log('[DEBUG]', ...args),
    info: (...args: unknown[]) => console.log('[INFO]', ...args),
    warn: (...args: unknown[]) => console.log('[WARN]', ...args),
    error: (...args: unknown[]) => console.error('[ERROR]', ...args)
};

async function main(): Promise<void> {
    console.log(`\nRunning generateOPAFiles on: ${absProjectPath}\n`);

    const standalone = process.argv.includes('--standalone');

    const editor = await generateOPAFiles(
        absProjectPath,
        {},
        metadata,
        undefined,
        logger as Parameters<typeof generateOPAFiles>[4],
        standalone
    );

    await new Promise<void>((resolvePromise, reject) => {
        editor.commit([], (err?: Error | null) => {
            if (err) {
                reject(err);
            } else {
                resolvePromise();
            }
        });
    });

    console.log('\nDone. Generated files written to disk.');
}

main().catch((err) => {
    console.error('Generation failed:', err);
    process.exit(1);
});

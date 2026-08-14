import type { Command } from 'commander';
import { createApplicationAccess, getMinUI5VersionAsArray } from '@sap-ux/project-access';
import { generateOPAFiles } from '@sap-ux/ui5-test-writer';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing/index.js';
import { validateBasePath } from '../../validation/index.js';

/**
 * Add the "generate opa-tests" command to a passed command.
 *
 * @param cmd - commander command for generating OPA tests
 */
export function addGenerateOpaTestsCommand(cmd: Command): void {
    cmd.command('opa-tests [path]')
        .description(
            `Generate OPA5 integration tests for an existing SAP Fiori elements (OData V4) application.\n
Example:
    \`npx --yes @sap-ux/create@latest generate opa-tests\``
        )
        .option(
            '-t, --typescript',
            'Force generation of TypeScript test files. Otherwise, TypeScript is auto-detected from the presence of a `tsconfig.json`.'
        )
        .option('-s, --simulate', 'Simulate only. Do not write. Also, sets `--verbose`')
        .option('-v, --verbose', 'Show verbose information.')
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            await generateOpaTests(path || process.cwd(), !!options.simulate, !!options.typescript);
        });
}

/**
 * Generates OPA5 integration tests for an existing Fiori elements application.
 *
 * @param basePath - path to the application root
 * @param simulate - if true, do not write but just show what would be changed; otherwise write
 * @param forceTypeScript - if true, force TypeScript test files instead of auto-detecting
 */
async function generateOpaTests(basePath: string, simulate: boolean, forceTypeScript: boolean): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called generate opa-tests for path '${basePath}', simulate is '${simulate}'`);
        await validateBasePath(basePath);

        const appAccess = await createApplicationAccess(basePath);
        const manifest = await appAccess.readManifest();
        const versions = getMinUI5VersionAsArray(manifest);
        const ui5Version = versions.find((v) => v.startsWith('1.')) ?? versions[0] ?? '';

        const fs = await generateOPAFiles(
            basePath,
            {
                ...(forceTypeScript ? { enableTypeScript: true } : {}),
                ...(ui5Version ? { ui5Version } : {})
            },
            undefined,
            undefined,
            logger,
            true
        );

        if (!simulate) {
            await new Promise<void>((resolve) => fs.commit(resolve));
            logger.info(`Changes written.`);
        } else {
            await traceChanges(fs);
        }
    } catch (error) {
        logger.error(`Error while executing generate opa-tests '${(error as Error).message}'`);
        logger.debug(error as Error);
    }
}

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Packument } from '@npm/types';
import { ToolsLogger } from '@sap-ux/logger';

/**
 * Fetch the README of a specified npm package.
 *
 * @param packageName - The name of the npm package.
 * @param logger - Logger instance for logging messages.
 * @returns A promise that resolves to the README content or null.
 * @throws Error if the fetch operation fails.
 */
async function getPackageReadme(packageName: string, logger: ToolsLogger): Promise<string | null> {
    // Handle scoped packages by URL-encoding the slash
    const encodedName: string = packageName.replaceAll('/', '%2F');
    const url = `https://registry.npmjs.org/${encodedName}`;
    try {
        const response: Response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch package: ${response.statusText}`);
        }
        const data: Packument = await response.json();
        if (!data.readme) {
            logger.warn(`Warning: Could not find README content for ${packageName}.`);
            return null;
        }
        return data.readme;
    } catch (error) {
        throw new Error(`Error fetching README for ${packageName}: ${error.message ?? error}`);
    }
}

/**
 * Enhance README content by adding a separator before each chapter (#) and subchapter (##).
 *
 * @param content - The original README content.
 * @returns The enhanced README content.
 */
function enhanceReadmeContent(content: string): string {
    return content.replaceAll(/^(?!(?:-){32,}\n)(#{1,2} [^\n]*)/gm, '\n--------------------------------\n$1');
}

/**
 * Fetch the README for a package from npmjs.org and saves it to a local file.
 *
 * @param packageName - The name of the npm package.
 * @param logger - Logger instance for logging messages.
 */
async function fetchAndSaveReadme(packageName: string, logger: ToolsLogger): Promise<void> {
    logger.info(`Fetching README for ${packageName}...`);
    const readmeContent: string | null = await getPackageReadme(packageName, logger);
    const outputFileName = `${packageName.split('/').pop()}-README.md`;
    if (readmeContent) {
        try {
            const outputPath = join('data_local', outputFileName);
            await writeFile(outputPath, enhanceReadmeContent(readmeContent), 'utf-8');
            logger.info(`Successfully saved README to './data_local'`);
        } catch (error) {
            logger.error(`Error writing README file for ${outputFileName}: ${error}`);
            process.exit(1);
        }
    } else {
        logger.error(`Could not fetch README for ${packageName}.`);
        process.exit(1);
    }
}

const packageName: string | undefined = process.argv[2];
const logger = new ToolsLogger();

//prettier-ignore
export const execution = (async () => { //NOSONAR
    if (packageName) {
        await fetchAndSaveReadme(packageName, logger);
    } else {
        logger.error('Please provide a package name as an argument.');
        process.exit(1);
    }
})();

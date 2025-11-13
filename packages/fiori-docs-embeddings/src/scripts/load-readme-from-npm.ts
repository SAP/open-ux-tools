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
            logger.error(`Failed to fetch package: ${response.statusText}.`);
            return null;
        }
        const data: Packument = await response.json();
        if (!data.readme) {
            logger.error(`Could not find README content for ${packageName}.`);
            return null;
        }
        return data.readme;
    } catch (error) {
        logger.error(`Error fetching README for ${packageName}: ${error.message ?? error}`);
        return null;
    }
}

/**
 * Fetch the README for a package from npmjs.org and saves it to a local file.
 *
 * @param packageName - The name of the npm package.
 * @param logger - Logger instance for logging messages.
 */
async function fetchAndSaveReadme(packageName: string, logger: ToolsLogger): Promise<void> {
    logger.info(`Fetching README for ${packageName}...`);
    const readmeContent = await getPackageReadme(packageName, logger);
    if (readmeContent) {
        const outputFileName = `${packageName.split('/').pop()}-README.md`;
        try {
            const outputPath = join('data_local', outputFileName);
            await writeFile(outputPath, readmeContent, 'utf-8');
            logger.info(`Successfully saved README to './data_local'`);
        } catch (error) {
            logger.error(`Error writing README file for ${outputFileName}: ${error}.`);
        }
    } else {
        logger.error(`Could not fetch README for ${packageName}.`);
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

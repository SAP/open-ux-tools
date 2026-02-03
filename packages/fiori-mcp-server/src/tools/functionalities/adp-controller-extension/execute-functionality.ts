import type { ExecuteFunctionalityInput, ExecuteFunctionalityOutput } from '../../../types';
import { promises as FSpromises } from 'node:fs';
import { join, dirname, relative, isAbsolute, resolve, sep } from 'node:path';
import { validateWithSchema } from '../../../utils';
import { logger } from '../../../utils/logger';
import { AdpControllerExtensionSchema } from './schema';
import {
    extractFilesFromResponse,
    isChangeFile,
    isAdaptationProject,
    readManifestVariant,
    getProjectFolderName
} from './utils';

/**
 * Executes the ADP controller extension functionality.
 * Processes AI-generated controller extensions and fragments for adaptation projects.
 *
 * @param input - The input parameters for executing the functionality.
 * @returns A promise that resolves to the execution output.
 */
export default async function executeFunctionality(
    input: ExecuteFunctionalityInput
): Promise<ExecuteFunctionalityOutput> {
    const { parameters, appPath } = input;

    // Validate input parameters
    const validatedParams = validateWithSchema(AdpControllerExtensionSchema, parameters);
    const { prompt, aiResponse, viewId: _viewId, controllerName: _controllerName } = validatedParams;

    logger.info(`Executing ADP controller extension functionality for: ${prompt}`);

    // 1. Validate adaptation project
    if (!isAdaptationProject(appPath)) {
        throw new Error(
            'This functionality is only available for adaptation projects. Please ensure manifest.appdescr_variant exists in the webapp folder.'
        );
    }

    // 2. Read manifest.appdescr_variant
    let variant;
    try {
        variant = await readManifestVariant(appPath);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to read manifest.appdescr_variant: ${errorMessage}`);
    }

    const layer = variant.layer ?? '';
    const variantId = variant.id ?? '';
    logger.debug(`Manifest variant - layer: ${layer}, id: ${variantId}`);

    // 3. Extract project folder name
    const projectFolderName = getProjectFolderName(appPath);
    logger.debug(`Project folder name: ${projectFolderName}`);

    const changes: string[] = [];

    // 4. Process AI response if provided
    if (aiResponse && typeof aiResponse === 'string') {
        logger.info('Processing AI response to extract files');
        const extractedFiles = extractFilesFromResponse(aiResponse);
        logger.info(`Extracted ${extractedFiles.length} files from AI response`);

        // 5. Filter out change files and write other files
        for (const file of extractedFiles) {
            let normalizedPath = file.path.replace(/\\/g, '/');

            // Convert absolute path to relative path if it's within appPath
            if (isAbsolute(normalizedPath)) {
                // Resolve both paths to ensure they're properly normalized
                const resolvedAppPath = resolve(appPath);
                const resolvedFilePath = resolve(normalizedPath);

                // Check if the file path is within the app path
                // Use path separator to ensure we match at directory boundaries
                const appPathWithSep = resolvedAppPath.endsWith(sep) ? resolvedAppPath : resolvedAppPath + sep;
                if (resolvedFilePath.startsWith(appPathWithSep) || resolvedFilePath === resolvedAppPath) {
                    // Convert to relative path
                    normalizedPath = relative(resolvedAppPath, resolvedFilePath);
                    logger.debug(`Converted absolute path ${resolvedFilePath} to relative: ${normalizedPath}`);
                } else {
                    // Absolute path outside appPath - this is an error
                    logger.error(`File path ${normalizedPath} is outside app path ${appPath}`);
                    throw new Error(`File path ${normalizedPath} is outside the application path ${appPath}`);
                }
            }

            // Skip change files
            if (isChangeFile(normalizedPath)) {
                logger.debug(`Skipping change file: ${normalizedPath}`);
                continue;
            }

            // Write the file
            try {
                const fullPath = join(appPath, normalizedPath);
                const fileDir = dirname(fullPath);

                // Ensure directory exists
                await FSpromises.mkdir(fileDir, { recursive: true });

                // Write file
                await FSpromises.writeFile(fullPath, file.code, 'utf-8');
                changes.push(`Created ${normalizedPath}`);
                logger.info(`Created file: ${normalizedPath} at ${fullPath}`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger.error(`Failed to write file ${normalizedPath}: ${errorMessage}`);
                throw new Error(`Failed to write file ${normalizedPath}: ${errorMessage}`);
            }
        }
    } else {
        // If no AI response provided, just validate the project setup
        logger.info('No AI response provided, validating adaptation project setup only');
        changes.push('Adaptation project validated successfully');
    }

    const status = changes.length > 0 ? 'success' : 'skipped';
    const message =
        changes.length > 0
            ? `Successfully processed ${changes.length} file(s) for ADP controller extension`
            : 'No files were processed. Provide aiResponse parameter with code blocks to generate files.';

    return {
        functionalityId: input.functionalityId,
        status,
        message,
        parameters: parameters,
        appPath: appPath,
        changes,
        timestamp: new Date().toISOString()
    };
}

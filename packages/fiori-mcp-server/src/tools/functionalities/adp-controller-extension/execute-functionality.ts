import type { ExecuteFunctionalityInput, ExecuteFunctionalityOutput } from '../../../types';
import { promises as FSpromises } from 'node:fs';
import { join, dirname, relative, isAbsolute, resolve, sep } from 'node:path';
import { logger } from '../../../utils/logger';
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
    // Safely extract parameters - handle case where parameters might be undefined or null
    const parameters = input?.parameters ?? {};
    const { appPath, functionalityId } = input;

    // Extract parameters directly without strict validation
    const prompt = parameters?.prompt;
    const aiResponse = parameters?.aiResponse;

    if (!prompt || !aiResponse) {
        return {
            functionalityId,
            status: 'error',
            message: 'No prompt or aiResponse provided',
            parameters: input,
            appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }

    logger.info(`Executing ADP controller extension functionality for: ${prompt ?? 'unknown'}`);

    // 1. Validate adaptation project
    if (!isAdaptationProject(appPath)) {
        const errorMessage =
            'This functionality is only available for adaptation projects. Please ensure manifest.appdescr_variant exists in the webapp folder.';
        logger.error(errorMessage);
        return {
            functionalityId,
            status: 'error',
            message: errorMessage,
            parameters,
            appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }

    // 2. Read manifest.appdescr_variant
    let variant;
    try {
        variant = await readManifestVariant(appPath);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const fullErrorMessage = `Failed to read manifest.appdescr_variant: ${errorMessage}`;
        logger.error(fullErrorMessage);
        return {
            functionalityId,
            status: 'error',
            message: fullErrorMessage,
            parameters,
            appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }

    const layer = variant.layer ?? '';
    const variantId = variant.id ?? '';
    logger.debug(`Manifest variant - layer: ${layer}, id: ${variantId}`);

    // 3. Extract project folder name
    const projectFolderName = getProjectFolderName(appPath);
    logger.debug(`Project folder name: ${projectFolderName}`);

    const changes: string[] = [];

    // 4. Process AI response if provided
    if (aiResponse && typeof aiResponse === 'string' && aiResponse.trim().length > 0) {
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
                    const errorMessage = `File path ${normalizedPath} is outside the application path ${appPath}`;
                    logger.error(errorMessage);
                    return {
                        functionalityId,
                        status: 'error',
                        message: errorMessage,
                        parameters,
                        appPath,
                        changes: [],
                        timestamp: new Date().toISOString()
                    };
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
                logger.info(`Created file: ${normalizedPath}`);

                changes.push(`Created ${normalizedPath}`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                const fullErrorMessage = `Failed to write file ${normalizedPath}: ${errorMessage}`;
                logger.error(fullErrorMessage);
                return {
                    functionalityId,
                    status: 'error',
                    message: fullErrorMessage,
                    parameters,
                    appPath,
                    changes,
                    timestamp: new Date().toISOString()
                };
            }
        }
    } else {
        // If no AI response provided, return an error
        return {
            functionalityId,
            status: 'error',
            message:
                'No aiResponse provided or aiResponse is empty. Please provide aiResponse parameter with code blocks containing **Path:** markers.',
            parameters,
            appPath,
            changes: ['Adaptation project validated successfully'],
            timestamp: new Date().toISOString()
        };
    }

    // Count actual file creations (exclude validation message)
    const fileCreations = changes.filter((c) => c.startsWith('Created '));
    let status: string;
    let message: string;
    if (fileCreations.length > 0) {
        status = 'success';
        message = `Successfully processed ${fileCreations.length} file(s) for ADP controller extension`;
    } else if (changes.length > 0) {
        status = 'success';
        message =
            'Adaptation project validated successfully, but no files were created. Provide aiResponse parameter with code blocks to generate files.';
    } else {
        status = 'skipped';
        message = 'No files were processed. Provide aiResponse parameter with code blocks to generate files.';
    }

    return {
        functionalityId: input.functionalityId,
        status,
        message,
        parameters: input?.parameters ?? parameters,
        appPath: appPath,
        changes,
        timestamp: new Date().toISOString()
    };
}

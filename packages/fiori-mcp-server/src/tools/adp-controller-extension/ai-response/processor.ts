import type { AdpControllerExtensionOutput } from '../../../types/index.js';
import { logger } from '../../../utils/logger.js';
import { extractFilesFromResponse, isChangeFile } from './parser.js';
import { PathTraversalError, writeExtractedFile } from './writer.js';

/**
 * Persists every file extracted from `aiResponse`. Skips `.change` files and
 * stops at the first error, returning whatever changes succeeded so far in
 * the response envelope.
 *
 * @param appPath Adaptation project root directory.
 * @param aiResponse Raw AI response with `**Path:**` markers and code fences.
 * @returns Tool output envelope with `success`, `error`, or `skipped` status.
 */
export async function processAiResponse(appPath: string, aiResponse: string): Promise<AdpControllerExtensionOutput> {
    logger.info('Processing AI response to extract files');
    const extractedFiles = extractFilesFromResponse(aiResponse);
    if (extractedFiles.length === 0) {
        logger.warn(
            'No code blocks with **Path:** markers found in aiResponse — response may be malformed or contain no files'
        );
    } else {
        logger.info(`Extracted ${extractedFiles.length} files from AI response`);
    }

    const changes: string[] = [];

    for (const file of extractedFiles) {
        if (isChangeFile(file.path)) {
            logger.debug(`Skipping change file: ${file.path}`);
            continue;
        }

        try {
            const relativePath = await writeExtractedFile(appPath, file);
            changes.push(`Created ${relativePath}`);
        } catch (error) {
            if (error instanceof PathTraversalError) {
                logger.error(error.message);
                return { status: 'Error', message: error.message, appPath, changes: [] };
            }
            const message = `Failed to write file ${file.path}: ${
                error instanceof Error ? error.message : String(error)
            }`;
            logger.error(message);
            return { status: 'Error', message, appPath, changes };
        }
    }

    if (changes.length > 0) {
        return {
            status: 'Success',
            message: `Successfully processed ${changes.length} file(s) for ADP controller extension`,
            appPath,
            changes
        };
    }

    return {
        status: 'Skipped',
        message: 'No files were processed. Provide aiResponse parameter with code blocks to generate files.',
        appPath,
        changes
    };
}

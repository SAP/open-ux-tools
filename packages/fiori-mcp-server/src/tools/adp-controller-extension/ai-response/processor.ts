import type { AdpControllerExtensionInput, ExecuteFunctionalityOutput } from '../../../types/index.js';
import { logger } from '../../../utils/logger.js';
import { buildOutput } from '../output.js';
import { extractFilesFromResponse, isChangeFile } from './parser.js';
import { PathTraversalError, writeExtractedFile } from './writer.js';

/**
 * Returns the input parameters with `aiResponse` stripped, so the tool
 * envelope echoed to the caller stays compact.
 *
 * @param params Input parameters.
 * @returns Echoable parameters without the (potentially large) AI response.
 */
function echoableParams(params: AdpControllerExtensionInput): Record<string, unknown> {
    const { aiResponse: _aiResponse, ...rest } = params;
    return rest;
}

/**
 * Persists every file extracted from `aiResponse`. Skips `.change` files and
 * stops at the first error, returning whatever changes succeeded so far in
 * the response envelope.
 *
 * @param appPath Adaptation project root directory.
 * @param aiResponse Raw AI response with `**Path:**` markers and code fences.
 * @param params Input parameters used to build the response envelope.
 * @returns Tool output envelope with `success`, `error`, or `skipped` status.
 */
export async function processAiResponse(
    appPath: string,
    aiResponse: string,
    params: AdpControllerExtensionInput
): Promise<ExecuteFunctionalityOutput> {
    logger.info('Processing AI response to extract files');
    const extractedFiles = extractFilesFromResponse(aiResponse);
    logger.info(`Extracted ${extractedFiles.length} files from AI response`);

    const changes: string[] = [];
    const echo = echoableParams(params);

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
                return buildOutput('error', error.message, appPath, echo);
            }
            const message = `Failed to write file ${file.path}: ${
                error instanceof Error ? error.message : String(error)
            }`;
            logger.error(message);
            return buildOutput('error', message, appPath, echo, changes);
        }
    }

    if (changes.length > 0) {
        return buildOutput(
            'success',
            `Successfully processed ${changes.length} file(s) for ADP controller extension`,
            appPath,
            echo,
            changes
        );
    }
    return buildOutput(
        'skipped',
        'No files were processed. Provide aiResponse parameter with code blocks to generate files.',
        appPath,
        echo,
        changes
    );
}

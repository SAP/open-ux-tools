import type { AdpControllerExtensionInput, ExecuteFunctionalityOutput } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import { processAiResponse } from './ai-response/index.js';
import { buildKnowledgeBaseResponse } from './knowledge-base.js';
import { loadProjectContext, scanExistingProjectFiles } from './project/index.js';

/**
 * Processes AI-generated controller extensions and fragments for SAPUI5
 * Adaptation Projects. When called without `aiResponse`, returns the
 * knowledge base and project context for progressive disclosure; otherwise
 * extracts code blocks from `aiResponse` and writes the files into the
 * project.
 *
 * @param params Input parameters including `appPath`, optional `prompt`,
 *   `aiResponse`, `controllerName`, and `viewId`.
 * @returns The tool execution output envelope.
 */
export async function adpControllerExtension(params: AdpControllerExtensionInput): Promise<ExecuteFunctionalityOutput> {
    const { appPath, prompt, aiResponse } = params;

    if (!appPath) {
        return buildKnowledgeBaseResponse(
            appPath ?? '',
            'Missing required parameter: appPath. Provide the absolute path to the adaptation project root directory.'
        );
    }

    if (aiResponse?.trim()) {
        logger.info(`Executing ADP controller extension functionality for: ${prompt}`);
        return processAiResponse(appPath, aiResponse, params);
    }

    const contextResult = await loadProjectContext(appPath);
    if ('error' in contextResult) {
        return contextResult.error;
    }
    const projectContext = contextResult.context;

    const existingFiles = await scanExistingProjectFiles(appPath);
    logger.debug(`Found ${existingFiles.length} existing project files`);

    const reason = prompt
        ? `Prompt received: "${prompt}"\n\nNo aiResponse provided. Generate the code following the rules below, then call this tool again with the aiResponse parameter.`
        : 'No prompt or aiResponse provided. Provide a prompt describing what to create, generate the code following the rules below, then call this tool again with the aiResponse parameter.';
    return buildKnowledgeBaseResponse(appPath, reason, projectContext, existingFiles);
}

import RepoAppDownloadLogger from './logger.js';
import { t } from './i18n.js';
import type { VSCodeInstance } from '@sap-ux/fiori-generator-shared';
import type { AbapDeployConfig } from '@sap-ux/ui5-config';

/**
 * Context object for the App generation process.
 * Contains the path of the project and the post-generation commands.
 */
export interface RepoAppGenContext {
    // The file path for the generated project
    path: string;
    // The post-generation command to be executed
    postGenCommand: string;
    // The VSCode instance to execute the commands
    vscodeInstance?: VSCodeInstance;
    // Optional deploy config to pass to the post-generation command
    deployConfig?: AbapDeployConfig;
}

/**
 * Executes the post-generation command for the app.
 *
 * @param {RepoAppGenContext} context - The context containing the project path, post-generation command, and optional VSCode instance.
 */
export async function runPostAppGenHook(context: RepoAppGenContext): Promise<void> {
    try {
        // Ensure that context has necessary values before proceeding
        if (!context.vscodeInstance) {
            RepoAppDownloadLogger.logger?.error(t('error.eventHookErrors.vscodeInstanceMissing'));
            return;
        }
        if (!context.postGenCommand || context.postGenCommand.trim() === '') {
            RepoAppDownloadLogger.logger?.error(t('error.eventHookErrors.postGenCommandMissing'));
            return;
        }
        // Execute the post-generation command
        await context.vscodeInstance?.commands?.executeCommand?.(context.postGenCommand, {
            fsPath: context.path,
            deployConfig: context.deployConfig
        });
    } catch (e) {
        RepoAppDownloadLogger.logger?.error(
            t('error.eventHookErrors.commandExecutionFailed', { command: context.postGenCommand, error: e.message })
        );
    }
}

import RepoAppDownloadLogger from './logger';
import { t } from './i18n';
import type { VSCodeInstance } from '@sap-ux/fiori-generator-shared';

/**
 * Context object for the App generation process.
 * Contains the path of the project and the post-generation command.
 */
export interface RepoAppGenContext {
    // The file path for the generated project
    path: string;
    // The post-generation command to be executed
    postGenCommand: string;
    // The VSCode instance to execute the command
    vscodeInstance?: VSCodeInstance;
}

/**
 * Executes the post-generation command for the app.
 * Runs the specified command in the context of the generated project, typically for tasks like refreshing or reloading the project in the editor.
 *
 * @param {RepoAppGenContext} context - The context containing the project path, post-generation command, and optional VSCode instance.
 */
export async function runPostAppGenHook(context: RepoAppGenContext): Promise<void> {
    try {
        // Ensure that context has necessary values before proceeding
        if (!context.vscodeInstance) {
            RepoAppDownloadLogger.logger?.error(t('error.eventHookErrors.vscodeInstanceMissing'));
        }
        if (!context.postGenCommand || context.postGenCommand.trim() === '') {
            RepoAppDownloadLogger.logger?.error(t('error.eventHookErrors.postGenCommandMissing'));
        }
        // Execute the post-generation command
        await context.vscodeInstance?.commands?.executeCommand?.(context.postGenCommand, {
            fsPath: context.path
        });
    } catch (e) {
        RepoAppDownloadLogger.logger?.error(t('error.eventHookErrors.commandExecutionFailed', e.message));
    }
}

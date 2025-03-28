import BspAppDownloadLogger from './logger';
import { t } from './i18n';
import type { VSCodeInstance } from '@sap-ux/fiori-generator-shared';

/**
 * Context object for the BSP App generation process.
 * Contains the path of the project and the post-generation command.
 */
export interface BspAppGenContext {
    // The file path for the generated project
    path: string;
    // The post-generation command to be executed
    postGenCommand: string;
    // The VSCode instance to execute the command
    vscodeInstance?: VSCodeInstance;
}

/**
 * Executes the post-generation command for the BSP app.
 * Runs the specified command in the context of the generated project, typically for tasks like refreshing or reloading the project in the editor.
 *
 * @param {BspAppGenContext} context - The context containing the project path, post-generation command, and optional VSCode instance.
 * @throws {Error} If the VSCode instance or post-generation command is missing from the context.
 */
export async function runPostAppGenHook(context: BspAppGenContext): Promise<void> {
    try {
        // Ensure that context has necessary values before proceeding
        if (!context.vscodeInstance) {
            throw new Error('VSCode instance is missing.');
        }
        if (!context.postGenCommand) {
            throw new Error('Post generation command is missing.');
        }
        // Execute the post-generation command
        await context.vscodeInstance?.commands?.executeCommand?.(context.postGenCommand, {
            fsPath: context.path
        });
    } catch (e) {
        BspAppDownloadLogger.logger.error(t('error.postGenCommand', { error: e }));
    }
}

import { t } from './i18n';
import type { ILogWrapper } from '@sap-ux/fiori-generator-shared';
export interface HookParameters {
    fsPath: string;
}
export interface VSCodeInstance {
    commands: { executeCommand: (command: string, ...rest: any[]) => Promise<void> };
}
export const DEFAULT_POST_APP_GEN_COMMAND = 'sap.ux.application.generated.handler';
export interface GeneratorContext {
    hookParameters: HookParameters;
    vscodeInstance?: VSCodeInstance;
    options?: {
        command?: string;
        [key: string]: unknown;
    };
}

export type Event = 'app-generated';

/**
 * Run the post generation events. This can be used to run any follow up commands.
 *
 * @param event The event to run
 * @param context Additional information required to run the commands
 * @param logger The logger to use
 * @returns
 */
export async function runHooks(event: Event, context: GeneratorContext, logger?: ILogWrapper): Promise<void> {
    if (event === 'app-generated') {
        return postGenerationHook(context, logger);
    } else {
        return Promise.reject(new Error(t('error.unsupportedPostGenerationEvent', { event })));
    }
}

/**
 * Run the commands defined by the GeneratorContext.
 *
 * @param context - information required to run the commands
 * @param logger - the logger to use
 */
async function postGenerationHook(context: GeneratorContext, logger?: ILogWrapper): Promise<void> {
    if (context.vscodeInstance) {
        try {
            const command = context.options?.command ?? DEFAULT_POST_APP_GEN_COMMAND;
            logger?.info(t('logMessages.attemptingToExecutePostGenerationCommand', { command }));
            await context.vscodeInstance.commands?.executeCommand?.(command, context.hookParameters);
        } catch (e) {
            // Log if we can, can't handle exceptions here
            try {
                const warningMsg = e.toString().replace('Error: command', 'Command'); // remove 'Error' from this message
                logger?.warn(warningMsg);
            } catch {
                // }
            }
        }
    }
}

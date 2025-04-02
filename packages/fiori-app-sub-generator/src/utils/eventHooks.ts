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
    options?: { followUpCommand?: string; [key: string]: unknown };
}

export type Event = 'app-generated';

/**
 *
 * @param event
 * @param context
 * @param logger
 * @returns
 */
export async function runHooks(event: Event, context: GeneratorContext, logger?: ILogWrapper): Promise<void> {
    if (event === 'app-generated') {
        return postGenerationHook(context, logger);
    } else {
        return Promise.reject(new Error(t('ERROR_UNRECOGNIZED_EVENT', { event })));
    }
}

/**
 *
 * @param context
 * @param logger
 */
async function postGenerationHook(context: GeneratorContext, logger?: ILogWrapper): Promise<void> {
    if (context.vscodeInstance) {
        try {
            const command = context.options?.followUpCommand ?? DEFAULT_POST_APP_GEN_COMMAND;
            logger?.info(t('INFO_TRYING_TO_EXECUTE_COMMAND', { command }));
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

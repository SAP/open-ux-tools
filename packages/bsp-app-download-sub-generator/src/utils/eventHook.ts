import ReuseLibGenLogger from './logger';
import { t } from './i18n';
import type { VSCodeInstance } from '@sap-ux/fiori-generator-shared';

export interface BspAppGenContext {
    path: string;
    postGenCommand: string;
    vscodeInstance?: VSCodeInstance;
}
export const POST_LIB_GEN_COMMAND = 'sap.ux.library.generated.handler';

/**
 * Executes post app generation command.
 *
 * @param context BspAppGenContext
 */
export async function runPostAppGenHook(context: BspAppGenContext): Promise<void> {
    try {
        await context.vscodeInstance?.commands?.executeCommand?.(context.postGenCommand, {
            fsPath: context.path
        });
    } catch (e) {
        ReuseLibGenLogger.logger.error(t('error.postLibGenHook', { error: e }));
    }
}

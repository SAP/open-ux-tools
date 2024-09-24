import ReuseLibGenLogger from './logger';
import { t } from './i18n';
import type { VSCodeInstance } from '@sap-ux/fiori-generator-shared';

export interface LibContext {
    path: string;
    vscodeInstance?: VSCodeInstance;
}
export const POST_LIB_GEN_COMMAND = 'sap.ux.library.generated.handler';

/**
 * Executes post library generation command : 'sap.ux.library.generated.handler'.
 *
 * @param context LibContext
 */
export async function runPostLibGenHook(context: LibContext): Promise<void> {
    try {
        await context.vscodeInstance?.commands?.executeCommand?.(POST_LIB_GEN_COMMAND, {
            fsPath: context.path
        });
    } catch (e) {
        ReuseLibGenLogger.logger.error(t('error.postLibGenHook', { error: e }));
    }
}

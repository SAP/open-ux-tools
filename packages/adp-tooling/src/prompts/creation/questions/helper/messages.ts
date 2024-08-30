import { t } from '../../../../i18n';
import type ConfigInfoPrompter from '../config';

export const getExtProjectMessage = (projectName: string, prompter: ConfigInfoPrompter) => {
    return prompter.isApplicationSupported && prompter.appIdentifier.appSync
        ? t('prompts.createExtProjectWithSyncViewsLabel', { value: projectName })
        : t('prompts.createExtProjectLabel', { value: projectName });
};

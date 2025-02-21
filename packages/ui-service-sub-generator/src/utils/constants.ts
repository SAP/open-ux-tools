import { t } from './i18n';

export const STEP_SAP_SYSTEM_CONFIG = 'SAP_SYSTEM_CONFIG';
export const STEP_SERVICE_CONFIG = 'SERVICE_CONFIG';
export const prompts = [
    {
        key: STEP_SAP_SYSTEM_CONFIG,
        name: t('LABEL_UI_SERVICE_GEN_SYSTEM_STEP'),
        description: '',
        order: 0
    },
    { key: STEP_SERVICE_CONFIG, name: t('LABEL_UI_SERVICE_GEN_CONFIG_STEP'), description: '', order: 1 }
];

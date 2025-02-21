import type { Prompts, AppWizard } from '@sap-devx/yeoman-ui-types';

export interface UiServiceGenerator {
    appWizard: AppWizard;
    prompts: Prompts;
}

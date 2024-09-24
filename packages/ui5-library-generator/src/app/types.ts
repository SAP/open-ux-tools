import type { AppWizard } from '@sap-devx/yeoman-ui-types';

export interface Options extends LibAnswers {
    // YUI only
    appWizard?: AppWizard;
    skipInstall?: boolean;
}

export interface LibAnswers {
    libraryName?: string;
    namespace?: string;
    targetFolder?: string;
    ui5Version?: string;
    enableTypescript?: boolean;
}

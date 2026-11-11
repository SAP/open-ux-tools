import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { DeploymentGeneratorOptions } from '@sap-ux/deploy-config-generator-shared';

export type CfApprouterGenOptions = DeploymentGeneratorOptions & {
    destinationRoot?: string;
    appWizard?: AppWizard;
    skipInstall?: boolean;
};

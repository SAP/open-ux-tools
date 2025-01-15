import type Generator from 'yeoman-generator';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';

export interface CfApprouterGenOptions extends Generator.GeneratorOptions {
    destinationRoot?: string;
    appWizard?: AppWizard;
    skipInstall?: boolean;
}

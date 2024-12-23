import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { ManifestNamespace } from '@sap-ux/project-access';
import type vscode from 'vscode';
import type Generator from 'yeoman-generator';

export interface FlpConfigOptions extends Generator.GeneratorOptions {
    vscode?: typeof vscode;
    appWizard?: AppWizard;
    destinationRoot?: string;
    launchFlpConfigAsSubGenerator?: boolean;
    inboundConfig: Partial<ManifestNamespace.Inbound[string]>;
    data?: {
        projectRootPath: string;
    };
}

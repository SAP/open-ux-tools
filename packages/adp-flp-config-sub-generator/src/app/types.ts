import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type Generator from 'yeoman-generator';
import type { TelemetryData } from '@sap-ux/fiori-generator-shared';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import type { ManifestNamespace, UI5FlexLayer } from '@sap-ux/project-access';
import type { Prompts } from '@sap-devx/yeoman-ui-types';

export interface FlpConfigOptions extends Generator.GeneratorOptions {
    /**
     * VSCode instance
     */
    vscode?: unknown;
    /**
     * Option to force the conflicter property of the yeoman environment (prevents additional prompt for overwriting files)
     */
    force?: boolean;
    /**
     * AppWizard instance
     */
    appWizard?: AppWizard;
    /**
     * Whether the generator is launched as a subgenerator
     */
    launchAsSubGen?: boolean;
    /**
     * Telemetry data to be send after deployment configuration has been added
     */
    telemetryData?: TelemetryData;
    /**
     * Additional data for the generator
     */
    inbounds: ManifestNamespace.Inbound;
    /**
     * Layer for the FLP configuration
     */
    layer: UI5FlexLayer;
    /**
     * Prompts instance for handling user prompts
     */
    prompts?: Prompts;
    data?: {
        projectRootPath: string;
    };
}

export interface State {
    provider?: AbapServiceProvider;
    credentialsPrompted?: boolean;
}

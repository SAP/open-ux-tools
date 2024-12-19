import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { VSCodeInstance, TelemetryData } from '@sap-ux/fiori-generator-shared';
import type { ManifestNamespace } from '@sap-ux/project-access';

export interface FlpConfigOptions {
    /**
     * VSCode instance
     */
    vscode?: VSCodeInstance;
    /**
     * AppWizard instance
     */
    appWizard?: AppWizard;
    /**
     * Whether the generator is launched as a subgenerator
     */
    launchFlpConfigAsSubGenerator?: boolean;
    /**
     * Path to the application root where the Fiori launchpad configuration will be added.
     */
    appRootPath?: string;
    /**
     * Skips the prompting phase
     */
    skipPrompt?: boolean;
    /**
     * FLP configuration answers
     */
    inboundConfig: Partial<ManifestNamespace.Inbound[string]>;
    /**
     * Option to force the conflicter property of the yeoman environment (prevents additional prompt for overwriting files)
     */
    force?: boolean;
    /**
     * Telemetry data to be send after deployment configuration has been added
     */
    telemetryData?: TelemetryData;
    /**
     * Option to overwrite existing configuration without prompting
     */
    overwrite?: boolean;
    /**
     * Data which may be passed from external sources e.g extensions like Application modeler
     */
    data?: {
        appRootPath: string;
    };
}

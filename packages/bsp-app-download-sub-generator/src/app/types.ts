import type Generator from 'yeoman-generator';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { VSCodeInstance, TelemetryData, LogWrapper } from '@sap-ux/fiori-generator-shared';
import type { promptNames } from '@sap-ux/odata-service-inquirer';
import type { Destination } from '@sap-ux/btp-utils';
import type { BackendSystem } from '@sap-ux/store';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

export interface BspAppDownloadOptions extends Generator.GeneratorOptions {
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
    launchAppDownloaderAsSubGenerator?: boolean; //todo: check this option
    /**
     * Path to the application root where the Fiori launchpad configuration will be added.
     */
    appRootPath?: string;
    /**
     * Telemetry data to be send after deployment configuration has been added
     */
    telemetryData?: TelemetryData;
    /**
     * Logger instance
     */
    logWrapper?: LogWrapper;
}

export interface BspAppDownloadAnswers {
    [promptNames.systemSelection]: SystemSelectionAnswers;
    selectedApp: {
        appId: string;
        title: string;
        description: string;
        repoName: string;
        url: string;
    };
    targetFolder: string;
}

export const PromptNames = {
    selectedApp: 'selectedApp',
    systemSelection: 'systemSelection',
    targetFolder: 'targetFolder'
};

export interface SystemSelectionAnswers {
    /**
     * The connected system will allow downstream consumers to access the connected system without creating new connections.
     *
     */
    connectedSystem?: {
        /**
         * Convienence property to pass the connected system
         */
        serviceProvider: AbapServiceProvider;

        /**
         * The persistable backend system representation of the connected service provider
         * `newOrUpdated` is set to true if the system was newly created or updated during the connection validation process and should be considered for storage.
         */
        backendSystem?: BackendSystem & { newOrUpdated?: boolean };

        /**
         * The destination information for the connected system
         */
        destination?: Destination;
    };
}

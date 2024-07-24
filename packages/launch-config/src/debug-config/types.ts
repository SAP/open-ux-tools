import type { OdataVersion } from '@sap-ux/odata-service-writer';
import type { DatasourceType } from '@sap-ux/odata-service-inquirer';
import { LaunchConfig } from '../types';

export interface LaunchFile {
    version: string;
    configurations: (LaunchConfig)[];
}
// remove this later on if not needed
export interface DebugConfigs {
    liveConfiguration: LaunchConfig;
    localConfiguration: LaunchConfig;
    launchFile: LaunchFile;
    mockConfiguration?: LaunchConfig;
}

// being called from fiori elements and fiori freestyle index.js --- remove this comment later on
export interface LaunchConfigOptions {
    projectPath: string;
    projectName: string;
    datasourceType: DatasourceType;
    odataVersion: OdataVersion;
    sapClientParam: string;
    flpAppId: string;
    flpSandboxAvailable: boolean;
    isFioriElement?: boolean; // todo: deprecate and add `localStartFile` so migrator can pass the start file name directly
    migratorMockIntent?: string;
    isMigrator?: boolean;
}

// export type LaunchConfig = {
//     source: DatasourceType;
//     name: string;
//     targetFolder: string;
//     sapClientParam: string;
//     flpAppId: string;
//     flpSandboxAvailable: boolean;
//     isFioriElement?: boolean; // todo: deprecate and add `localStartFile` so migrator and other consumers can pass the start file name directly
//     migratorMockIntent?: string;
//     version?: OdataVersion; // Will not be present in FF no datasource flow
//     isMigrator?: boolean;
// };

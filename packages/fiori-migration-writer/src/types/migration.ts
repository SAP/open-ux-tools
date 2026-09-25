/**
 * Migration-related types for app-migrator
 */

import type { FioriElementsVersion, SapAppSourceTemplate } from '../project-spec-types.js';
import type { MigrationTypes, postMigrationAction } from '../utils/constants.js';
import type { Backend, NeoappDestination } from './service.js';
import type { ODataVersion } from './constants.js';
import type { HasRootIntent } from './template.js';

/**
 * Message for migration results
 */
export interface Message {
    type: 'ERROR' | 'WARNING' | 'SUCCESS';
    description: string;
    messageUrl?: string;
    action?: postMigrationAction;
}

/**
 * Import project information
 */
export type ImportProjectInfo = {
    sapLibs: string;
    rootPath: string;
    moduleName: string;
    moduleDescription: string;
    mainServiceURI?: string;
    sapux: boolean;
    scp: boolean;
    destination: string;
    appTitle: string;
    appVersion: string;
    sapClient: string;
    backends: Backend[];
    FEVersion?: FioriElementsVersion;
    floorPlan?: string;
    namespace?: string;
    baseUri?: string;
    mainService?: string;
    mainServiceFsPath?: string;
    odataVersion: ODataVersion;
    mainEntity?: string;
    ui5Theme?: string;
    ui5Version?: string;
    localUI5Version?: string;
    isSAPApp?: boolean;
    webappPath: string;
    hostname: string;
    isFioriToolsProject: boolean;
    uiAdaptation?: any;
    minUI5Version?: string;
    supportedThemes?: string[];
    flpSandboxFlpIntent?: string;
    flpSandboxMockFlpIntent?: string;
    minSupportedUI5Version?: string;
    manifestUI5Version?: string;
    neoAppUI5Version?: string;
    neoappDestinations?: NeoappDestination[];
    sourceTemplate?: SapAppSourceTemplate; // Test only property
    firstNeoAppDestination?: string;
    type?: MigrationTypes;
    hasRootIntent?: HasRootIntent;
    extensionProjectSettings?: any;
    reuseLibs?: string;
    // if flpSandboxMockServer.html is found in the project, this will be set to 'test/flpSandboxMockServer.html'
    targetMockHtmlFile?: string;
};

/**
 * Migration UI project information with status
 */
export interface MigrationUIProjectInfo extends ImportProjectInfo {
    status?: 'ERROR' | 'WARNING' | 'SUCCESS';
    messages?: Message[];
    migrationTime?: number;
}

/**
 * Migration settings file configuration
 */
export type MigrationSettingsFile = {
    ignoreProjects: string[];
};

/**
 * Project-related types for app-migrator
 */

import type { MigrationTypes } from '../utils/constants.js';
import type { EntityConfig } from './service.js';

/**
 * Base project configuration
 */
export interface Project {
    targetFolder: string;
    addDeployConfig?: boolean;
    addFlpConfig?: boolean;
    name: string;
    namespace?: string;
    title: string;
    description: string;
    ui5Theme: string;
    ui5Version: string;
    ui5FrameworkUrl?: string; // URL providing ui5 libraries, set to default if not provided
    localUI5Version: string;
    sapux?: boolean;
    skipAnnotations?: boolean;
    enableCodeAssist: boolean;
    enableEslint: boolean;
    enableTypeScript: boolean;
    manifestVersion: string;
    formEntry?: boolean;
    flpAppId?: string; // Represents the concatenation of semanticObject and action to form a navigation intent as used in url http://some/path#<semanticObject>-<action>
    minSupportedUI5Version?: string; // min supported version based on floorplan and odata version
    manifestMinUI5Version?: string; // ui5 version for manifest.json minUI5Version
    enableNPMWorkspaces?: boolean;
}

/**
 * Extended project configuration for migration
 */
export interface ProjectMigrate extends Project {
    flpAppId?: string; // Identifies the application in FLP => SemanticObject-Action will be used in html templates
    appId?: string;
    entityConfig?: EntityConfig;
    SemanticObject?: string;
    appMigratorSrcComponentToReplace?: string;
    mainDataSource?: string;
    mainDatasourceName?: string;
    projectTitle?: string;
    projectDescription?: string;
    fullyQualifiedProjectName?: string;
    fullyQualifiedProjectNameAMD?: string;
    sapUiLibs?: string;
    minSupportedUI5Version?: string;
    manifestUI5Version?: string;
    neoAppUI5Version?: string;
    semanticObject: string;
    type?: MigrationTypes;
    extenstionSettings?: any;
}

/**
 * Project app path information
 */
export interface ProjectAppPath {
    label: string;
    description: string;
}

/**
 * Migratable folder information
 */
export type MigratableFolder = {
    root: string;
    type: MigrationTypes;
    libPath?: string;
};

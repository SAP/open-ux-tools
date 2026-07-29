/**
 * Template-related types for app-migrator
 */

import type { ProjectMigrate } from './project.js';
import type { Service } from './service.js';
import type { PackageJsonMigrate } from './package.js';
import type { TemplateDataKey } from './constants.js';

/**
 * Template properties configuration
 */
export type TemplateProperties = {
    path?: string;
    targetPath?: string;
    isRendered?: boolean; // Default true
    targetName?: string; // i.e. .gitignore.txt but written as .gitignore
    opts?: any;
    templateDataKey?: TemplateDataKey;
};

/**
 * Template map for file generation
 */
export type TemplateMap = {
    [key: string]: TemplateProperties;
};

/**
 * Root intent configuration
 */
export type HasRootIntent = {
    flpSandboxRootIntent?: boolean;
    flpSandboxMockRootIntent?: boolean;
};

/**
 * Template data for rendering
 */
export interface TemplateData<P extends ProjectMigrate = ProjectMigrate, S extends Service = Service> {
    project: Partial<P>;
    service: Partial<S>;
    readMe?: Partial<ReadMe>; // Customisation point for readme.txt
    ui5Yaml?: Partial<Ui5Yaml> & Partial<Ui5MockYaml>; // Customisation point for ui5Yaml
    packageJson?: Partial<PackageJsonMigrate>; // Customisation point for package.json
    appId?: string;
    SemanticObject?: string;
    escapeDoubleQuotes?: (input: string) => string;
    fullyQualifiedProjectName?: string;
    fullyQualifiedProjectNameAMD?: string;
    sapUiLibs?: string;
    ui5Theme?: string;
    appIntent?: string;
    appMockIntent?: string;
    mainServiceFsPath?: string;
    hasRootIntent?: HasRootIntent;
    mockServerJSFileName?: string;
}

/**
 * README.txt base definition
 */
export interface ReadMe {
    genDate: string;
    genPlatform: string;
    dataSourceLabel: string;
    metadataFilename?: string;
    serviceUrl: string;
    projectName: string;
    projectTitle: string;
    projectNamespace: string;
    projectDescription: string;
    ui5Theme: string;
    projectUI5Version: string;
    enableCodeAssist: boolean;
    enableEslint: boolean;
    enableTypeScript: boolean;
    showMockDataInfo?: boolean;
    genId: string;
    genVersion: string;
    templateLabel: string; // The template/floorplan selected
    additionalEntries?: { label: string; value: string }[]; // Read me line entries
    launchText?: string;
}

/**
 * UI5 YAML properties interface
 * Note: Only ui5 properties supported by middleware proxy should go here
 * For example, ui5Theme must not
 */
interface Ui5YamlProps {
    ui5Version: string;
    ui5Url: string;
}

/**
 * UI5 YAML configuration
 */
export interface Ui5Yaml extends Ui5YamlProps {
    name: string;
    proxyPath: string;
    proxyHost: string;
    scp?: boolean;
    destination?: string;
    destinationInstance?: string;
    ui5Theme: string;
    localUI5Version: string;
    sapUiLibs: string[];
    apiHubApiKey?: string;
    client?: string;
    appId?: string;
}

/**
 * UI5 Mock YAML configuration
 * Represents contents of mock middleware yaml entry
 */
export interface Ui5MockYaml extends Ui5YamlProps {
    name: string;
    servicePath: string;
    serviceName?: string;
    metadataXmlPath: string;
    mockdataRootPath: string;
    generateMockData: boolean;
}

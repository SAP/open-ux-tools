/**
 * Types that were previously imported from @sapux/project-spec (SAP-internal package).
 * These are inlined here to make the package open-source compatible.
 */

// Re-export Manifest from @ui5/manifest via @sap-ux/project-access
export type { Manifest, ManifestNamespace } from '@sap-ux/project-access';

/**
 * Fiori Elements versions
 */
export const FioriElementsVersion = {
    v2: 'v2',
    v4: 'v4'
} as const;
export type FioriElementsVersion = (typeof FioriElementsVersion)[keyof typeof FioriElementsVersion];

/**
 * Source template information from manifest.json
 */
export interface SapAppSourceTemplate {
    id?: string;
    version?: string;
    toolsId?: string;
}

/**
 * File names used across the migration
 */
export const FileName = {
    Manifest: 'manifest.json',
    Package: 'package.json',
    UI5Yaml: 'ui5.yaml',
    UI5LocalYaml: 'ui5-local.yaml',
    UI5MockYaml: 'ui5-mock.yaml',
    NeoApp: 'neo-app.json',
    XsApp: 'xs-app.json',
    ExtConfigJson: '.extconfig.json',
    Pom: 'pom.xml',
    Component: 'Component.js',
    IndexHtml: 'index.html'
} as const;
export type FileName = (typeof FileName)[keyof typeof FileName];

/**
 * Directory names used across the migration
 */
export const DirName = {
    Webapp: 'webapp',
    LocalService: 'localService',
    Test: 'test',
    I18n: 'i18n',
    Changes: 'changes',
    Sapux: 'src'
} as const;
export type DirName = (typeof DirName)[keyof typeof DirName];

/**
 * Package.json structure
 */
export interface Package {
    name?: string;
    version?: string;
    description?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    ui5?: {
        dependencies?: string[];
    };
    sapux?: string[] | boolean;
    [key: string]: unknown;
}

/**
 * UI5 routing target from manifest.json
 */
export interface SapUi5RoutingTarget {
    name?: string;
    viewName?: string;
    viewId?: string;
    viewType?: string;
    viewLevel?: number;
    transition?: string;
}

/**
 * Middleware proxy configuration for ui5.yaml
 */
export interface MiddlewareProxy {
    name?: string;
    path: string;
    url?: string;
    destination?: string;
    destinationInstance?: string;
    client?: string;
}

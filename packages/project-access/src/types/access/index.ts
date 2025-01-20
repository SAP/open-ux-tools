import type { Logger } from '@sap-ux/logger';
import type { NewI18nEntry } from '@sap-ux/i18n';
import type { I18nBundles } from '../i18n';
import type { ApplicationStructure, I18nPropertiesPaths, Project, ProjectType } from '../info';
import type { Editor } from 'mem-fs-editor';
import type { Package } from '../package';
import type { Manifest } from '../webapp';

interface BaseAccess {
    readonly project: Project;
    readonly root: string;
    readonly projectType: ProjectType;
}
export interface ApplicationAccessOptions extends ProjectAccessOptions {
    fs?: Editor;
}
export interface ApplicationAccess extends BaseAccess {
    readonly app: ApplicationStructure;
    /**
     * Maintains new translation entries in an existing i18n file or in a new i18n properties file if it does not exist.
     *
     * @param newEntries - translation entries to write in the `.properties` file
     * @returns - boolean or exception
     * @description It also update `manifest.json` file if `@i18n` entry is missing from `"sap.ui5":{"models": {}}`
     * as
     * ```JSON
     * {
     *      "sap.ui5": {
     *          "models": {
     *              "@i18n": {
     *                  "type": "sap.ui.model.resource.ResourceModel",
     *                  "uri": "i18n/i18n.properties"
     *              }
     *          }
     *      }
     * }
     * ```
     */
    createAnnotationI18nEntries(newEntries: NewI18nEntry[]): Promise<boolean>;
    /**
     * Maintains new translation entries in an existing i18n file or in a new i18n properties file if it does not exist.
     *
     * @param newEntries - translation entries to write in the `.properties` file
     * @param modelKey - i18n model key. Default key is `i18n`
     * @returns boolean or exception
     * @description It also update `manifest.json` file if `<modelKey>` entry is missing from `"sap.ui5":{"models": {}}`
     * as
     * ```JSON
     * {
     *      "sap.ui5": {
     *          "models": {
     *              "<modelKey>": {
     *                  "type": "sap.ui.model.resource.ResourceModel",
     *                  "uri": "i18n/i18n.properties"
     *              }
     *          }
     *      }
     * }
     * ```
     */
    createUI5I18nEntries(newEntries: NewI18nEntry[], modelKey?: string): Promise<boolean>;
    /**
     * Maintains new translation entries in an existing i18n file or in a new i18n properties file if it does not exist.
     *
     * @param newEntries translation entries to write in the `.properties` file
     * @returns boolean or exception
     * @description If `i18n` entry is missing from `"sap.app":{}`, default `i18n/i18n.properties` is used. Update of `manifest.json` file is not needed.
     */
    createManifestI18nEntries(newEntries: NewI18nEntry[]): Promise<boolean>;
    /**
     * Maintains new translation entries in CAP i18n files.
     *
     * @param filePath absolute path to file in which the translation entry will be used.
     * @param newI18nEntries translation entries to write in the i18n file.
     * @returns boolean or exception
     */
    createCapI18nEntries(filePath: string, newI18nEntries: NewI18nEntry[]): Promise<boolean>;
    /**
     * Return the application id of this app, which is the relative path from the project root
     * to the app root.
     *
     * @returns - Application root path
     */
    getAppId(): string;
    /**
     * Return the absolute application root path.
     *
     * @returns - Application root path
     */
    getAppRoot(): string;
    /**
     * For a given app in project, retrieves i18n bundles for 'sap.app' namespace,`models` of `sap.ui5` namespace and service for cap services.
     *
     * @returns i18n bundles or exception
     */
    getI18nBundles(): Promise<I18nBundles>;
    /**
     * Return absolute paths to i18n.properties files from manifest.
     *
     * @returns absolute paths to i18n.properties
     */
    getI18nPropertiesPaths(): Promise<I18nPropertiesPaths>;
    /**
     * Returns an instance of @sap/ux-specification for the application.
     */
    getSpecification<T>(): Promise<T>;
    /**
     * Updates package.json file asynchronously by keeping the previous indentation.
     *
     * @param packageJson - updated package.json file content
     * @param memFs - optional mem-fs-editor instance
     */
    updatePackageJSON(packageJson: Package, memFs?: Editor): Promise<void>;
    /**
     * Updates manifest.json file asynchronously by keeping the previous indentation.
     *
     * @param manifest - updated manifest.json file content
     * @param memFs - optional mem-fs-editor instance
     */
    updateManifestJSON(manifest: Manifest, memFs?: Editor): Promise<void>;
}

export interface ProjectAccessOptions {
    logger?: Logger;
    memFs?: Editor;
}

export interface ProjectAccess extends BaseAccess {
    getApplicationIds: () => string[];
    getApplication: (appId: string) => ApplicationAccess;
}

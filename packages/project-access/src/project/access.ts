import type {
    ApplicationAccess,
    ProjectAccess,
    Project,
    I18nBundles,
    I18nPropertiesPaths,
    NewI18nEntry
} from '../types';
import { getI18nPropertiesPaths } from './i18n';
import { getCapI18nFolderNames, getI18nBundles } from './i18n/read';

import {
    createCapI18nEntries,
    createManifestI18nEntries,
    createUI5I18nEntries,
    createAnnotationI18nEntries
} from './i18n/write';

import { getProject } from './info';

/**
 *
 */
class ApplicationAccessImp implements ApplicationAccess {
    /**
     * Constructor for ApplicationAccess.
     *
     * @param project - Project structure
     * @param appId - Application ID
     */
    constructor(private project: Project, private appId: string) {}
    /**
     * Maintains new translation entries in an existing i18n file or in a new i18n properties file if it does not exist.
     *
     * @param newEntries translation entries to write in the `.properties` file
     * @returns boolean or exception
     * @description it also update `manifest.json` file if `@i18n` entry is missing from `"sap.ui5":{"models": {}}`
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
    createAnnotationI18nEntries(newEntries: NewI18nEntry[]): Promise<boolean> {
        const app = this.project.apps[this.appId];
        return createAnnotationI18nEntries(this.project.root, app.manifest, app.i18n, newEntries);
    }
    /**
     * Maintains new translation entries in an existing i18n file or in a new i18n properties file if it does not exist.
     *
     * @param newEntries translation entries to write in the `.properties` file
     * @param modelKey i18n model key. Default key is `i18n`
     * @returns boolean or exception
     * @description it also update `manifest.json` file if `<modelKey>` entry is missing from `"sap.ui5":{"models": {}}`
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
    createUI5I18nEntries(newEntries: NewI18nEntry[], modelKey: string = 'i18n'): Promise<boolean> {
        const app = this.project.apps[this.appId];
        return createUI5I18nEntries(this.project.root, app.manifest, app.i18n, newEntries, modelKey);
    }
    /**
     * Maintains new translation entries in an existing i18n file or in a new i18n properties file if it does not exist.
     *
     * @param newEntries translation entries to write in the `.properties` file
     * @returns boolean or exception
     * @description if `i18n` entry is missing from `"sap.app":{}`, default `i18n/i18n.properties` is used. Update of `manifest.json` file is not needed
     */
    createManifestI18nEntries(newEntries: NewI18nEntry[]): Promise<boolean> {
        const app = this.project.apps[this.appId];
        return createManifestI18nEntries(this.project.root, app.i18n, newEntries);
    }
    /**
     * Maintains new translation entries in CAP i18n files.
     *
     * @param filePath file in which the translation entry will be used.
     * @param newI18nEntries translation entries to write in the i18n file.
     * @returns boolean or exception
     */
    createCapI18nEntries(filePath: string, newI18nEntries: NewI18nEntry[]): Promise<boolean> {
        return createCapI18nEntries(this.project.root, filePath, newI18nEntries);
    }
    /**
     * Retrieves a list of potential folder names for i18n files.
     *
     * @returns ii18n folder names
     */
    getCapI18nFolderNames(): Promise<string[]> {
        return getCapI18nFolderNames(this.project.root);
    }
    /**
     * For a given app in project, retrieves i18n bundles for 'sap.app' namespace,`models` of `sap.ui5` namespace and service for cap services.
     *
     * @returns i18n bundles or exception
     */
    getI18nBundles(): Promise<I18nBundles> {
        const app = this.project.apps[this.appId];
        return getI18nBundles(this.project.root, app.i18n, this.project.projectType);
    }
    /**
     * Return absolute paths to i18n.properties files from manifest.
     *
     * @returns absolute paths to i18n.properties
     */
    getI18nPropertiesPaths(): Promise<I18nPropertiesPaths> {
        const app = this.project.apps[this.appId];
        return getI18nPropertiesPaths(app.manifest);
    }
}

class ProjectAccessImp implements ProjectAccess {
    private apps: { [index: string]: ApplicationAccess } = {};

    constructor(private project: Project) {}

    getApplicationIds(): string[] {
        return Object.keys(this.project.apps);
    }

    getApplication(appId: string): ApplicationAccess {
        if (!this.apps[appId]) {
            throw new Error(`Could not find app with id ${appId}`);
        }
        return new ApplicationAccessImp(this.project, appId);
    }
}

export async function createApplicationAccess(appRoot: string): Promise<ApplicationAccess> {
    const project = await getProject(appRoot);
    const appId = Object.keys(project.apps).find((app) => project.apps[app].appRoot === appRoot);
    if (!appId) {
        throw new Error(`Could not find app with root ${appRoot}`);
    }
    return new ApplicationAccessImp(project, appId);
}

export async function getProjectAccess(root: string): Promise<ProjectAccess> {
    const project = await getProject(root);
    const projectAccess = new ProjectAccessImp(project);
    return projectAccess;
}

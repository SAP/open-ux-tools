import { relative } from 'path';
import type {
    ApplicationAccess,
    ProjectAccess,
    Project,
    I18nBundles,
    I18nPropertiesPaths,
    NewI18nEntry,
    ProjectType,
    ApplicationStructure
} from '../types';

import {
    getI18nBundles,
    getI18nPropertiesPaths,
    createCapI18nEntries,
    createManifestI18nEntries,
    createUI5I18nEntries,
    createAnnotationI18nEntries
} from './i18n';

import { getProject } from './info';
import { findAllApps } from './search';

import type { Editor } from 'mem-fs-editor';

/**
 *
 */
class ApplicationAccessImp implements ApplicationAccess {
    /**
     * Constructor for ApplicationAccess.
     *
     * @param _project - Project structure
     * @param appId - Application ID
     * @param fs optional `mem-fs-editor` instance.
     */
    constructor(private _project: Project, private appId: string, private fs?: Editor) {}

    /**
     * Returns the application structure.
     *
     * @returns ApplicationStructure
     */
    public get app(): ApplicationStructure {
        return this.project.apps[this.appId];
    }

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
    createAnnotationI18nEntries(newEntries: NewI18nEntry[]): Promise<boolean> {
        return createAnnotationI18nEntries(this.project.root, this.app.manifest, this.app.i18n, newEntries, this.fs);
    }
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
    createUI5I18nEntries(newEntries: NewI18nEntry[], modelKey: string = 'i18n'): Promise<boolean> {
        return createUI5I18nEntries(this.project.root, this.app.manifest, this.app.i18n, newEntries, modelKey, this.fs);
    }

    /**
     * Maintains new translation entries in an existing i18n file or in a new i18n properties file if it does not exist.
     *
     * @param newEntries translation entries to write in the `.properties` file
     * @returns boolean or exception
     * @description If `i18n` entry is missing from `"sap.app":{}`, default `i18n/i18n.properties` is used. Update of `manifest.json` file is not needed.
     */
    createManifestI18nEntries(newEntries: NewI18nEntry[]): Promise<boolean> {
        return createManifestI18nEntries(this.project.root, this.app.i18n, newEntries, this.fs);
    }

    /**
     * Maintains new translation entries in CAP i18n files.
     *
     * @param filePath file in which the translation entry will be used.
     * @param newI18nEntries translation entries to write in the i18n file.
     * @returns boolean or exception
     */
    createCapI18nEntries(filePath: string, newI18nEntries: NewI18nEntry[]): Promise<boolean> {
        return createCapI18nEntries(this.project.root, filePath, newI18nEntries, this.fs);
    }

    /**
     * Return the application id of this app, which is the relative path from the project root
     * to the app root.
     *
     * @returns - Application root path
     */
    getAppId(): string {
        return this.appId;
    }

    /**
     * Return the absolute application root path.
     *
     * @returns - Application root path
     */
    getAppRoot(): string {
        return this.app.appRoot;
    }

    /**
     * For a given app in project, retrieves i18n bundles for 'sap.app' namespace,`models` of `sap.ui5` namespace and service for cap services.
     *
     * @returns i18n bundles or exception
     */
    getI18nBundles(): Promise<I18nBundles> {
        return getI18nBundles(this.project.root, this.app.i18n, this.project.projectType, this.fs);
    }

    /**
     * Return absolute paths to i18n.properties files from manifest.
     *
     * @returns absolute paths to i18n.properties
     */
    getI18nPropertiesPaths(): Promise<I18nPropertiesPaths> {
        return getI18nPropertiesPaths(this.app.manifest);
    }

    /**
     * Project structure.
     *
     * @returns - Project structure
     */
    get project(): Project {
        return this._project;
    }

    /**
     * Project type.
     *
     * @returns - Project type, like EDMXBackend, CAPJava, or CAPNodejs
     */
    get projectType(): ProjectType {
        return this.project.projectType;
    }

    /**
     * Project root path.
     *
     * @returns - Project root path
     */
    get root(): string {
        return this.project.root;
    }
}

/**
 * Class that implements ProjectAccess interface.
 * It can be used to retrieve information about the project, like applications, paths, services.
 */
class ProjectAccessImp implements ProjectAccess {
    /**
     * Constructor for ProjectAccess.
     *
     * @param _project - Project structure
     */
    constructor(private _project: Project) {}

    /**
     * Returns list of application IDs.
     *
     * @returns - array of application IDs. For single application projects it will return ['']
     */
    getApplicationIds(): string[] {
        return Object.keys(this._project.apps);
    }

    /**
     * Returns an instance of an application for a given application ID. The contains information about the application, like paths and services.
     *
     * @param appId - application ID
     * @returns - Instance of ApplicationAccess that contains information about the application, like paths and services
     */
    getApplication(appId: string): ApplicationAccess {
        if (!this.project.apps[appId]) {
            throw new Error(`Could not find app with id ${appId}`);
        }
        return new ApplicationAccessImp(this.project, appId);
    }

    /**
     * Project structure.
     *
     * @returns - Project structure
     */
    get project(): Project {
        return this._project;
    }

    /**
     * Project type.
     *
     * @returns - Project type, like EDMXBackend, CAPJava, or CAPNodejs
     */
    get projectType(): ProjectType {
        return this.project.projectType;
    }

    /**
     * Project root path.
     *
     * @returns - Project root path
     */
    get root(): string {
        return this.project.root;
    }
}

/**
 * Create an instance of ApplicationAccess that contains information about the application, like paths and services.
 *
 * @param appRoot - Application root path
 * @param fs optional `mem-fs-editor` instance. If provided, `mem-fs-editor` api is used instead of `fs` of node.
 * In case of CAP project, some CDS APIs are used internally which depends on `fs` of node and not `mem-fs-editor`.
 * When calling this function, adding or removing a CDS file in memory or changing CDS configuration will not be considered until present on real file system.
 * @returns - Instance of ApplicationAccess that contains information about the application, like paths and services
 */
export async function createApplicationAccess(appRoot: string, fs?: Editor): Promise<ApplicationAccess> {
    try {
        const apps = await findAllApps([appRoot]);
        const app = apps.find((app) => app.appRoot === appRoot);
        if (!app) {
            throw new Error(`Could not find app with root ${appRoot}`);
        }
        const project = await getProject(app.projectRoot);
        const appId = relative(project.root, appRoot);
        return new ApplicationAccessImp(project, appId, fs);
    } catch (error) {
        throw Error(`Error when creating application access for ${appRoot}: ${error}`);
    }
}

/**
 * Create an instance of ProjectAccess that contains information about the project, like applications, paths, services.
 *
 * @param root - Project root path
 * @returns - Instance of ProjectAccess that contains information about the project
 */
export async function createProjectAccess(root: string): Promise<ProjectAccess> {
    try {
        const project = await getProject(root);
        const projectAccess = new ProjectAccessImp(project);
        return projectAccess;
    } catch (error) {
        throw Error(`Error when creating project access for ${root}: ${error}`);
    }
}

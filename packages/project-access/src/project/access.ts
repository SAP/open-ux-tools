import type {
    ApplicationAccess,
    ProjectAccess,
    Project,
    I18nBundles,
    I18nPropertiesPaths,
    NewI18nEntry
} from '../types';
import { createCapI18nEntries } from './i18n';
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

    // Please add implementation for interface ApplicationAccess here
    createAnnotationI18nEntries(): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
    createManifestI18nEntries(): Promise<boolean> {
        throw new Error('Method not implemented.');
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
    getCapI18nFolderNames(): Promise<string[]> {
        throw new Error('Method not implemented.');
    }
    getI18nBundles(): Promise<I18nBundles> {
        throw new Error('Method not implemented.');
    }
    getI18nPropertiesPaths(): Promise<I18nPropertiesPaths> {
        throw new Error('Method not implemented.');
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

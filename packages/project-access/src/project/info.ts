import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import { DirName, FileName } from '../constants';
import { fileExists, findFilesByExtension, readJSON } from '../file';
import type {
    AllAppResults,
    ApplicationStructure,
    AppProgrammingLanguage,
    AppType,
    Manifest,
    Package,
    Project,
    ProjectType
} from '../types';
import { getCapProjectType } from './cap';
import { getI18nPropertiesPaths } from './i18n/i18n';
import { findFioriArtifacts } from './search';
import { getMainService, getServicesAndAnnotations } from './service';
import { getWebappPath } from './ui5-config';

/**
 * Returns the project structure for a given Fiori project.
 *
 * @param root - project root folder
 * @returns - project structure with project info like project type, apps, root folder
 */
export async function getProject(root: string): Promise<Project> {
    const checkCapType = await getCapProjectType(root);
    const projectType = checkCapType ?? 'EDMXBackend';
    const packageJson = await readJSON<Package>(join(root, FileName.Package));
    const appFolders = getAppFolders(packageJson);
    const apps = await getApps(root, appFolders);
    return {
        root,
        projectType,
        apps
    };
}

/**
 * Returns the application folders from sapux flag of the package.json. For single app
 * projects, this is just an array with one empty string. For CAP projects, this is an
 * array of operating system specific relative paths to the apps.
 *
 * @param packageJson - parsed package.json
 * @returns - array of operating specific application folders
 */
function getAppFolders(packageJson: Package): string[] {
    return Array.isArray(packageJson.sapux)
        ? packageJson.sapux.map((appFolder) => join(...appFolder.split(/[/\\]/)))
        : [''];
}

/**
 * Get the application structure for each application in the project.
 *
 * @param root - project root folder
 * @param appFolders - array of relative application folders
 * @returns - map of application structures
 */
async function getApps(root: string, appFolders: string[]): Promise<{ [index: string]: ApplicationStructure }> {
    const apps: { [index: string]: ApplicationStructure } = {};
    for (const appFolder of appFolders) {
        const applicationStructure = await getApplicationStructure(root, appFolder);
        if (applicationStructure) {
            apps[appFolder] = applicationStructure;
        }
    }
    return apps;
}

/**
 * Get the application structure for a given application.
 *
 * @param root - project root folder
 * @param appFolder - relative application folder
 * @returns - application structure with application info like manifest, changes, main service, services, annotations
 */
async function getApplicationStructure(root: string, appFolder: string): Promise<ApplicationStructure | undefined> {
    const appRoot = join(root, appFolder);
    const absoluteWebappPath = await getWebappPath(appRoot);
    const manifest = join(absoluteWebappPath, FileName.Manifest);
    if (!(await fileExists(manifest))) {
        return undefined;
    }
    const manifestObject = await readJSON<Manifest>(manifest);
    const changes = join(absoluteWebappPath, DirName.Changes);
    const i18n = await getI18nPropertiesPaths(manifest, manifestObject);
    const mainService = getMainService(manifestObject);
    const services = await getServicesAndAnnotations(manifest, manifestObject);
    return {
        appRoot,
        manifest,
        changes,
        i18n,
        mainService,
        services
    };
}

/**
 * Get the used programming language of an application.
 *
 * @param appRoot - root folder of the application
 * @param [memFs] - optional mem-fs editor instance
 * @returns - used language, JavaScript or TypeScript
 */
export async function getAppProgrammingLanguage(appRoot: string, memFs?: Editor): Promise<AppProgrammingLanguage> {
    const ignoreFolders = ['node_modules', '.git'];
    let appLanguage: AppProgrammingLanguage = '';
    try {
        const webappPath = await getWebappPath(appRoot, memFs);
        if (await fileExists(webappPath, memFs)) {
            if (
                (await fileExists(join(appRoot, FileName.Tsconfig), memFs)) &&
                (await findFilesByExtension('.ts', webappPath, ignoreFolders, memFs)).length > 0
            ) {
                appLanguage = 'TypeScript';
            } else if ((await findFilesByExtension('.js', webappPath, ignoreFolders, memFs)).length > 0) {
                appLanguage = 'JavaScript';
            }
        }
    } catch {
        // could not detect app language
    }
    return appLanguage;
}

/**
 * Get the type of application or Fiori artifact.
 *
 * @param appRoot - path to application root
 * @returns - type of application, e.g. SAP Fiori elements, SAPUI5 freestyle, SAPUI5 Extension, ... see AppType.
 */
export async function getAppType(appRoot: string): Promise<AppType | undefined> {
    let appType: AppType | undefined;
    try {
        const artifacts = await findFioriArtifacts({
            wsFolders: [appRoot],
            artifacts: ['adaptations', 'applications', 'extensions', 'libraries']
        });
        if (
            (artifacts.applications?.length ?? 0) +
                (artifacts.adaptations?.length ?? 0) +
                (artifacts.extensions?.length ?? 0) +
                (artifacts.libraries?.length ?? 0) ===
            1
        ) {
            if (artifacts.applications?.length === 1) {
                appType = await getApplicationType(artifacts.applications[0]);
            } else if (artifacts.adaptations?.length === 1) {
                appType = 'Fiori Adaptation';
            } else if (artifacts.extensions?.length === 1) {
                appType = 'SAPUI5 Extension';
            } else if (artifacts.libraries?.length === 1) {
                appType = 'Fiori Reuse';
            }
        }
    } catch {
        // If error occurs we can't determine the type and return undefined
    }
    return appType;
}

/**
 * Get the application type from search results.
 *
 * @param application - application from findFioriArtifacts() results
 * @returns - type of application: 'SAP Fiori elements' or 'SAPUI5 freestyle'
 */
async function getApplicationType(application: AllAppResults): Promise<'SAP Fiori elements' | 'SAPUI5 freestyle'> {
    let appType: 'SAP Fiori elements' | 'SAPUI5 freestyle';
    const rootPackageJsonPath = join(application.projectRoot, FileName.Package);
    const packageJson = (await fileExists(rootPackageJsonPath)) ? await readJSON<Package>(rootPackageJsonPath) : null;

    if (application.projectRoot === application.appRoot) {
        appType = packageJson?.sapux ? 'SAP Fiori elements' : 'SAPUI5 freestyle';
    } else if (packageJson) {
        appType =
            Array.isArray(packageJson.sapux) &&
            packageJson.sapux.find(
                (relAppPath) => join(application.projectRoot, ...relAppPath.split(/[/\\]/)) === application.appRoot
            )
                ? 'SAP Fiori elements'
                : 'SAPUI5 freestyle';
    } else {
        appType = 'SAPUI5 freestyle';
    }

    return appType;
}

/**
 * Returns the project type for a given Fiori project.
 *
 * @param projectRoot - root path of the project
 * @returns - project type like Edmx, CAPJava, CAPNodejs
 */
export async function getProjectType(projectRoot: string): Promise<ProjectType> {
    const capType = await getCapProjectType(projectRoot);
    if (capType === undefined) {
        return 'EDMXBackend';
    }
    return capType;
}

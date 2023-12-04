import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import { FileName } from '../constants';
import { fileExists, findFilesByExtension, readJSON } from '../file';
import type { Package, AppProgrammingLanguage, AppType, ProjectType, AllAppResults } from '../types';
import { getCapProjectType } from './cap';
import { getWebappPath } from './ui5-config';
import { findFioriArtifacts } from './search';

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

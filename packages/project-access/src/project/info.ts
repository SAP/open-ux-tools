import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import { FileName } from '../constants';
import { fileExists, findFilesByExtension } from '../file';
import type { AppProgrammingLanguage, FioriArtifactType } from '../types';
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
 * Get the Fiori artifact type for a given path.
 *
 * @param path - path to root, for application, adaptation, and extension provide the app root, for library the project root
 * @returns - Fiori artifact type
 */
export async function getArtifactTypes(path: string): Promise<FioriArtifactType> {
    const foundArtifacts = await findFioriArtifacts({
        artifacts: ['adaptations', 'applications', 'extensions', 'libraries'],
        wsFolders: [path]
    });
    if ((foundArtifacts.applications ?? []).filter((a) => a.appRoot === path).length > 0) {
        return 'application';
    }
    if ((foundArtifacts.adaptations ?? []).filter((a) => a.appRoot === path).length > 0) {
        return 'adaptation';
    }
    if ((foundArtifacts.extensions ?? []).filter((e) => e.appRoot === path).length > 0) {
        return 'extension';
    }
    if ((foundArtifacts.libraries ?? []).filter((l) => l.projectRoot === path).length > 0) {
        return 'library';
    }
    throw Error(`Could not identify Fiori artifact type for '${path}'`);
}

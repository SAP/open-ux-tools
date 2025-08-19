import { findProjectRoot, createApplicationAccess, getProject, DirName } from '@sap-ux/project-access';
import { join } from 'path';
import type { Appdetails } from '../types';

export async function resolveApplication(path: string): Promise<Appdetails | undefined> {
    try {
        // normalize app path
        path = join(path);
        try {
            const applicationAccess = await createApplicationAccess(path);
            return {
                root: applicationAccess.project.root,
                appId: applicationAccess.getAppId(),
                // projectProvider,
                applicationAccess
            };
        } catch (_e) {
            // Fallback - project without app
            const root = await findProjectRoot(path);
            const project = await getProject(root);
            if (project) {
                return {
                    root: project.root,
                    appId: ''
                };
            }
        }
    } catch (_e) {
        return undefined;
    }

    return undefined;
}

/**
 * Method returns folder path for new extension creation using FPM writer approach.
 * @param directory Target file type(fragment or view).
 * @returns Relative path.
 */
export const getDefaultExtensionFolder = (directory: string): string | undefined => {
    let subFolder: string | undefined;
    switch (directory) {
        case DirName.View: {
            subFolder = join(DirName.Ext, DirName.View);
            break;
        }
        case DirName.Fragment: {
            subFolder = join(DirName.Ext, DirName.Fragment);
            break;
        }
        case DirName.Controller: {
            subFolder = join(DirName.Ext, DirName.Controller);
            break;
        }
        default: {
            // Subfolder is passed
            subFolder = directory;
        }
    }
    return subFolder;
};

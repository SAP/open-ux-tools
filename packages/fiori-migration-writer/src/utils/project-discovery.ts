import { basename, dirname, join, sep } from 'node:path';
import { default as fg } from 'fast-glob';
import { DirName, FileName } from '../project-spec-types.js';
import { isFioriToolsProject, findAllManifest } from './project-access-adapters.js';
import type { ProjectAppPath, ProjectFolder } from '../types.js';
import { isProjectFolderArray } from '../types/project-folder.js';

/**
 * Find all maven project(s) by locating pom.xml in the VS code workspace(s)
 *
 * @param wsFolders
 */
export async function findAllWebIDEProjectFolders(wsFolders: readonly ProjectFolder[] | string[]): Promise<string[]> {
    let wsRoots: string[];
    if (isProjectFolderArray(wsFolders)) {
        wsRoots = wsFolders.filter((folder) => folder.uri.scheme === 'file').map((folder) => folder.uri.fsPath);
    } else {
        wsRoots = wsFolders || [];
    }
    // Find all folders containing a pom
    const projects: string[] = [];
    for (const root of wsRoots) {
        try {
            await findWebIDEProject(root, projects);
        } catch (error) {
            console.error(error);
        }
    }
    return projects;
}

/**
 * Find all maven project(s) by locating pom.xml in the VS code workspace root
 *
 * @param wsRoot
 * @param projects
 */
async function findWebIDEProject(wsRoot: string, projects: string[]): Promise<void> {
    const entries = await fg([`**/${FileName.Pom}`, `**/${FileName.NeoApp}`], {
        cwd: wsRoot,
        ignore: [
            '.git',
            'node_modules',
            '**/node_modules/**',
            'dist',
            '**/dist/**',
            `**/${DirName.Sapux}/**`,
            `**/${DirName.Webapp}/**`,
            '**/Web/MDKModule/**'
        ] // GH #14290
    });
    for (const entry in entries) {
        let fioriToolsProject = false;
        const file = join(wsRoot, entries[entry]);
        // check for neo-app.json or pom.xml file present
        fioriToolsProject = await isFioriToolsProject(dirname(file), '@sap/ux-ui5-tooling');
        if (!projects.includes(dirname(file)) && !fioriToolsProject) {
            projects.push(dirname(file));
        }
    }
}

/**
 * Get Pom project paths as labels for use in project picker
 *
 * @param workspaceRoots
 */
export async function getWebIDEProjectPathsAsLabels(workspaceRoots: ProjectFolder[]): Promise<ProjectAppPath[]> {
    const result = [];
    let roots = await findAllWebIDEProjectFolders(workspaceRoots);
    if (workspaceRoots.length > 1) {
        roots = [...new Set(roots)];
    }

    for (const root of roots) {
        result.push({
            label: basename(root),
            description: root
        });
    }

    return result.sort((obj1, obj2) => {
        if (obj1.label > obj2.label) {
            return 1;
        }
        if (obj1.label < obj2.label) {
            return -1;
        }
        return 0;
    });
}

/**
 * Find projects by manifest.json in workspace roots
 *
 * @param wsRoot
 */
export async function findProjectsByManifest(wsRoot: ProjectFolder[]): Promise<string[]> {
    // Convert ProjectFolder[] to string[] for project-access functions
    const wsRootPaths = wsRoot.map((folder) => folder.uri.fsPath);
    const manifestRoots = await findAllManifest(wsRootPaths);
    return manifestRoots.filter((root) => !root.endsWith(`${sep}${DirName.Webapp}`));
}

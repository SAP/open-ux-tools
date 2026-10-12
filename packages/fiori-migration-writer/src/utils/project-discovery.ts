import { basename, dirname, join, sep } from 'node:path';
import fg from 'fast-glob';
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

    // Process all workspace roots in parallel
    const projectArrays = await Promise.all(
        wsRoots.map(async (root) => {
            try {
                return await findWebIDEProject(root);
            } catch {
                // Continue scanning other roots even if one fails
                return [];
            }
        })
    );

    // Flatten all results
    return projectArrays.flat();
}

/**
 * Find all maven project(s) by locating pom.xml in the VS code workspace root
 *
 * @param wsRoot
 * @returns Array of project paths
 */
async function findWebIDEProject(wsRoot: string): Promise<string[]> {
    const projects: string[] = [];
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

    // Process all entries in parallel
    const results = await Promise.all(
        entries.map(async (entry) => {
            const file = join(wsRoot, entry);
            const dir = dirname(file);

            // Check for neo-app.json or pom.xml file present
            // Check both tooling packages (await in series is intentional - short-circuit on first match)
            const fioriToolsProject =
                (await isFioriToolsProject(dir, '@sap-ux/ui5-tooling')) ||
                (await isFioriToolsProject(dir, '@sap/ux-ui5-tooling'));

            return !fioriToolsProject ? dir : null;
        })
    );

    // Filter out nulls and duplicates
    const uniqueDirs = [...new Set(results.filter((r): r is string => r !== null))];
    projects.push(...uniqueDirs);

    return projects;
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

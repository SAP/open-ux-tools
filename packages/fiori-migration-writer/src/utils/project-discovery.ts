import { basename, dirname, join, sep } from 'node:path';
import fg from 'fast-glob';
import type { Editor } from 'mem-fs-editor';
import { createMemFsEditor } from './fs-adapter.js';
import { DirName, FileName } from '../project-spec-types.js';
import { isFioriToolsProject, findAllManifest } from './project-access-adapters.js';
import type { ProjectAppPath, ProjectFolder } from '../types.js';
import { isProjectFolderArray } from '../types/project-folder.js';

/**
 * Find all maven project(s) by locating pom.xml in the VS code workspace(s)
 *
 * @param fs
 * @param wsFolders
 */
export async function findAllWebIDEProjectFolders(
    fs: Editor,
    wsFolders: readonly ProjectFolder[] | string[]
): Promise<string[]> {
    let wsRoots: string[];
    if (isProjectFolderArray(wsFolders)) {
        wsRoots = wsFolders.filter((folder) => folder.uri.scheme === 'file').map((folder) => folder.uri.fsPath);
    } else {
        wsRoots = wsFolders || [];
    }

    // Process all workspace roots in parallel, skipping src/ to avoid nested test suites
    const projectArrays = await Promise.all(
        wsRoots.map(async (root) => {
            try {
                return await findWebIDEProject(fs, root, true);
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
 * @param fs
 * @param wsRoot
 * @param skipSrcDirs - If true, skip scanning src/ directories (used for getProjectRoots)
 * @returns Array of project paths
 */
async function findWebIDEProject(fs: Editor, wsRoot: string, skipSrcDirs = true): Promise<string[]> {
    const projects: string[] = [];
    const ignore = [
        '.git',
        'node_modules',
        '**/node_modules/**',
        'dist',
        '**/dist/**',
        `**/${DirName.Webapp}/**`,
        '**/Web/MDKModule/**'
    ];
    if (skipSrcDirs) {
        ignore.push(`**/${DirName.Sapux}/**`); // GH #14290 — skip src/ to avoid nested test suites
    }
    const entries = await fg([`**/${FileName.Pom}`, `**/${FileName.NeoApp}`], {
        cwd: wsRoot,
        ignore
    });

    // Process all entries in parallel
    const results = await Promise.all(
        entries.map(async (entry) => {
            const file = join(wsRoot, entry);
            const dir = dirname(file);

            // Check for neo-app.json or pom.xml file present
            // Check both tooling packages (await in series is intentional - short-circuit on first match)
            const fioriToolsProject =
                (await isFioriToolsProject(fs, dir, '@sap-ux/ui5-tooling')) ||
                (await isFioriToolsProject(fs, dir, '@sap/ux-ui5-tooling'));

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
 * Uses a broader scan (including src/ dirs) to find all WebIDE projects.
 *
 * @param workspaceRoots
 * @param fsEditor - optional mem-fs editor; a fresh one is created when omitted
 */
export async function getWebIDEProjectPathsAsLabels(
    workspaceRoots: ProjectFolder[],
    fsEditor?: Editor
): Promise<ProjectAppPath[]> {
    const fs = fsEditor ?? createMemFsEditor();
    const result: ProjectAppPath[] = [];
    let wsRoots: string[];
    if (isProjectFolderArray(workspaceRoots)) {
        wsRoots = workspaceRoots.filter((folder) => folder.uri.scheme === 'file').map((folder) => folder.uri.fsPath);
    } else {
        wsRoots = (workspaceRoots as any) || [];
    }

    // Use broader scan (skipSrcDirs=false) to also find nested WebIDE projects in src/
    const projectArrays = await Promise.all(
        wsRoots.map(async (root) => {
            try {
                return await findWebIDEProject(fs, root, false);
            } catch {
                return [];
            }
        })
    );

    let roots = projectArrays.flat();
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

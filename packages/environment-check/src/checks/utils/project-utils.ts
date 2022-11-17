import type { WorkspaceFolder } from 'vscode';
import * as fs from 'fs';
import type { CustomMiddleware, FioriToolsProxyConfig } from '@sap-ux/ui5-config';
import { FileName, DirName } from '../../types';
import * as yaml from 'yamljs';
import { default as find } from 'findit2';
import { join, basename, dirname } from 'path';
import { t } from '../../i18n';

/**
 * Returns the ui5 middleware settings of a given Fiori elements project (v2 or v4).
 *
 * @param root string - path to the SAP UX project (where the ui5.yaml is)
 * @returns middleware proxy
 */
export async function getUi5CustomMiddleware(root: string): Promise<CustomMiddleware<FioriToolsProxyConfig>> {
    const yamlContent = await readFile(join(root, FileName.Ui5Yaml));
    const middlewares: CustomMiddleware<FioriToolsProxyConfig>[] = yaml.parse(yamlContent)?.server?.customMiddleware;
    return middlewares?.find((element) => element.name === 'fiori-tools-proxy');
}

/**
 * Internal function to find all folders that contain a package.json in a given workspace.
 *
 * @param wsFolders - root folder paths or workspaces to start the search from
 * @returns projects
 */
export async function findAllPackageJsonFolders(
    wsFolders: WorkspaceFolder[] | string[] | undefined
): Promise<string[]> {
    // extract root path if provided as VSCode folder
    let wsRoots: string[];
    if (isWorkspaceFolder(wsFolders)) {
        wsRoots = [];
        wsFolders
            .filter((each) => each.uri.scheme === 'file')
            .forEach((folder) => {
                wsRoots.push(folder.uri.fsPath);
            });
    } else {
        wsRoots = wsFolders || [];
    }

    // find all folders containing a package.json
    const projects: string[] = [];
    for (const root of wsRoots) {
        try {
            await findProject(root, projects);
        } catch (error) {
            const errorMessage = t('error.projectRootWorkspace', {
                root,
                error: error.message
            });
            console.error(errorMessage);
        }
    }
    return projects;
}

/**
 * WorkspaceFolder typeguard.
 *
 * @param value value to typecheck
 * @returns boolean  - if workspace folder
 */
function isWorkspaceFolder(value: WorkspaceFolder[] | string[]): value is WorkspaceFolder[] {
    return value && (value as WorkspaceFolder[]).length > 0 && (value as WorkspaceFolder[])[0].uri !== undefined;
}

/**
 * Find all projects in the given folder.
 *
 * @param wsRoot root folder for the search
 * @param projects projects array to which all found projects will be added
 */
async function findProject(wsRoot: string, projects: string[]): Promise<void> {
    return findAll(wsRoot, FileName.Package, projects, [
        '.git',
        'node_modules',
        'dist',
        DirName.Sapux,
        DirName.Webapp,
        'MDKModule' // GH #14290
    ]);
}

/**
 * Asynchronously reads the entire contents of a file.
 *
 * @param path A path to a file
 */
async function readFile(path: string): Promise<string> {
    return new Promise((resolve, reject): void => {
        fs.readFile(path, { encoding: 'utf8' }, (err, data): void => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

/**
 * Find function to search through folders starting from root.
 *
 * @param root - root folder to start search
 * @param filename - filename to search
 * @param results - result collector (found paths will be added here)
 * @param stopFolders - list of foldernames to exclude (search doesn't traverse into these folders)
 */
async function findAll(root: string, filename: string, results: string[], stopFolders: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const finder = find(root);
        finder.on('directory', (dir, stat, stop) => {
            const base = basename(dir);
            if (stopFolders.indexOf(base) !== -1) {
                stop();
            }
        });
        finder.on('file', (file: string) => {
            if (file.endsWith(filename)) {
                results.push(dirname(file));
            }
        });
        finder.on('end', () => {
            resolve();
        });
        finder.on('error', (error) => {
            reject(error);
        });
    });
}

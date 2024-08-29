import { join, dirname, sep } from 'path';
import { existsSync, promises } from 'fs';
import type { CdsEnvironment } from '../types';
import { getI18nConfiguration } from './config';
import type { Editor } from 'mem-fs-editor';

/**
 * Normalize file pth.
 *
 * @param path file path
 * @returns normalized file path
 */
function normalizePath(path: string): string {
    if (process.platform === 'win32') {
        return path.charAt(0).toLowerCase() + path.slice(1);
    }
    return path;
}

/**
 * Check if path a start with path b.
 *
 * @param a file path one
 * @param b file path two
 * @returns boolean
 */
function pathStartsWith(a: string, b: string): boolean {
    return normalizePath(a).startsWith(normalizePath(b));
}

const nodeModules = sep + 'node_modules';

/**
 * Returns the location of an existing `_i18n` folder next to or in the
 * folder hierarchy above the given path, if any.
 *
 * @param root project root
 * @param env CDS environment configuration
 * @param filePath CDS source file path
 * @returns i18n folder or undefined
 */
export function resolveCapI18nFolderForFile(root: string, env: CdsEnvironment, filePath: string): string | undefined {
    const { folders } = getI18nConfiguration(env);

    /**
     * Resolve file path.
     *
     * @param path file path
     * @returns file path or undefined
     */
    function resolve(path: string): string | undefined {
        // check whether a <path>/_i18n exists
        for (const folderName of folders) {
            const folderPath = join(path, folderName);
            if (existsSync(folderPath)) {
                return folderPath;
            }
        }
        //> no --> search up the folder hierarchy
        const next = dirname(path);

        if (next.includes(nodeModules)) {
            if (next.endsWith(nodeModules)) {
                return undefined;
            }
        } else if (!pathStartsWith(next, root)) {
            return undefined;
        }
        return !next || next === path ? undefined : resolve(next);
    }
    return resolve(filePath);
}

/**
 * Merges i18n files for CDS source files.
 *
 * @param root project root
 * @param env CDS environment configuration
 * @param filePaths CDS file path
 * @returns i18n files
 */
export function getCapI18nFiles(root: string, env: CdsEnvironment, filePaths: string[]): string[] {
    const { baseFileName } = getI18nConfiguration(env);
    const i18nFiles = filePaths.reduce((acc: string[], filePath) => {
        const i18nFolder = resolveCapI18nFolderForFile(root, env, filePath);
        if (i18nFolder) {
            const file = join(i18nFolder, baseFileName);
            if (acc.indexOf(file) === -1) {
                acc.push(file);
            }
        }
        return acc;
    }, []);

    return i18nFiles;
}

/**
 * Get an i18n folder for an existing CDS file. A new folder is only created, if it does not exist and optional `mem-fs-editor` instance is not provided.
 *
 * @param root project root
 * @param path Relative path to cds file
 * @param env CDS environment configuration,
 * @param fs optional `mem-fs-editor` instance. If provided, a new folder is not created, even if it does not exist
 * @returns i18n folder path
 */
export async function getCapI18nFolder(root: string, path: string, env: CdsEnvironment, fs?: Editor): Promise<string> {
    const { folders } = getI18nConfiguration(env);
    let i18nFolderPath = resolveCapI18nFolderForFile(root, env, join(root, path));
    if (!i18nFolderPath) {
        const folder = folders[0];
        i18nFolderPath = join(root, folder);
        if (!fs) {
            // create directory when mem-fs-editor is not provided. when mem-fs-editor is provided, directory is created on using `.commit()` API
            await promises.mkdir(i18nFolderPath);
        }
    }
    return i18nFolderPath;
}

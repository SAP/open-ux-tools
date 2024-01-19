import { join, dirname, sep } from 'path';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { type CdsEnvironment } from '../types';
import { getI18nConfiguration } from './config';

function normalizePath(path: string): string {
    if (process.platform === 'win32') {
        return path.charAt(0).toLowerCase() + path.slice(1);
    }
    return path;
}

function pathStartsWith(a: string, b: string): boolean {
    return normalizePath(a).startsWith(normalizePath(b));
}

const nodeModules = sep + 'node_modules';
/**
 * Returns the location of an existing _i18n folder next to or in the
 * folder hierarchy above the given path, if any.
 * @param env CDS environment configuration
 * @param filePath CDS source file path
 * @param cache If translation file mapping should be cached
 */
export function resolveCapI18nFolderForFile(root: string, env: CdsEnvironment, filePath: string): string | undefined {
    const { folders } = getI18nConfiguration(env);

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
        } else {
            if (!pathStartsWith(next, root)) {
                return undefined;
            }
        }
        return !next || next === path ? undefined : resolve(next);
    }
    return resolve(filePath);
}

/**
 * Merges i18n files for CDS source files
 * @param root project root
 * @param env CDS environment configuration
 * @param filePaths CDS file path
 */
export const getCapI18nFiles = (root: string, env: CdsEnvironment, filePaths: string[]): string[] => {
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
};

/**
 * Get an i18n folder for an existing CDS file. A new folder is created, if it does not exist
 *
 * @param root project root
 * @param path path to cds file
 * @param env CDS environment configuration
 */

export const getCapI18nFolder = async (root: string, path: string, env: CdsEnvironment): Promise<string> => {
    const { folders } = getI18nConfiguration(env);
    let i18nFolderPath = resolveCapI18nFolderForFile(root, env, join(root, path));
    if (!i18nFolderPath) {
        const folder = folders[0];
        i18nFolderPath = join(root, folder);
        await mkdir(i18nFolderPath);
    }
    return i18nFolderPath;
};

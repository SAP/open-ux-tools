import { ensureFileSync, pathExists, remove } from 'fs-extra';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { ToolsLogger } from '@sap-ux/logger';
const logger = new ToolsLogger();
import { hashElement } from 'folder-hash';

/**
 * Get absolute path of all contents of a project.
 *
 * @param root to a project
 * @returns absolute path of all contents of a project
 */
const getAllFileOrFolderPath = async (root: string): Promise<string[]> => {
    if (await pathExists(root)) {
        const fileOrFolder = await readdir(root);
        return fileOrFolder.map((item) => join(root, item));
    }
    return [];
};

const getFilterData = (root: string) =>
    ['node_modules', 'package-lock.json', 'packageJsonHash'].map((i) => join(root, i));

/**
 * Check if `node_modules` under project root exits.
 *
 * @param root project root
 * @returns boolean
 */
const nodeModulesExist = async (root: string): Promise<boolean> => {
    const modulePath = join(root, 'node_modules');
    const result = await pathExists(modulePath);

    if (result) {
        logger.info('node_modules: exists');
    } else {
        logger.info('node_modules: does not exist');
    }
    return result;
};

const getPackageJsonHash = async (root: string): Promise<string> => {
    const packageJsonPath = join(root, 'package.json');
    return (await hashElement(packageJsonPath)).hash;
};

/**
 * Get hash of `package.json` file from project root.
 *
 * @param root project root
 * @returns hash of `package.json` file
 */
const getHashForPackageJson = async (root: string): Promise<string> => {
    const hash = await getPackageJsonHash(root);
    logger.info(`package.json hash: ${hash}`);
    return hash;
};

/**
 * Read content of `packageJsonHash` file.
 *
 * @param root project root
 * @returns content of `packageJsonHash` file
 */
const readPackageJsonHash = async (root: string): Promise<string> => {
    const hashFilePath = join(root, 'packageJsonHash');
    ensureFileSync(hashFilePath);
    const hash = await readFile(hashFilePath, 'utf8');

    logger.info(`packageJsonHash: ${hash}`);
    return hash;
};

/**
 * Remove all contents of a project except `node_modules`, `package-lock.json` and `packageJsonHash`.
 *
 * @param root project root
 */
export const removeProjectContent = async (root: string): Promise<void> => {
    let fileOrFolder = await getAllFileOrFolderPath(root);
    const data = getFilterData(root);
    fileOrFolder = fileOrFolder.filter((item) => {
        if (!data.includes(item)) {
            return true;
        }
        return false;
    });
    for (const item of fileOrFolder) {
        await remove(item);
    }
};

/**
 * Remove `node_modules`, `package-lock.json` and `packageJsonHash`.
 *
 * @param root project root
 */
export const removeNodeModules = async (root: string): Promise<void> => {
    let fileOrFolder = await getAllFileOrFolderPath(root);
    const data = getFilterData(root);
    fileOrFolder = fileOrFolder.filter((item) => {
        if (data.includes(item)) {
            return true;
        }
        return false;
    });
    for (const item of fileOrFolder) {
        await remove(item);
    }
};

/**
 * Get destination project root. For a source project root like `/a/path/to/my-package/fixtures/my-project`
 * destination project root is `/../my-package/test/fixtures-copy/my-project`.
 *
 * @param sourceProjectRoot source project root
 * @returns project destination root
 */
export const getDestinationProjectRoot = (sourceProjectRoot: string): string => {
    const currentProcess = process.cwd();
    const projectName = sourceProjectRoot.split(sep).pop() ?? 'unknown';
    return join(currentProcess, 'test', 'fixtures-copy', projectName);
};

/**
 * Check if `node_modules` of the project is upto date.
 *
 * @param root project root
 * @returns boolean
 */
export const nodeModulesUpToDate = async (root: string): Promise<boolean> => {
    let result = false;
    if (await nodeModulesExist(root)) {
        const hash = await getHashForPackageJson(root);
        const hashOld = await readPackageJsonHash(root);

        result = hash === hashOld;
        if (result) {
            logger.info('node_modules: up to date');
        } else {
            logger.info('node_modules: outdated');
        }
    }

    return result;
};

/**
 * Save hash of `package.json` in `packageJsonHash` file.
 *
 * @param root project root
 * @returns void
 */
export const storePackageJsonHash = async (root: string): Promise<void> => {
    const hash = await getPackageJsonHash(root);

    const hashFilePath = join(root, 'packageJsonHash');
    await writeFile(hashFilePath, hash);
    logger.info(`packageJsonHash updated: ${hash}`);
};

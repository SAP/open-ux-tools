import { promises } from 'fs';
import { type Store, create } from 'mem-fs';
import { join } from 'path';

/**
 *
 * @param {string} root - project root
 * @returns - list of file path
 */
async function collectPaths(root: string): Promise<string[]> {
    const fileOrFolder = await promises.readdir(root);
    const children = await Promise.all(
        fileOrFolder.flatMap(async function (relativePath: string) {
            const path = join(root, relativePath);
            const stats = await promises.stat(path);
            if (stats.isDirectory()) {
                return collectPaths(path);
            } else {
                return Promise.resolve([path]);
            }
        })
    );

    return children.flat();
}
const projectCache = new Map<string, Store>();

/**
 *
 * @param {string} root - project root
 * @returns {Promise<Store>}
 */
export async function getStoreForProject(root: string): Promise<Store> {
    const cachedFileSystem = projectCache.get(root);
    if (cachedFileSystem) {
        return cachedFileSystem;
    }
    const fileSystem = create();
    const paths = await collectPaths(root);
    paths.forEach((path) => {
        fileSystem.get(path);
    });
    projectCache.set(root, fileSystem);
    return fileSystem;
}

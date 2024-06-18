import { promises } from 'fs';
import { join } from 'path';
import { create as createStore } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create as createEditor } from 'mem-fs-editor';

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

const projectCache = new Map<string, Record<string, string>>();

async function getFileSystemForProject(root: string): Promise<Record<string, string>> {
    const cachedFileSystem = projectCache.get(root);
    if (cachedFileSystem) {
        return cachedFileSystem;
    }
    const fileSystem: Record<string, string> = {};
    const paths = await collectPaths(root);
    const files = await Promise.all(
        paths.map(async (path) => {
            const content = await promises.readFile(path, { encoding: 'utf-8' });
            return { path, content };
        })
    );
    for (const { path, content } of files) {
        fileSystem[path] = content;
    }
    projectCache.set(root, fileSystem);
    return fileSystem;
}

export async function createFsEditorForProject(root: string): Promise<Editor> {
    const fs = await getFileSystemForProject(root);
    const editor = createEditor(createStore());
    Object.keys(fs).forEach((path) => {
        editor.write(path, fs[path]);
    });
    return editor;
}

import { readdirSync, statSync, promises } from 'fs';
import { join, dirname } from 'path';
import { platform } from 'os';
import { deserialize } from '../helper/deserialize-ast';
import { FileExtension } from './types';
const { readFile } = promises;

export const getBase = (parts: string[] = []): string => {
    try {
        const filePath = join(__dirname, '..', 'data', ...parts);
        if (statSync(filePath)) {
            return filePath;
        }
    } catch (error) {
        // executed through `test:update` command
        return join(__dirname, '..', '..', '..', '..', 'test', 'unit', 'data', ...parts);
    }

    return '';
};

export const getFileContent = async (filePath: string): Promise<string> => {
    const buffer = await readFile(filePath, 'utf8');
    return buffer.toString();
};

export const getInput = async (testCasePath: string, ext: FileExtension): Promise<string> => {
    const path = join(getBase(), testCasePath, `input${ext}`);
    return getFileContent(path);
};

export const getAllNormalizeFolderPath = (ext: FileExtension, base: string, allFolderPath: string[] = []): string[] => {
    const fileOrFolder = readdirSync(base);
    fileOrFolder.forEach(async function (item: string) {
        const itemPath = join(base, item);
        if (statSync(itemPath).isDirectory()) {
            allFolderPath = getAllNormalizeFolderPath(ext, itemPath, allFolderPath);
        } else {
            if (itemPath.endsWith(ext)) {
                const dirPath = dirname(itemPath);
                const relativeLike = dirPath.split(getBase())[1];
                const normalizedPath = relativeLike.replace(platform() === 'win32' ? /\\/g : /\//g, '/');
                allFolderPath.push(normalizedPath);
            }
        }
    });

    return allFolderPath;
};

export const getToken = async <T>(testCasePath: string): Promise<T> => {
    const path = join(getBase(), testCasePath, 'token.json');
    const content = await getFileContent(path);
    return deserialize<T>(content);
};
export const getAst = async <T>(testCasePath: string): Promise<T> => {
    const path = join(getBase(), testCasePath, 'ast.json');
    const content = await getFileContent(path);
    return deserialize<T>(content);
};

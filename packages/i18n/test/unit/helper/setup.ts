import { readdirSync, statSync, promises } from 'fs';
import { join, dirname, normalize } from 'path';
import { deserialize } from '../helper/deserialize-ast';
import type { FileExtension } from './types';
const { readFile } = promises;

/**
 * Get file base path.
 *
 * @param parts file path parts
 * @returns base
 */
export function getBase(parts: string[] = []): string {
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
}

/**
 * Get file content.
 *
 * @param filePath file path
 * @returns file content
 */
export async function getFileContent(filePath: string): Promise<string> {
    const buffer = await readFile(filePath, 'utf8');
    return buffer.toString();
}

/**
 * Get file content.
 *
 * @param testCasePath path to a test case
 * @param ext file extension
 * @returns file content
 */
export async function getInput(testCasePath: string, ext: FileExtension): Promise<string> {
    const path = join(getBase(), testCasePath, `input${ext}`);
    return getFileContent(path);
}

/**
 * Get normalized folder path.
 *
 * @param ext file extension
 * @param base base location to look for file
 * @param allFolderPath collect folder path
 * @returns array of normalized folder path
 */
export function getAllNormalizeFolderPath(ext: FileExtension, base: string, allFolderPath: string[] = []): string[] {
    const fileOrFolder = readdirSync(base);
    fileOrFolder.forEach(async (item: string) => {
        const itemPath = join(base, item);
        if (statSync(itemPath).isDirectory()) {
            allFolderPath = getAllNormalizeFolderPath(ext, itemPath, allFolderPath);
        } else if (itemPath.endsWith(ext)) {
            const dirPath = dirname(itemPath);
            const relativeLike = dirPath.split(getBase())[1];
            const normalizedPath = normalize(relativeLike);
            allFolderPath.push(normalizedPath);
        }
    });

    return allFolderPath;
}

/**
 * Get token.
 *
 * @param testCasePath path to a test case
 * @returns deserialized token
 */
export async function getToken<T>(testCasePath: string): Promise<T> {
    const path = join(getBase(), testCasePath, 'token.json');
    const content = await getFileContent(path);
    return deserialize<T>(content);
}
/**
 * Get AST.
 *
 * @param testCasePath path to a test case
 * @returns deserialized AST content
 */
export async function getAst<T>(testCasePath: string): Promise<T> {
    const path = join(getBase(), testCasePath, 'ast.json');
    const content = await getFileContent(path);
    return deserialize<T>(content);
}

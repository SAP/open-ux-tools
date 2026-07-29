/**
 * Utility for reading and accessing package.json files
 */
import { join } from 'node:path';
import { FileName } from '../../project-spec-types.js';
import { readJSON } from '../../index.js';

/**
 * Get package.json file path
 *
 * @param projectRoot
 */
export function getPackageJsonPath(projectRoot: string): string {
    return join(projectRoot, FileName.Package);
}

/**
 * Get package.json content
 *
 * @param filePath
 */
export async function getPackageJson(filePath: string): Promise<any> {
    return readJSON(getPackageJsonPath(filePath));
}

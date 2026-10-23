/**
 * Utility for reading and accessing package.json files
 */
import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
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
 * @param fs - mem-fs editor
 * @param filePath
 */
export function getPackageJson(fs: Editor, filePath: string): any {
    return readJSON(fs, getPackageJsonPath(filePath));
}

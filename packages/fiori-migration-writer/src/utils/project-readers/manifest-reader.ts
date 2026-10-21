/**
 * Utility for reading and accessing manifest.json files
 */
import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import { DirName, FileName } from '../../project-spec-types.js';
import type { Manifest } from '../../project-spec-types.js';
import { readJSON } from '../../index.js';

/**
 * Get manifest.json file path
 *
 * @param projectRoot
 * @param webappPath
 */
export function getManifestPath(projectRoot: string, webappPath: string): string {
    return join(projectRoot, webappPath ?? DirName.Webapp, FileName.Manifest);
}

/**
 * Get manifest.json content
 *
 * @param fs - mem-fs editor
 * @param projectRoot
 * @param webappPath
 */
export async function getManifestJson(fs: Editor, projectRoot: string, webappPath: string): Promise<Manifest> {
    // NOSONAR - async by contract: Promise<Manifest> signature shared with the injected reader and Project.getManifestJson
    const manifestPath = getManifestPath(projectRoot, webappPath);
    return readJSON(fs, manifestPath);
}

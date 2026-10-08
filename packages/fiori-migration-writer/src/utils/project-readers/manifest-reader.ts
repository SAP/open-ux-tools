/**
 * Utility for reading and accessing manifest.json files
 */
import { join } from 'node:path';
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
 * @param projectRoot
 * @param webappPath
 */
export function getManifestJson(projectRoot: string, webappPath: string): Manifest {
    const manifestPath = getManifestPath(projectRoot, webappPath);
    return readJSON(manifestPath);
}

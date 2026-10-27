/**
 * Utility for resolving webapp path from various project configuration sources
 */
import { join } from 'node:path';
import { parse } from 'yaml';
import type { MemFsEditor } from 'mem-fs-editor';
import { DirName, FileName } from '../../project-spec-types.js';
import { fileExists, readJSON } from '../../index.js';
import { readFile } from '../../utils/file-access.js';
import { sapWattCommonSetting } from '../../types.js';
import { MigrationTypes } from '../constants.js';

/**
 * Resolve webapp path from .project.json file
 *
 * @param fs - mem-fs editor
 * @param projectRoot
 */
async function resolveFromProjectJson(fs: MemFsEditor, projectRoot: string): Promise<string | undefined> {
    const projectJsonPath = join(projectRoot, '.project.json');
    if (!(await fileExists(fs, projectJsonPath))) {
        return undefined;
    }

    try {
        const projectJson = await readJSON(fs, projectJsonPath);
        if (projectJson?.hcpdeploy?.entryPath) {
            const projectWebappPath = join(projectRoot, projectJson.hcpdeploy.entryPath);
            return (await fileExists(fs, projectWebappPath)) ? projectJson.hcpdeploy.entryPath : undefined;
        }
    } catch (error: unknown) {
        // Invalid JSON, skip
    }
    return undefined;
}

/**
 * Resolve webapp path from .che/project.json file
 *
 * @param fs - mem-fs editor
 * @param projectRoot
 */
async function resolveFromCheProjectJson(fs: MemFsEditor, projectRoot: string): Promise<string | undefined> {
    const cheProjectJsonPath = join(projectRoot, '.che', 'project.json');
    if (!(await fileExists(fs, cheProjectJsonPath))) {
        return undefined;
    }

    try {
        const projectJson = await readJSON(fs, cheProjectJsonPath);
        if (projectJson?.attributes?.[sapWattCommonSetting]) {
            const settings: any = JSON.parse(projectJson.attributes[sapWattCommonSetting]?.[0]);
            if (settings?.hcpdeploy?.entryPath) {
                const projectWebappPath = join(projectRoot, settings.hcpdeploy.entryPath);
                return (await fileExists(fs, projectWebappPath)) ? settings.hcpdeploy.entryPath : undefined;
            }
        }
    } catch (error: unknown) {
        // Invalid JSON or parsing error, skip
    }
    return undefined;
}

/**
 * Resolve webapp path from ui5.yaml file
 *
 * @param fs - mem-fs editor
 * @param projectRoot
 */
function resolveFromUi5Yaml(fs: MemFsEditor, projectRoot: string): string | undefined {
    try {
        const yamlContent = readFile(fs, join(projectRoot, FileName.UI5Yaml));
        return parse(yamlContent)?.resources?.configuration?.paths?.webapp;
    } catch (error: unknown) {
        // File not found or invalid YAML, skip
    }
    return undefined;
}

/**
 * Resolve webapp path for library projects
 *
 * @param projectRoot
 * @param libPath
 */
function resolveForLibrary(projectRoot: string, libPath?: string): string | undefined {
    if (!libPath) {
        return undefined;
    }
    const libRelativePath = libPath.slice(projectRoot.length);
    return libRelativePath.length > 0 ? libRelativePath : undefined;
}

/**
 * Get webapp path for project
 * Tries multiple sources in order of priority
 *
 * @param fs - mem-fs editor
 * @param projectRoot
 * @param type
 * @param libPath
 */
export async function getWebappPath(
    fs: MemFsEditor,
    projectRoot: string,
    type?: MigrationTypes,
    libPath?: string
): Promise<string> {
    const defaultPath = join(projectRoot, DirName.Webapp);

    // Check if default webapp folder exists
    if (await fileExists(fs, defaultPath)) {
        return DirName.Webapp;
    }

    // Check if manifest.json is in root (no webapp folder)
    if (await fileExists(fs, join(projectRoot, FileName.Manifest))) {
        return '';
    }

    // Check for legacy Maven/Java structure: src/main/webapp
    const legacyMavenPath = join('src', 'main', DirName.Webapp);
    const legacyMavenFullPath = join(projectRoot, legacyMavenPath);
    if (await fileExists(fs, legacyMavenFullPath)) {
        // Verify it actually has webapp content (manifest.json)
        const legacyManifestPath = join(legacyMavenFullPath, FileName.Manifest);
        if (await fileExists(fs, legacyManifestPath)) {
            return legacyMavenPath;
        }
    }

    // Try library-specific path
    if (type === MigrationTypes.library) {
        const libWebappPath = resolveForLibrary(projectRoot, libPath);
        if (libWebappPath) {
            return libWebappPath;
        }
    }

    // Try .project.json
    const projectJsonPath = await resolveFromProjectJson(fs, projectRoot);
    if (projectJsonPath) {
        return projectJsonPath;
    }

    // Try .che/project.json
    const cheProjectJsonPath = await resolveFromCheProjectJson(fs, projectRoot);
    if (cheProjectJsonPath) {
        return cheProjectJsonPath;
    }

    // Try ui5.yaml
    const ui5YamlPath = resolveFromUi5Yaml(fs, projectRoot);
    if (ui5YamlPath) {
        return ui5YamlPath;
    }

    // Default fallback
    return DirName.Webapp;
}

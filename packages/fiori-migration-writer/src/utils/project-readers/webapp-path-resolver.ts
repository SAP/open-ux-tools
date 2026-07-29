/**
 * Utility for resolving webapp path from various project configuration sources
 */
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { parse } from 'yaml';
import { DirName, FileName } from '../../project-spec-types.js';
import { fileExists, readJSON, readFile } from '../../index.js';
import { sapWattCommonSetting } from '../../types.js';
import { MigrationTypes } from '../constants.js';

/**
 * Resolve webapp path from .project.json file
 *
 * @param projectRoot
 */
async function resolveFromProjectJson(projectRoot: string): Promise<string | undefined> {
    const projectJsonPath = join(projectRoot, '.project.json');
    if (!(await fileExists(projectJsonPath))) {
        return undefined;
    }

    try {
        const projectJson = await readJSON(projectJsonPath);
        if (projectJson?.hcpdeploy?.entryPath) {
            const projectWebappPath = join(projectRoot, projectJson.hcpdeploy.entryPath);
            return existsSync(projectWebappPath) ? projectJson.hcpdeploy.entryPath : undefined;
        }
    } catch {
        // Invalid JSON, skip
    }
    return undefined;
}

/**
 * Resolve webapp path from .che/project.json file
 *
 * @param projectRoot
 */
async function resolveFromCheProjectJson(projectRoot: string): Promise<string | undefined> {
    const cheProjectJsonPath = join(projectRoot, '.che', 'project.json');
    if (!(await fileExists(cheProjectJsonPath))) {
        return undefined;
    }

    try {
        const projectJson = await readJSON(cheProjectJsonPath);
        if (projectJson?.attributes?.[sapWattCommonSetting]) {
            const settings: any = JSON.parse(projectJson.attributes[sapWattCommonSetting]?.[0]);
            if (settings?.hcpdeploy?.entryPath) {
                const projectWebappPath = join(projectRoot, settings.hcpdeploy.entryPath);
                return existsSync(projectWebappPath) ? settings.hcpdeploy.entryPath : undefined;
            }
        }
    } catch {
        // Invalid JSON or parsing error, skip
    }
    return undefined;
}

/**
 * Resolve webapp path from ui5.yaml file
 *
 * @param projectRoot
 */
async function resolveFromUi5Yaml(projectRoot: string): Promise<string | undefined> {
    try {
        const yamlContent = await readFile(join(projectRoot, FileName.Ui5Yaml));
        return parse(yamlContent)?.resources?.configuration?.paths?.webapp;
    } catch {
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
 * @param projectRoot
 * @param type
 * @param libPath
 */
export async function getWebappPath(projectRoot: string, type?: MigrationTypes, libPath?: string): Promise<string> {
    const defaultPath = join(projectRoot, DirName.Webapp);

    // Check if default webapp folder exists
    if (await fileExists(defaultPath)) {
        return DirName.Webapp;
    }

    // Check if manifest.json is in root (no webapp folder)
    if (await fileExists(join(projectRoot, FileName.Manifest))) {
        return '';
    }

    // Try library-specific path
    if (type === MigrationTypes.library) {
        const libWebappPath = resolveForLibrary(projectRoot, libPath);
        if (libWebappPath) {
            return libWebappPath;
        }
    }

    // Try .project.json
    const projectJsonPath = await resolveFromProjectJson(projectRoot);
    if (projectJsonPath) {
        return projectJsonPath;
    }

    // Try .che/project.json
    const cheProjectJsonPath = await resolveFromCheProjectJson(projectRoot);
    if (cheProjectJsonPath) {
        return cheProjectJsonPath;
    }

    // Try ui5.yaml
    const ui5YamlPath = await resolveFromUi5Yaml(projectRoot);
    if (ui5YamlPath) {
        return ui5YamlPath;
    }

    // Default fallback
    return DirName.Webapp;
}

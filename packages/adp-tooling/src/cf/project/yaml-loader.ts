import fs from 'fs';
import yaml from 'js-yaml';

import type { Yaml } from '../../types';

/**
 * Parses the MTA file.
 *
 * @param {string} file - The file to parse.
 * @returns {Yaml} The parsed YAML content.
 */
export function parseMtaFile(file: string): Yaml {
    if (!fs.existsSync(file)) {
        throw new Error(`Could not find file ${file}`);
    }

    const content = fs.readFileSync(file, 'utf-8');
    let parsed: Yaml;
    try {
        parsed = yaml.load(content) as Yaml;
        return parsed;
    } catch (e) {
        throw new Error(`Error parsing file ${file}`);
    }
}

/**
 * Gets the project name from YAML content.
 *
 * @param {Yaml} yamlContent - The YAML content.
 * @returns {string | null} The project name or null if not found.
 */
export function getProjectName(yamlContent: Yaml): string | null {
    return yamlContent?.ID || null;
}

/**
 * Gets the project name for XS security from YAML content.
 *
 * @param {Yaml} yamlContent - The YAML content.
 * @param {string} timestamp - The timestamp to append.
 * @returns {string | null} The project name for XS security or null if not available.
 */
export function getProjectNameForXsSecurity(yamlContent: Yaml, timestamp: string): string | undefined {
    const projectName = getProjectName(yamlContent);
    if (!projectName || !timestamp) {
        return undefined;
    }
    return `${projectName.toLowerCase().replace(/\./g, '_')}_${timestamp}`;
}

/**
 * Static YAML content loader.
 * Handles loading and storing YAML content.
 */
export class YamlLoader {
    private static yamlContent: Yaml | null = null;

    /**
     * Gets the loaded YAML content.
     *
     * @param {string} filePath - The file path to load.
     * @param {boolean} [forceReload] - Whether to force reload and bypass cache.
     * @returns {Yaml} The YAML content.
     */
    public static getYamlContent(filePath: string, forceReload: boolean = false): Yaml {
        if (!this.yamlContent || forceReload) {
            this.yamlContent = parseMtaFile(filePath);
        }
        return this.yamlContent;
    }
}

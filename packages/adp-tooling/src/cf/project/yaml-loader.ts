import fs from 'node:fs';
import yaml from 'js-yaml';

import type { MtaYaml } from '../../types';

/**
 * Parses the MTA file.
 *
 * @param {string} filePath - The file to parse.
 * @returns {MtaYaml} The parsed YAML content.
 */
export function getYamlContent<T = MtaYaml>(filePath: string): T {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Could not find file ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    let parsed: T;
    try {
        parsed = yaml.load(content) as T;
        return parsed;
    } catch (e) {
        throw new Error(`Error parsing file ${filePath}: ${e.message}`);
    }
}

/**
 * Gets the project name from YAML content.
 *
 * @param {MtaYaml} yamlContent - The YAML content.
 * @returns {string | null} The project name or null if not found.
 */
export function getProjectName(yamlContent: MtaYaml): string | null {
    return yamlContent?.ID || null;
}

/**
 * Gets the project name for XS security from YAML content.
 *
 * @param {MtaYaml} yamlContent - The YAML content.
 * @param {string} timestamp - The timestamp to append.
 * @returns {string | null} The project name for XS security or null if not available.
 */
export function getProjectNameForXsSecurity(yamlContent: MtaYaml, timestamp: string): string | undefined {
    const projectName = getProjectName(yamlContent);
    if (!projectName || !timestamp) {
        return undefined;
    }
    return `${projectName.toLowerCase().replaceAll('.', '_')}_${timestamp}`;
}

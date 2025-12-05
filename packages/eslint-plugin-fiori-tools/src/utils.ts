import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseDocument } from 'yaml';
import * as process from 'process';

/**
 * Get resource paths for UI5 application or library based on ui5.yaml configuration.
 *
 * @returns Object containing sourceCodePath and optional testCodePath
 */
export const getResourcePaths = (): { sourceCodePath: string; testCodePath?: string } => {
    let sourceCodePath: string = 'webapp';
    let testCodePath: string | undefined;
    const projectRoot = process.cwd();
    const ui5YamlPath = join(projectRoot, 'ui5.yaml');
    if (existsSync(ui5YamlPath)) {
        const ui5Yaml = parseDocument(readFileSync(ui5YamlPath, { encoding: 'utf8' })).toJSON() as Record<string, any>;

        if (ui5Yaml.type === 'library') {
            sourceCodePath = 'src';
            testCodePath = 'test';
            if (ui5Yaml.resources?.configuration?.paths?.src) {
                sourceCodePath = ui5Yaml.resources.configuration.paths.src as string;
            }
            if (ui5Yaml.resources?.configuration?.paths?.test) {
                testCodePath = ui5Yaml.resources.configuration.paths.test as string;
            }
        } else if (ui5Yaml.resources?.configuration?.paths?.webapp) {
            sourceCodePath = ui5Yaml.resources.configuration.paths.webapp as string;
        }
    }
    return { sourceCodePath, testCodePath };
};

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parseDocument } from 'yaml';
import * as process from 'process';

export const getResourcePaths = (): { sourceCodePath: string; testCodePath?: string } => {
    let sourceCodePath: string = 'webapp';
    let testCodePath: string | undefined;
    const projectRoot = process.cwd();
    const ui5YamlPath = join(projectRoot, 'ui5.yaml');
    if (existsSync(ui5YamlPath)) {
        const ui5Yaml = parseDocument(readFileSync(ui5YamlPath, { encoding: 'utf8' })).toJSON();

        switch (ui5Yaml.type) {
            case 'library': {
                sourceCodePath = 'src';
                testCodePath = 'test';
                if (ui5Yaml.resources?.configuration?.paths?.src) {
                    sourceCodePath = ui5Yaml.resources.configuration.paths.src;
                }
                if (ui5Yaml.resources?.configuration?.paths?.test) {
                    testCodePath = ui5Yaml.resources.configuration.paths.test;
                }
                break;
            }
            default: {
                sourceCodePath = 'webapp';
                if (ui5Yaml.resources?.configuration?.paths?.webapp) {
                    sourceCodePath = ui5Yaml.resources.configuration.paths.webapp;
                }
                break;
            }
        }
    }
    return { sourceCodePath, testCodePath };
};

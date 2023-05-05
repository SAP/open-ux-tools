import { promises as fs, existsSync } from 'fs';
import { join } from 'path';
import { parseDocument } from 'yaml';
import * as process from 'process';

export const getWebAppPath = async (): Promise<string> => {
    let webappPath = 'webapp';
    const projectRoot = process.cwd();
    const ui5YamlPath = join(projectRoot, 'ui5.yaml');
    if (existsSync(ui5YamlPath)) {
        const ui5Yaml = parseDocument(await fs.readFile(ui5YamlPath, { encoding: 'utf8' })).toJSON();

        if (ui5Yaml.resources?.configuration?.paths?.webapp) {
            webappPath = ui5Yaml.resources.configuration.paths.webapp;
        }
    }
    return webappPath;
};

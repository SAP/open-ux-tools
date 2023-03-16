import { UI5Config } from '@sap-ux/ui5-config';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import { FileName } from '../constants';
import { fileExists, readFile } from '../file';

/**
 * Get path to webapp.
 *
 * @param projectRoot - root path, where package.json or ui5.yaml is
 * @param [memFs] - optional mem-fs editor instance
 * @returns - path to webapp folder
 */
export async function getWebappPath(projectRoot: string, memFs?: Editor): Promise<string> {
    let webappPath = join(projectRoot, 'webapp');
    const ui5YamlPath = join(projectRoot, FileName.Ui5Yaml);
    if (await fileExists(ui5YamlPath, memFs)) {
        const yamlString = await readFile(ui5YamlPath, memFs);
        const ui5Config = await UI5Config.newInstance(yamlString);
        const relativeWebappPath = ui5Config.getConfiguration()?.paths?.webapp;
        if (relativeWebappPath) {
            webappPath = join(projectRoot, relativeWebappPath);
        }
    }
    return webappPath;
}

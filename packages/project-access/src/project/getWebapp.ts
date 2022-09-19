import { join, posix } from 'path';
import { FileName } from '@sap-ux/project-types';
import { fileExists, readYAML } from '../file';

interface PartialUi5Yaml {
    resources?: { configuration?: { paths?: { webapp?: string } } };
}

/**
 * Get path to webapp.
 *
 * @param projectRoot - root path, where package.json or ui5.yaml is
 * @returns - path to webapp folder
 */
export async function getWebappPath(projectRoot: string): Promise<string> {
    let webappPath = join(projectRoot, 'webapp');
    const ui5YamlPath = join(projectRoot, FileName.Ui5Yaml);
    if (await fileExists(ui5YamlPath)) {
        const yamlDoc = await readYAML<PartialUi5Yaml>(ui5YamlPath);
        const relativeWebappPath = yamlDoc?.resources?.configuration?.paths?.webapp;
        if (relativeWebappPath) {
            webappPath = join(projectRoot, ...relativeWebappPath.split(posix.sep));
        }
    }
    return webappPath;
}

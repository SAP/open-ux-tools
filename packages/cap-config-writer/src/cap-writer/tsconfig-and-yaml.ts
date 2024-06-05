import { FileName } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';
import { YamlDocument, yamlDocumentToYamlString } from '@sap-ux/yaml';
import type { Logger } from '@sap-ux/logger';
import { join } from 'path';
import { t } from '../i18n';

/**
 * Updates the tsconfig.json file to correct the type roots when node_modules
 * are not found in the same directory as the application.
 *
 * @param {Editor} fs The file system editor.
 * @param {string} appRoot The root directory of the application.
 */
export function updateTsConfig(fs: Editor, appRoot: string): void {
    const tsConfigPath = join(appRoot, FileName.Tsconfig);
    if (fs.exists(tsConfigPath)) {
        const tsConfig: any = fs.readJSON(tsConfigPath);
        if (tsConfig['compilerOptions']['typeRoots']) {
            const typeRoots = tsConfig['compilerOptions']['typeRoots'];
            const updatedTypeRoots = typeRoots.map((entry: string) => {
                return entry.replace(/\.\//g, '../../');
            });

            // Update the tsconfig.json file
            fs.extendJSON(tsConfigPath, {
                compilerOptions: {
                    typeRoots: [...typeRoots, ...updatedTypeRoots]
                }
            });
        }
    }
}

/**
 * Updates the application YAML file by adding static resource locations if not already present.
 *
 * @param {Editor} fs The file system editor instance.
 * @param {string} applicationYamlPath The path to the application YAML file.
 * @param {string} capCustomPathsApp The custom paths for CAP application.
 * @param {Logger} [logger] The logger instance for logging errors.
 * @returns {void}
 */
export async function updateStaticLocationsInApplicationYaml(
    fs: Editor,
    applicationYamlPath: string,
    capCustomPathsApp: string,
    logger?: Logger
): Promise<void> {
    try {
        const applicationYamlDocuments = fs.read(applicationYamlPath).toString();
        const yamlDoc = await YamlDocument.newInstance(applicationYamlDocuments);
        const stringifiedYaml = JSON.stringify(yamlDoc);
        const parsedApplicationYamlDocuments = JSON.parse(stringifiedYaml).documents;
        if (
            parsedApplicationYamlDocuments.length === 1 &&
            parsedApplicationYamlDocuments[0].spring['web.resources.static-locations'] === undefined
        ) {
            const applicationYamlFirstDocument = parsedApplicationYamlDocuments[0];
            applicationYamlFirstDocument.spring['web.resources.static-locations'] = `file:./${capCustomPathsApp}`;
            fs.write(applicationYamlPath, yamlDocumentToYamlString(applicationYamlFirstDocument));
        }
    } catch (error) {
        logger?.error(t('error.updateApplicationYaml', { error: error }));
    }
}

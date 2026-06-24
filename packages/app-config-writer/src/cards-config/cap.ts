import { basename, join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { FileName, readUi5Yaml } from '@sap-ux/project-access';
import { getPreviewMiddleware, getIntentFromPreviewConfig } from '../common/utils.js';
import type { MiddlewareConfig as PreviewConfig } from '@sap-ux/preview-middleware';
import { writeCdsWatchScript } from '../common/cap-utils.js';

/**
 * Writes the `start-cards-generator-<appFolderName>` script to the CAP root `package.json`.
 * Uses `cds watch --open "<appId><cardGeneratorPath><intent>"` so the app is opened
 * via the CDS development server rather than a standalone UI5 tooling server.
 *
 * @param capRoot - path to the CAP project root
 * @param appId - sap.app.id from the app's manifest.json (used as the URL prefix)
 * @param appFolderName - basename of the app folder (used as the script name suffix)
 * @param basePath - path to the UI5 app root (where ui5.yaml lives)
 * @param fs - mem-fs-editor instance
 * @param yamlPath - optional path to the ui5*.yaml file
 * @param logger - optional logger
 */
export async function updateCapRootPackageJsonForCards(
    capRoot: string,
    appId: string,
    appFolderName: string,
    basePath: string,
    fs: Editor,
    yamlPath?: string,
    logger?: ToolsLogger
): Promise<void> {
    const capRootPackageJsonPath = join(capRoot, 'package.json');
    if (!fs.exists(capRootPackageJsonPath)) {
        throw new Error(`package.json not found at CAP root: ${capRoot}`);
    }

    const ui5YamlFile = yamlPath ? basename(yamlPath) : FileName.Ui5Yaml;
    const ui5YamlConfig = await readUi5Yaml(basePath, ui5YamlFile, fs);
    const previewMiddleware = await getPreviewMiddleware(ui5YamlConfig, basePath, ui5YamlFile, fs);

    const intent = getIntentFromPreviewConfig(previewMiddleware?.configuration) ?? '#app-preview';
    const cardGeneratorPath =
        (previewMiddleware?.configuration as PreviewConfig)?.editors?.cardGenerator?.path ??
        '/test/flpCardGeneratorSandbox.html';

    writeCdsWatchScript(
        capRoot,
        `start-cards-generator-${appFolderName}`,
        `${appId}${cardGeneratorPath}${intent}`,
        fs,
        logger
    );
}

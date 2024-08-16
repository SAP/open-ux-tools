import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { generateCustomPage } from '@sap-ux/fe-fpm-writer';
import type { FioriElementsApp, FPMSettings } from './types';
import { UI5Config } from '@sap-ux/ui5-config';
/**
 * Processes the template for the Flexible Programming Model (FPM).
 * Generates a custom page and updates the UI5 local yaml for OData v4.
 *
 * @param feApp - The FE application configuration object.
 * @param basePath - The base path where the generated files will be placed.
 * @param fs - The file system object used for file operations.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export async function fpmConfig<T extends {}>(feApp: FioriElementsApp<T>, basePath: string, fs: Editor): Promise<void> {
    const config: FPMSettings = feApp.template.settings as unknown as FPMSettings;
    generateCustomPage(
        basePath,
        {
            entity: config.entityConfig.mainEntityName,
            name: config.pageName,
            minUI5Version: feApp.ui5?.minUI5Version,
            typescript: feApp.appOptions?.typescript
        },
        fs
    );
    const ui5LocalConfigPath = join(basePath, 'ui5-local.yaml');
    const ui5LocalConfig = await UI5Config.newInstance(fs.read(ui5LocalConfigPath));
    ui5LocalConfig.addUI5Libs(['sap.fe.templates']);
    fs.write(ui5LocalConfigPath, ui5LocalConfig.toString());
}

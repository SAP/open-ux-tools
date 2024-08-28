import type { Editor } from 'mem-fs-editor';
import { generateCustomPage } from '@sap-ux/fe-fpm-writer';
import type { FioriElementsApp, FPMSettings } from './types';
/**
 * Processes the template for the Flexible Programming Model (FPM).
 * Generates a custom page and updates the UI5 local yaml.
 *
 * @param feApp - the FE app config
 * @param basePath - the absolute target path where the application will be generated
 * @param fs - reference to a mem-fs editor
 * @returns {Promise<void>}
 */
export async function generateFpmConfig<T extends {}>(
    feApp: FioriElementsApp<T>,
    basePath: string,
    fs: Editor
): Promise<void> {
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
}

import readPkgUp from 'read-pkg-up';
import { TemplateType, TableType, Template, TableSelectionMode, ALPSettingsV2, FioriElementsApp } from '../types';
import { getBaseComponent, getUi5Libs } from './templateAttributes';

/**
 * Updates the template settings to defaults if not provided.
 *
 * @param template - The template to be updated
 * @returns Updated template settings
 */
export function setDefaultTemplateSettings<T>(template: Template<T>): T {
    const templateSettings = template.settings;
    if (template.type === TemplateType.AnalyticalListPage) {
        const alpSettings = template.settings as Partial<ALPSettingsV2>;

        Object.assign(templateSettings, {
            tableType: alpSettings.tableType || TableType.ANALYTICAL,
            multiSelect: alpSettings.multiSelect ?? false,
            selectionMode: alpSettings.selectionMode || TableSelectionMode.NONE,
            qualifier: alpSettings.qualifier,
            autoHide: alpSettings.autoHide ?? true,
            smartVariantManagement: alpSettings.smartVariantManagement ?? false
        });
    }
    return templateSettings;
}

/**
 * Sets defaults for the specified Fiori elements application.
 *
 * @param feApp - Fiori elements application config
 * @returns Fiori elements app config with updated defaults for unspecified properties
 */
export function setAppDefaults<T>(feApp: FioriElementsApp<T>): FioriElementsApp<T> {
    // Add template information
    if (!feApp.app.sourceTemplate?.version || !feApp.app.sourceTemplate?.id) {
        const packageInfo = readPkgUp.sync({ cwd: __dirname });
        feApp.app.sourceTemplate = {
            id: `${packageInfo?.packageJson.name}:${feApp.template.type}`,
            version: packageInfo?.packageJson.version
        };
    }

    // Generate base UI5 project
    feApp.app.baseComponent = feApp.app.baseComponent || getBaseComponent(feApp.template.type, feApp.service.version);

    // Add ui5 libs for specified template and odata version
    // Dups will be removed by call to `generateUI5Project`
    feApp.ui5 = {
        ...feApp.ui5,
        ui5Libs: getUi5Libs(feApp.template.type, feApp.service.version)?.concat(feApp.ui5?.ui5Libs ?? [])
    };

    // All fiori-elements apps should use load reuse libs, unless explicitly overridden
    feApp.appOptions = Object.assign({ loadReuseLibs: true }, feApp.appOptions);

    if (!feApp.service.localAnnotationsName) {
        feApp.service.localAnnotationsName = 'annotation';
    }

    return feApp;
}

import { OdataVersion } from '@sap-ux/odata-service-writer';
import readPkgUp from 'read-pkg-up';
import type { ALPSettings, ALPSettingsV2, ALPSettingsV4, FioriElementsApp, Template } from '../types';
import { TableSelectionMode, TableType, TemplateType } from '../types';
import { getBaseComponent, getUi5Libs } from './templateAttributes';

/**
 * Updates the template settings to defaults if not provided.
 *
 * @param template - The template to be updated
 * @param odataVersion - may be used to determine the default properties set
 * @returns Updated template settings
 */
export function setDefaultTemplateSettings<T>(template: Template<T>, odataVersion?: OdataVersion): T {
    const templateSettings = template.settings;
    if (template.type === TemplateType.AnalyticalListPage) {
        const alpSettings: ALPSettings = template.settings as unknown as ALPSettings;

        Object.assign(templateSettings, {
            tableType: alpSettings.tableType || TableType.ANALYTICAL // Overrides the UI5 default: ''
        });

        if (odataVersion === OdataVersion.v4) {
            const alpV4Settings: ALPSettingsV4 = template.settings as unknown as ALPSettingsV4;
            Object.assign(templateSettings, {
                selectionMode: alpV4Settings.selectionMode || TableSelectionMode.NONE
            });
            return templateSettings;
        }

        if (odataVersion === OdataVersion.v2) {
            const alpSettingsv2: ALPSettingsV2 = template.settings as unknown as ALPSettingsV2;
            Object.assign(templateSettings, {
                multiSelect: alpSettingsv2.multiSelect,
                qualifier: alpSettingsv2.qualifier,
                autoHide: alpSettingsv2.autoHide,
                smartVariantManagement: alpSettingsv2.smartVariantManagement
            });
            return templateSettings;
        }
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

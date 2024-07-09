import { OdataVersion, ServiceType } from '@sap-ux/odata-service-writer';
import type { OdataService } from '@sap-ux/odata-service-writer';
import readPkgUp from 'read-pkg-up';
import type {
    ALPSettings,
    ALPSettingsV2,
    ALPSettingsV4,
    FioriElementsApp,
    LROPSettings,
    Template,
    WorklistSettings
} from '../types';
import { TableSelectionMode, TableType, TemplateType } from '../types';
import { getBaseComponent, getTemplateUi5Libs, TemplateTypeAttributes } from './templateAttributes';
import { getAnnotationV4Libs } from './annotationReuseLibs';

const defaultModelName = 'mainModel'; // UI5 default model name is '' but some floorplans require a named default model

/**
 * Updates the template settings to defaults if not provided.
 *
 * @param template - The template to be updated
 * @param odataVersion - may be used to determine the default properties set
 * @returns Updated template settings
 */
export function setDefaultTemplateSettings<T extends {}>(template: Template<T>, odataVersion?: OdataVersion): T {
    const templateSettings = template.settings;
    if (template.type === TemplateType.AnalyticalListPage) {
        const alpSettings: ALPSettings = template.settings as unknown as ALPSettings;

        Object.assign(templateSettings, {
            tableType: alpSettings.tableType ?? TableType.ANALYTICAL // Overrides the UI5 default: ''
        });

        if (odataVersion === OdataVersion.v4) {
            const alpV4Settings: ALPSettingsV4 = template.settings as unknown as ALPSettingsV4;
            Object.assign(templateSettings, {
                selectionMode: alpV4Settings.selectionMode ?? TableSelectionMode.NONE
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
    } else if (template.type === TemplateType.ListReportObjectPage || template.type === TemplateType.Worklist) {
        const tableSettings: WorklistSettings | LROPSettings = template.settings as unknown as
            | WorklistSettings
            | LROPSettings;
        Object.assign(templateSettings, {
            tableType: tableSettings.tableType ?? TableType.RESPONSIVE // Overrides the UI5 default: ''
        });

        if (tableSettings.tableType !== TableType.TREE) {
            delete tableSettings.hierarchyQualifier;
        }
    }
    return templateSettings;
}

/**
 * Gets the required UI5 libs for the specified template type and OData version.
 *
 * @param type - The template type of the required base component
 * @param version - The odata service version determines the appropriate base component to use
 * @param ui5Libs - ui5 libs
 * @returns The UI5 libs required by the specified template type and OData version and UI5 annotation libs
 */
export function getUi5Libs(type: TemplateType, version: OdataVersion, ui5Libs?: string | string[]): string[] {
    const templateLibs = getTemplateUi5Libs(type, version);
    return [...templateLibs].concat(ui5Libs ?? []);
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
            version: packageInfo?.packageJson.version,
            toolsId: feApp.app.sourceTemplate?.toolsId
        };
    }

    // Generate base UI5 project
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    feApp.app.baseComponent = feApp.app.baseComponent || getBaseComponent(feApp.template.type, feApp.service.version);

    const ui5ReuseLibs =
        feApp.service.version === OdataVersion.v4 && feApp.service.metadata
            ? getAnnotationV4Libs(feApp.service.metadata)
            : [];

    // Add ui5 libs for specified template and odata version
    // Dups will be removed by call to `generateUI5Project`
    feApp.ui5 = {
        ...feApp.ui5,
        ui5Libs: getUi5Libs(feApp.template.type, feApp.service.version, feApp.ui5?.ui5Libs).concat(ui5ReuseLibs),
        ui5ReuseLibs: ui5ReuseLibs
    };

    // Assign a default annotation name if the service type is EDMX and no local annotation name is provided
    let serviceType = feApp.service.type;
    serviceType ||= ServiceType.EDMX;
    if (serviceType === ServiceType.EDMX && !feApp.service.localAnnotationsName) {
        feApp.service.localAnnotationsName = 'annotation';
    }

    // OVP must use a named default model
    if (feApp.template.type === TemplateType.OverviewPage) {
        (feApp.service as OdataService).model = defaultModelName;
    }

    // minimum UI5 version depending on the template required
    feApp.ui5 = feApp.ui5 ?? {};
    if (!feApp.ui5.minUI5Version) {
        feApp.ui5.minUI5Version =
            feApp.ui5.version ?? TemplateTypeAttributes[feApp.template.type].minimumUi5Version[feApp.service.version]!;
    }

    // if not explicitly disabled, enable the SAP Fiori tools
    feApp.appOptions = feApp.appOptions ?? {};
    if (feApp.appOptions.sapux !== false) {
        feApp.appOptions.sapux = true;
    }

    return feApp;
}

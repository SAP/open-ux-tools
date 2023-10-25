import { OdataVersion, TemplateType } from '../types';

// first version with SAP Fiori 3 theme
export const oldestSupportedUI5Version = '1.65.0';

export const changesPreviewToVersion = '1.78.0';

// Internal template generation options
export type TemplateOptions = {
    changesPreview?: boolean;
    changesLoader?: boolean;
};

// Specific escaping is required for FLP texts in flpSandbox.html template file
// Escapes '\' with '\\\\' and '"' with '\"' to correctly render inputs in a secure way
export const escapeFLPText = (s: string): string => s.replace(/\\/g, '\\\\').replace(/(")/g, '\\$&');

const appComponentLibGeneric = 'sap/suite/ui/generic/template/lib/AppComponent';
const appComponentLibOVP = 'sap/ovp/app/Component';
const appComponentLibFioriElements = 'sap/fe/core/AppComponent';

type FrameworkLibs = Record<OdataVersion, string[]>;

const commonUi5Libs: FrameworkLibs = {
    [OdataVersion.v2]: [
        'sap.m',
        'sap.ushell',
        'sap.ui.core',
        'sap.f',
        'sap.ui.comp',
        'sap.ui.generic.app',
        'sap.suite.ui.generic.template'
    ],
    [OdataVersion.v4]: ['sap.m', 'sap.ushell', 'sap.fe.templates']
};

type TemplateLibsEntry = {
    baseComponent: string; // Base component lib path
    ui5Libs: string[]; // Framework (OdataVersion) libraries
};

type TemplateLibs = {
    [V in OdataVersion]: {
        [T in TemplateType]?: TemplateLibsEntry;
    };
};

const templateLibs: TemplateLibs = {
    [OdataVersion.v2]: {
        [TemplateType.AnalyticalListPage]: {
            baseComponent: appComponentLibGeneric,
            ui5Libs: [...commonUi5Libs[OdataVersion.v2]]
        },
        [TemplateType.ListReportObjectPage]: {
            baseComponent: appComponentLibGeneric,
            ui5Libs: [...commonUi5Libs[OdataVersion.v2]]
        },
        [TemplateType.OverviewPage]: {
            baseComponent: appComponentLibOVP,
            ui5Libs: [...commonUi5Libs[OdataVersion.v2], 'sap.ovp', 'sap.ui.rta', 'sap.ui.layout']
        },
        [TemplateType.Worklist]: {
            baseComponent: appComponentLibGeneric,
            ui5Libs: [...commonUi5Libs[OdataVersion.v2], 'sap.collaboration']
        }
    },
    [OdataVersion.v4]: {
        [TemplateType.ListReportObjectPage]: {
            baseComponent: appComponentLibFioriElements,
            ui5Libs: commonUi5Libs[OdataVersion.v4]
        },
        [TemplateType.FormEntryObjectPage]: {
            baseComponent: appComponentLibFioriElements,
            ui5Libs: commonUi5Libs[OdataVersion.v4]
        },
        [TemplateType.AnalyticalListPage]: {
            baseComponent: appComponentLibFioriElements,
            ui5Libs: commonUi5Libs[OdataVersion.v4]
        },
        [TemplateType.Worklist]: {
            baseComponent: appComponentLibFioriElements,
            ui5Libs: commonUi5Libs[OdataVersion.v4]
        },
        [TemplateType.OverviewPage]: {
            baseComponent: appComponentLibOVP,
            ui5Libs: [...commonUi5Libs[OdataVersion.v4], 'sap.ovp', 'sap.ui.rta', 'sap.ui.layout']
        },
        [TemplateType.FlexibleProgrammingModel]: {
            baseComponent: appComponentLibFioriElements,
            ui5Libs: [...commonUi5Libs[OdataVersion.v4], 'sap.fe.templates']
        }
    }
};

/**
 * Gets the base UI5 component path that supports the specified template.
 *
 * @param type - The template type of the required base component
 * @param version - The odata service version determines the appropriate base component to use
 * @returns The base component library path
 */
export function getBaseComponent(type: TemplateType, version: OdataVersion): string | undefined {
    return templateLibs[version][type]?.baseComponent;
}

/**
 * Gets the required UI5 libs for the specified template type and OData version.
 *
 * @param type - The template type of the required base component
 * @param version - The odata service version determines the appropriate base component to use
 * @returns The Ui5 libs required by the specified template type and OData version
 */
export function getUi5Libs(type: TemplateType, version: OdataVersion): string[] | undefined {
    return templateLibs[version][type]?.ui5Libs;
}

// Additional attributes associated with TemplateType
type TemplateAttributes = {
    [K in TemplateType]: {
        supportedODataVersions: OdataVersion[]; // OdataVersions applicable to the specifc template type
        minimumUi5Version: {
            [V in OdataVersion]?: string; // Minimum UI5 Versions required for the specific OdataVersion
        };
    };
};

export const TemplateTypeAttributes: TemplateAttributes = {
    [TemplateType.Worklist]: {
        supportedODataVersions: [OdataVersion.v2, OdataVersion.v4],
        minimumUi5Version: {
            [OdataVersion.v2]: oldestSupportedUI5Version,
            [OdataVersion.v4]: '1.99.0'
        }
    },
    [TemplateType.ListReportObjectPage]: {
        supportedODataVersions: [OdataVersion.v2, OdataVersion.v4],
        minimumUi5Version: {
            [OdataVersion.v2]: oldestSupportedUI5Version,
            [OdataVersion.v4]: '1.84.0'
        }
    },
    [TemplateType.AnalyticalListPage]: {
        supportedODataVersions: [OdataVersion.v2, OdataVersion.v4],
        minimumUi5Version: {
            [OdataVersion.v2]: oldestSupportedUI5Version,
            [OdataVersion.v4]: '1.90.0'
        }
    },
    [TemplateType.OverviewPage]: {
        supportedODataVersions: [OdataVersion.v2, OdataVersion.v4],
        minimumUi5Version: {
            [OdataVersion.v2]: oldestSupportedUI5Version,
            [OdataVersion.v4]: '1.96.8'
        }
    },
    [TemplateType.FormEntryObjectPage]: {
        supportedODataVersions: [OdataVersion.v4],
        minimumUi5Version: {
            [OdataVersion.v4]: '1.90.0'
        }
    },
    [TemplateType.FlexibleProgrammingModel]: {
        supportedODataVersions: [OdataVersion.v4],
        minimumUi5Version: {
            [OdataVersion.v4]: '1.94.0'
        }
    }
};

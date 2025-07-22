import type { IPrompt as Step } from '@sap-devx/yeoman-ui-types';
import { TemplateType as FETemplateType } from '@sap-ux/fiori-elements-writer';
import { TemplateType as FFTemplateType } from '@sap-ux/fiori-freestyle-writer';
import { AppConfig, type Floorplan, FloorplanFE, FloorplanFF } from '@sap-ux/fiori-generator-shared';
import type { CapRuntime, EntityRelatedAnswers } from '@sap-ux/odata-service-inquirer';
import { OdataVersion } from '@sap-ux/odata-service-inquirer';
import {
    promptNames as ui5AppInquirerPromptNames,
    type UI5ApplicationPromptOptions
} from '@sap-ux/ui5-application-inquirer';
import type { Answers } from 'inquirer';
import { LEGACY_CAP_TYPE_JAVA, LEGACY_CAP_TYPE_NODE } from './constants';
import { type ALPOptions, type Project, type Service } from './state';

export { Floorplan, FloorplanFE, FloorplanFF };

type FloorplanAttributesType = {
    [K in Floorplan]: {
        supportedODataVersion: OdataVersion[];
        deprecated?: boolean; // Floorplan is deprecated, if property is present present and true
        templateType: FETemplateType | FFTemplateType; // Maps App Gen Floorplan to @sap-ux template types
    };
};

export const FloorplanAttributes: FloorplanAttributesType = {
    [FloorplanFE.FE_LROP]: {
        supportedODataVersion: [OdataVersion.v2, OdataVersion.v4],
        templateType: FETemplateType.ListReportObjectPage
    },
    [FloorplanFE.FE_ALP]: {
        supportedODataVersion: [OdataVersion.v2, OdataVersion.v4],
        templateType: FETemplateType.AnalyticalListPage
    },
    [FloorplanFE.FE_WORKLIST]: {
        supportedODataVersion: [OdataVersion.v2, OdataVersion.v4],
        templateType: FETemplateType.Worklist
    },
    [FloorplanFE.FE_FEOP]: {
        supportedODataVersion: [OdataVersion.v4],
        templateType: FETemplateType.FormEntryObjectPage
    },
    [FloorplanFE.FE_OVP]: {
        supportedODataVersion: [OdataVersion.v2, OdataVersion.v4],
        templateType: FETemplateType.OverviewPage
    },
    [FloorplanFE.FE_FPM]: {
        supportedODataVersion: [OdataVersion.v4],
        templateType: FETemplateType.FlexibleProgrammingModel
    },
    [FloorplanFF.FF_SIMPLE]: {
        supportedODataVersion: [OdataVersion.v2, OdataVersion.v4],
        templateType: FFTemplateType.Basic
    }
};

/**
 * Defines the entity config property of the external app config interface used to generate in headless mode (no prompts)
 */
export interface EntityConfig {
    mainEntity?: { entityName: string; type?: any };
    filterEntityType?: string;
    navigationEntity?: {
        EntitySet: string;
        Name: string;
        Role?: string;
    };
    generateFormAnnotations?: boolean;
    generateLROPAnnotations?: boolean;
    qualifier?: string;
    tableType?: EntityRelatedAnswers['tableType'];
    hierarchyQualifier?: string;
}

/**
 * Defines the external interface used to generate in headless mode (no prompts)
 * This is a deliberate re-definition of internal interfaces to avoid consumers having
 * to update when internal interfaces are changed
 * NOTE: Any breaking changes to this interface require a version bump
 */
export interface FEAppConfig extends AppConfig {
    readonly entityConfig: EntityConfig;
    readonly alpOptions?: ALPOptions;
}
/**
 * Defines the external interface used to generate in headless mode (no prompts)
 * This is a deliberate re-definition of internal interfaces to avoid consumers having
 * to update when internal interfaces are changed
 * NOTE: Any breaking changes to this interface require a version bump
 */
export interface FFAppConfig extends AppConfig {
    project: AppConfig['project'] & {
        readonly viewName?: string;
    };
    // Since FF may not have a datasource defined service is optional
    service?: AppConfig['service'];
}

/**
 * Checks the capType provided for headless generation and converts
 * to the new version (Node.js, Java) if required. Defaults to `Node.js` if not provided.
 *
 * @param capType - legacyCapType (capNode, capJava) OR cds runtime (Node.js, Java)
 * @returns - CapRuntime (Node.js, Java)
 */
export function capTypeConversion(capType?: string): CapRuntime {
    if (capType === LEGACY_CAP_TYPE_NODE || capType === 'Node.js') {
        return 'Node.js';
    } else if (capType === LEGACY_CAP_TYPE_JAVA || capType === 'Java') {
        return 'Java';
    }
    return 'Node.js';
}

/**
 * Externally configurable generator settings, can be passed as options or by providing _getSettings() in generator extensions
 *
 * @deprecated These are legacy settings and should be provided via generator extensions if they relate to S/4 explicitly.
 * In some cases they should be directly set as prompt options (e.g. from adaptors).
 * See for example: https://github.wdf.sap.corp/ux-engineering/s4-fiori-tools-extensions/issues/385 .
 * We can directly set the hiding of ui5 version prompt from inquirer prompt options via the extensions interface instead of a specific setting.
 *
 * NOTE: Only options specific to FE/FF generators should be passed as options, all other options should be provided via generator extensions
 */
export interface FioriGeneratorSettings {
    /**
     * Toggles the generation of index.html and excludes the start-noflp script from package.json
     */
    generateIndexHtml?: boolean;
    /**
     * Entity passed in to be set as the default in the (FE) mainEntity prompt
     */
    preselectedEntityName?: string;
    /**
     * Toggles whether a warning is shown if the service is draft enabled but does not support collaborative draft.
     */
    showCollabDraftWarning?: boolean;
    /**
     * Toggles Table Type prompt and layout options for LROP, Worklist and ALP floorplans
     */
    showLayoutPrompts?: boolean;
}

export interface FioriGeneratorPromptExtension {
    [generatorName: string]: UI5ApplicationPromptOptions;
}

export interface ConditionalStep extends Step {
    /**
     * Provide a function which returns true when a step should be added, answers to previous questions will be provided
     *
     * @param answers
     * @returns
     */
    when?: (answers?: Answers) => boolean;
}

/**
 * Defines the API to extend and customise the Fiori Generator
 *
 */
export interface FioriGeneratorExtensionAPI {
    /**
     * Returns the settings to control some prompt and generation options
     */
    _getSettings?: () => FioriGeneratorSettings;
    /**
     * Returns the extensions which extend existing Fiori generator prompts
     */
    _getExtensions?: () => FioriGeneratorPromptExtension;
    /**
     * Returns the navigation steps which group new prompts provided in the prompting phase
     */
    _getSteps?: () => ConditionalStep[];
    /**
     * Opt in for extension Telemetry
     * Enabling this will result in SAP capturing extension name and version
     */
    enableTelemetryData?: boolean;
}

export type RecursiveReadonly<T> = {
    readonly [P in keyof T]: RecursiveReadonly<T[P]>;
};

/**
 * Fiori Elements internal floorplan/template/project types
 *
 * @deprecated Use FloorplanFE instead, will be removed shortly
 */
export enum PROJECT_TYPE {
    Worklist = FloorplanFE.FE_WORKLIST,
    OverviewPage = FloorplanFE.FE_OVP,
    ListReportObjectPage = FloorplanFE.FE_LROP,
    AnalyticalListPage = FloorplanFE.FE_ALP,
    FormEntryObjectPage = FloorplanFE.FE_FEOP,
    FlexibleProgrammingModel = FloorplanFE.FE_FPM
}

/**
 * Fiori Freestyle internal floorplan/template/project types
 *
 * @deprecated Use FloorplanFF instead, will be removed shortly
 */
export enum Template {
    Simple = FloorplanFF.FF_SIMPLE
}

/**
 * To support deprecation of the project properties `projectType` from `@sap/generator-fiori-elements`
 * and `template` from `@sap/generator-fiori-freestyle`, which used to be sub-generator specific, before merging the generators,
 * adding the same properties to the exported ReadonlyState that is used by extensions to maintain compatibility with existing extensions.
 * These will be removed in future.
 */
interface DeprecatedProjectProperties {
    /**
     * @deprecated Use ReadonlyState.floorplan instead
     */
    projectType?: PROJECT_TYPE;
    /**
     * @deprecated Use ReadonlyState.floorplan instead
     */
    template?: Template;
}
/**
 * Export of internal Fiori generator state with all properties marked as readonly.
 * For use with sub-generator extensions.
 */
export interface ReadonlyState {
    readonly project: RecursiveReadonly<Partial<Project>> & DeprecatedProjectProperties;
    readonly service: RecursiveReadonly<Partial<Service>>;
    readonly entityRelatedConfig?: RecursiveReadonly<EntityRelatedAnswers>;
    readonly floorplan: Floorplan;
}

export const defaultPromptValues = {
    [ui5AppInquirerPromptNames.enableCodeAssist]: false,
    [ui5AppInquirerPromptNames.enableEslint]: false,
    [ui5AppInquirerPromptNames.skipAnnotations]: false,
    [ui5AppInquirerPromptNames.enableTypeScript]: false
};

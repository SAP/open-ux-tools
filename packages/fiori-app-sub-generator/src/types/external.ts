import type { IPrompt as Step } from '@sap-devx/yeoman-ui-types';
import type { Annotations } from '@sap-ux/axios-extension';
import { TemplateType as FETemplateType } from '@sap-ux/fiori-elements-writer';
import { TemplateType as FFTemplateType } from '@sap-ux/fiori-freestyle-writer';
import type { PromptSeverityMessage } from '@sap-ux/inquirer-common';
import type { CapRuntime, EntityRelatedAnswers } from '@sap-ux/odata-service-inquirer';
import { OdataVersion } from '@sap-ux/odata-service-inquirer';
import { promptNames as ui5AppInquirerPromptNames } from '@sap-ux/ui5-application-inquirer';
import type { Answers, Question } from 'inquirer';
import { LEGACY_CAP_TYPE_JAVA, LEGACY_CAP_TYPE_NODE } from './constants';
import type { ALPOptions, Project, Service } from './state';

// Union types to expose a single interface property for Floorplan
// This provides a layer of abstraction to isolate internal changes from external headless API consumers
// Since these keys are used as an external API definiton they need to be meaningful
// Note that ordering here determines rendering order
/**
 * Due to ts(18033) we cannot use the type values directly here:
 * FF_SIMPLE = FFTemplateType.Basic // Once https://github.com/microsoft/TypeScript/pull/59475 is merged we can remove the hardcoded values and directly use the template values
 */
export enum FloorplanFF {
    FF_SIMPLE = 'basic'
}
/**
 * Due to ts(18033) we cannot use the type values directly here:
 * Once https://github.com/microsoft/TypeScript/pull/59475 is merged we can remove hardcoded values and directly use the template values
 * FE_FPM = FETemplateType.FlexibleProgrammingModel,
 * FE_LROP = FETemplateType.ListReportObjectPage,
 * FE_OVP = FETemplateType.OverviewPage,
 * FE_ALP = FETemplateType.AnalyticalListPage,
 * FE_FEOP = FETemplateType.FormEntryObjectPage,
 * FE_WORKLIST = FETemplateType.Worklist
 */
// Note that ordering here determines rendering order
export enum FloorplanFE {
    FE_FPM = 'fpm',
    FE_LROP = 'lrop',
    FE_OVP = 'ovp',
    FE_ALP = 'alp',
    FE_FEOP = 'feop',
    FE_WORKLIST = 'worklist'
}

// Used internally to join Floorplan types from multiple generators (until we have a merged type)
export type Floorplan = FloorplanFE | FloorplanFF;

// Used in external interfaces to define floorplans using a simple meaningful string key
export type FloorplanKey = keyof typeof FloorplanFE | keyof typeof FloorplanFF;

// TODO: Extend for https://github.wdf.sap.corp/ux-engineering/tools-suite/issues/11636

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

export enum DeployTarget {
    CF = 'CF',
    ABAP = 'ABAP'
}
/**
 * Defines the additional external inputs required for deployment configuration file generation
 */
export interface DeployConfig {
    readonly deployTarget: DeployTarget;
}

export interface CFDeployConfig extends DeployConfig {
    readonly deployTarget: DeployTarget.CF;
    readonly destinationName: string; // Destination name to be used in mta file
    readonly destinationAuthType?: string; // todo: doc values
    readonly addToManagedAppRouter?: boolean; // Add to the managed app router yaml
    readonly addMTADestination?: boolean; // Add CAP destination
    readonly lcapModeOnly?: boolean; // Only make local Fiori app changes when parent project is a CAP project
    readonly cloudServiceName?: string; // Add Cloud Service name
}

export interface FLPConfig {
    readonly action?: string;
    readonly title?: string;
    readonly semanticObject?: string;
}

/**
 * Defines the external interface used to generate in headless mode (no prompts)
 * This is a deliberate re-definition of internal interfaces to avoid consumers having
 * to update when internal interfaces are changed
 * NOTE: Any breaking changes to this interface require a version bump
 */
export interface AppConfig {
    readonly version: string; // The interface version
    readonly floorplan: FloorplanKey;
    project: {
        readonly name: string;
        targetFolder?: string; // Current working directory will be used if not provided
        readonly namespace?: string;
        readonly title?: string;
        readonly description?: string;
        readonly ui5Theme?: string;
        readonly ui5Version?: string;
        readonly localUI5Version?: string;
        readonly sapux?: boolean;
        readonly skipAnnotations?: boolean;
        readonly enableCodeAssist?: boolean;
        readonly enableEslint?: boolean;
        readonly enableTypeScript?: boolean;
    };
    service?: {
        readonly host?: string;
        readonly servicePath?: string;
        readonly client?: string;
        readonly scp?: boolean; // If available key store entry must be available or provided at app runtime
        readonly destination?: string;
        readonly destinationInstance?: string;
        readonly edmx?: string;
        readonly annotations?: Annotations | Annotations[];
        readonly capService?: {
            readonly projectPath: string;
            readonly serviceName: string;
            readonly serviceCdsPath: string;
            readonly capType?: CapRuntime;
            readonly appPath?: string; // Alternative app path
        };
        readonly apiHubApiKey?: string; // Non-enterprise support only currently
    };
    deployConfig?: DeployConfig;
    flpConfig?: FLPConfig;
    /**
     * Adds telemetry data when passed to generator `@sap/generator-fiori:headless`
     */
    telemetryData?: {
        generationSourceName?: string;
        generationSourceVersion?: string;
    };
}

/**
 * Defines the entity config property of the external app config interface used to generate in headless mode (no prompts)
 */
export interface EntityConfig {
    mainEntity?: { entityName: string; type?: any }; //todo: is type necessary?
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
     * Toggles ui5 version prompting
     *
     * @deprecated Use extensions + prompt options (UI5ApplcationInquirer `ui5Version` options 'hide') to control this
     */
    hideUI5VersionPrompt?: boolean;
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

/**
 * Defines the currently allowed extension points for a Fiori Generator prompt
 * todo: Include open source inquirer prompt options (UI5ApplicationInquirer prompt options) also so extensions can directly use them
 *
 */
export type PromptExtension = {
    [key in ui5AppInquirerPromptNames]?: {
        validate?: Question['validate'];
        default?: Question['default'];
        additionalMessages?: PromptSeverityMessage;
    };
};

export interface FioriGeneratorPromptExtension {
    [generatorName: string]: PromptExtension;
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
    // todo: use open source FE template type
    Worklist = 'WORKLIST',
    OverviewPage = 'OVERVIEW',
    ListReportObjectPage = 'LIST_REPORT_OBJECT_PAGE',
    AnalyticalListPage = 'ANALYTICAL_LIST_PAGE',
    FormEntryObjectPage = 'FORM_ENTRY_OBJECT_PAGE',
    FlexibleProgrammingModel = 'FLEXIBLE_PROGRAMMING_MODEL'
}

/**
 * Fiori Freestyle internal floorplan/template/project types
 *
 * @deprecated Use FloorplanFF instead, will be removed shortly
 */
export enum Template {
    // todo: use open source FF template type
    Simple = 'simple'
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

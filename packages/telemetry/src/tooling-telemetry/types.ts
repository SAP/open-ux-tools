import type { ProjectInfo } from '../base/types';
import type { AppType } from '@sap-ux/project-access/dist/types';

export type TelemetryHelperProperties = {
    appPath: string;
};

/**
 * Type exposed via telemetry API. The following paramters can be provided by developer who
 * calls telemetry API.
 *
 * - consumerModule: name and version of module that uses telemetry library
 * - internalFeature: if UX tooling InternalFeature is enabled
 * - watchTelemetrySettingStore: watch changes to telemetry setting in the store and update runtime settings accordingly (recommended for extensions)
 * - resourceId: Id of cloud telemetry resource (e.g. Azure application insights resource is supported).
 *
 */
export type ToolsSuiteTelemetryInitSettings = {
    consumerModule: ProjectInfo;
    internalFeature: boolean;
    watchTelemetrySettingStore: boolean;
    resourceId?: string;
};

export enum ToolsId {
    UNKNOWN = 'UNKNOWN',
    NO_TOOLS_ID = 'NO_TOOLS_ID'
}

export enum ODataSource {
    CAPJava = 'CAPJava',
    CAPNode = 'CAPNode',
    ABAP = 'ABAP',
    UNKNOWN = 'UNKNOWN'
}

export enum DeployTarget {
    CF = 'CF',
    ABAP = 'ABAP',
    UNKNOWN_DEPLOY_CONFIG = 'UNKNOWN_DEPLOY_CONFIG',
    NO_DEPLOY_CONFIG = 'NO_DEPLOY_CONFIG'
}

export enum CommonProperties {
    DevSpace = 'cmn.devspace',
    AppStudio = 'cmn.appstudio',
    AppStudioBackwardCompatible = 'appstudio',
    InternlVsExternal = 'cmn.internalFeatures',
    InternlVsExternalBackwardCompatible = 'internalVsExternal',
    TemplateType = 'cmn.template',
    DeployTargetType = 'cmn.deployTarget',
    ODataSourceType = 'cmn.odataSource',
    AppToolsId = 'cmn.toolsId',
    NodeVersion = 'cmn.nodeVersion',
    AppProgrammingLanguage = 'cmn.appLanguage',
    TemplateId = 'cmn.templateId',
    TemplateVersion = 'cmn.templateVersion',
    ApplicationType = 'cmn.applicationType'
}

export type InternalFeature = 'internal' | 'external';

export interface CommonTelemetryProperties extends TelemetryProperties {
    v: string;
    datetime: string;
}

export interface CommonFioriProjectProperties extends TelemetryProperties {
    [CommonProperties.DevSpace]: string;
    [CommonProperties.AppStudio]: boolean;
    [CommonProperties.AppStudioBackwardCompatible]: boolean;
    [CommonProperties.InternlVsExternal]: InternalFeature;
    [CommonProperties.InternlVsExternalBackwardCompatible]: InternalFeature;
    [CommonProperties.TemplateType]: string;
    [CommonProperties.DeployTargetType]: DeployTarget;
    [CommonProperties.ODataSourceType]: ODataSource;
    [CommonProperties.AppToolsId]: string;
    [CommonProperties.NodeVersion]: string;
    [CommonProperties.AppProgrammingLanguage]: string;
    [CommonProperties.TemplateId]: string;
    [CommonProperties.TemplateVersion]: string;
    [CommonProperties.ApplicationType]: AppType;
}

export interface TelemetryProperties {
    [key: string]: string | boolean;
}

export interface TelemetryMeasurements {
    [key: string]: number;
}

export type TelemetryEvent = {
    eventName: string;
    properties: TelemetryProperties;
    measurements: TelemetryMeasurements;
};

/**
 * sourceTemplate information in Fiori app manifest.json file.
 */
export interface SourceTemplate {
    id?: string;
    version?: string;
    toolsId?: string;
}

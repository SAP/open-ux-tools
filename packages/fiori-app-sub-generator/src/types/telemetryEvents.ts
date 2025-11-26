import type { TelemetryEvent, TelemetryMeasurements, TelemetryProperties } from '@sap-ux/telemetry';
import type { DatasourceType } from '@sap-ux/odata-service-inquirer';

export type EventName = 'GENERATION_SUCCESS' | 'GENERATION_INSTALL_FAIL' | 'GENERATION_WRITING_FAIL';

export type LaunchSource =
    | 'Headless'
    | 'CapServiceAdaptor'
    | 'MtaLaunchAdaptor'
    | 'LCAPServiceAdaptor'
    | 'ServiceCenterAdaptor';

export type TelemetrySapSystemType = 'SCP' | 'CF' | 'ABAP';

export type TelemetryBusinessHubType = 'BusinessAcceleratorHub' | 'BusinessHubEnterprise';

export interface AppGenEventProperties extends TelemetryProperties {
    Template: string;
    DataSource: DatasourceType;
    UI5Version: string;
    Theme: string;
    AppGenVersion: string;
    /**
     * Use enum in app-generator/common
     */

    AppGenSourceType: DatasourceType;
    /**
     * Use enum in app-generator/common
     */

    AppGenSapSystemType: TelemetrySapSystemType;
    EnableEslint: boolean;
    AppGenLaunchSource: LaunchSource;
    /**
     * Version of the module which launches the generator
     */
    AppGenLaunchSourceVersion: string;
    installFailure: boolean;
    ToolsId: string; // A uuid assigned to applications created or modified by UX tools
}

export interface AppGenEventMeasurements extends TelemetryMeasurements {
    GenerationTime: number;
}

/**
 * Telemetry event generated on successful completion
 * of Fiori project generation
 */
export interface AppGenSuccessEvent extends TelemetryEvent {
    eventName: 'GENERATION_SUCCESS';
    properties: AppGenEventProperties;
    measurements: AppGenEventMeasurements;
}

/**
 * Telemetry event generated on failure of running npm install
 * during Fiori project generation
 */
export interface AppGenInstallFailEvent extends TelemetryEvent {
    eventName: 'GENERATION_INSTALL_FAIL';
    properties: AppGenEventProperties;
    measurements: AppGenEventMeasurements;
}

/**
 * Telemetry event generated on failure of writing
 * project files to file system during Fiori project generation
 */
export interface AppGenWritingFailEvent extends TelemetryEvent {
    eventName: 'GENERATION_WRITING_FAIL';
    properties: AppGenEventProperties;
    measurements: AppGenEventMeasurements;
}

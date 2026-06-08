// Manual mock for @sap-ux/sap-systems-ext-types
import type { BackendSystem } from '@sap-ux/store';
import type { IActionCalloutDetail } from '@sap-ux/ui-components';

export interface RequestCount {
    count?: number;
    error?: unknown;
}

export interface CatalogServicesCounts {
    v2Request: RequestCount;
    v4Request: RequestCount;
}

export interface ConnectionStatus {
    message?: string;
    catalogResults?: CatalogServicesCounts;
    connected: boolean;
    showOutputChannelLink: boolean;
}

// WebApp Actions
export const CREATE_FIORI_PROJECT = 'CREATE_FIORI_PROJECT' as const;
export const EXPORT_SYSTEM = 'EXPORT_SYSTEM' as const;
export const FIRE_GA_LINK_CLICKED_TELEMETRY = 'FIRE_GA_LINK_CLICKED_TELEMETRY' as const;
export const OPEN_EXISTING_SYSTEM = 'OPEN_EXISTING_SYSTEM' as const;
export const OPEN_GUIDED_ANSWERS = 'OPEN_GUIDED_ANSWERS' as const;
export const OPEN_OUTPUT_CHANNEL = 'OPEN_OUTPUT_CHANNEL' as const;
export const WEBVIEW_READY = 'WEBVIEW_READY' as const;
export const TEST_CONNECTION = 'TEST_CONNECTION' as const;
export const UPDATE_SYSTEM = 'UPDATE_SYSTEM' as const;

export interface CreateFioriProject {
    type: typeof CREATE_FIORI_PROJECT;
    payload: { system: BackendSystem };
}

export interface ExportSystem {
    type: typeof EXPORT_SYSTEM;
    payload: { system: BackendSystem };
}

export interface FireGALinkClickedTelemetry {
    type: typeof FIRE_GA_LINK_CLICKED_TELEMETRY;
}

export interface OpenGuidedAnswers {
    type: typeof OPEN_GUIDED_ANSWERS;
    payload: { command: IActionCalloutDetail['command'] };
}

export interface TestConnection {
    type: typeof TEST_CONNECTION;
    payload: { system: BackendSystem; servicePath?: string };
}

export interface UpdateSystem {
    type: typeof UPDATE_SYSTEM;
    payload: { system: BackendSystem };
}

export interface OpenExistingSystem {
    type: typeof OPEN_EXISTING_SYSTEM;
    payload: { url: string; client?: string };
}

export interface OpenOutputChannel {
    type: typeof OPEN_OUTPUT_CHANNEL;
}

export interface WebviewReady {
    type: typeof WEBVIEW_READY;
}

export type WebAppActions =
    | CreateFioriProject
    | ExportSystem
    | FireGALinkClickedTelemetry
    | OpenExistingSystem
    | OpenGuidedAnswers
    | OpenOutputChannel
    | WebviewReady
    | TestConnection
    | UpdateSystem;

// Extension Actions
export const CREATE_NEW_SYSTEM = 'CREATE_NEW_SYSTEM' as const;
export const SYSTEM_INFO = 'SYSTEM_INFO' as const;
export const SYSTEM_INFO_LOADING = 'SYSTEM_INFO_LOADING' as const;
export const SYSTEM_INFO_ERROR = 'SYSTEM_INFO_ERROR' as const;
export const TEST_CONNECTION_STATUS = 'TEST_CONNECTION_STATUS' as const;
export const TEST_CONNECTION_LOADING = 'TEST_CONNECTION_LOADING' as const;
export const UPDATE_SYSTEM_STATUS = 'UPDATE_SYSTEM_STATUS' as const;

export interface CreateNewSystem {
    type: typeof CREATE_NEW_SYSTEM;
}

export interface SystemInfo {
    type: typeof SYSTEM_INFO;
    payload: { systemInfo: BackendSystem; unSaved: boolean };
}

export interface SystemInfoLoading {
    type: typeof SYSTEM_INFO_LOADING;
}

export interface SystemInfoError {
    type: typeof SYSTEM_INFO_ERROR;
}

export interface TestConnectionLoading {
    type: typeof TEST_CONNECTION_LOADING;
}

export interface TestConnectionStatus {
    type: typeof TEST_CONNECTION_STATUS;
    payload: {
        connectionStatus: ConnectionStatus;
        guidedAnswerLink?: IActionCalloutDetail;
    };
}

export interface UpdateSystemStatus {
    type: typeof UPDATE_SYSTEM_STATUS;
    payload: {
        message: string;
        updateSuccess: boolean;
        existingSystem?: { name: string; url: string; client?: string };
    };
}

export type ExtensionActions =
    | CreateNewSystem
    | SystemInfo
    | SystemInfoLoading
    | SystemInfoError
    | TestConnectionLoading
    | TestConnectionStatus
    | UpdateSystemStatus;

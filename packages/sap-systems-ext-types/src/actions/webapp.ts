import type { BackendSystem } from '@sap-ux/store';
import type { IActionCalloutDetail } from '@sap-ux/ui-components';

/**
 * Actions fired from the webview to the extension host.
 */
export type WebAppActions =
    | CreateFioriProject
    | ExportSystem
    | FireGALinkClickedTelemetry
    | OpenGuidedAnswers
    | OpenOutputChannel
    | WebviewReady
    | TestConnection
    | UpdateSystem;

export const CREATE_FIORI_PROJECT = 'CREATE_FIORI_PROJECT' as const;
export const EXPORT_SYSTEM = 'EXPORT_SYSTEM' as const;
export const FIRE_GA_LINK_CLICKED_TELEMETRY = 'FIRE_GA_LINK_CLICKED_TELEMETRY' as const;
export const OPEN_GUIDED_ANSWERS = 'OPEN_GUIDED_ANSWERS' as const;
export const OPEN_OUTPUT_CHANNEL = 'OPEN_OUTPUT_CHANNEL' as const;
export const WEBVIEW_READY = 'WEBVIEW_READY' as const;
export const TEST_CONNECTION = 'TEST_CONNECTION' as const;
export const UPDATE_SYSTEM = 'UPDATE_SYSTEM' as const;

type WebAppActionType = WebAppActions['type'];

const WEB_APP_ACTION_TYPES = {
    [CREATE_FIORI_PROJECT]: 'CREATE_FIORI_PROJECT',
    [EXPORT_SYSTEM]: 'EXPORT_SYSTEM',
    [FIRE_GA_LINK_CLICKED_TELEMETRY]: 'FIRE_GA_LINK_CLICKED_TELEMETRY',
    [OPEN_GUIDED_ANSWERS]: 'OPEN_GUIDED_ANSWERS',
    [OPEN_OUTPUT_CHANNEL]: 'OPEN_OUTPUT_CHANNEL',
    [WEBVIEW_READY]: 'WEBVIEW_READY',
    [TEST_CONNECTION]: 'TEST_CONNECTION',
    [UPDATE_SYSTEM]: 'UPDATE_SYSTEM'
} as const satisfies Record<WebAppActionType, string>;

export const WEB_APP_ACTION_TYPES_SET = new Set(Object.keys(WEB_APP_ACTION_TYPES) as WebAppActionType[]);

export interface CreateFioriProject {
    type: typeof CREATE_FIORI_PROJECT;
    payload: { systemName: string };
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
    payload: { system: BackendSystem };
}

export interface UpdateSystem {
    type: typeof UPDATE_SYSTEM;
    payload: { system: BackendSystem };
}

export interface OpenOutputChannel {
    type: typeof OPEN_OUTPUT_CHANNEL;
}

export interface WebviewReady {
    type: typeof WEBVIEW_READY;
}

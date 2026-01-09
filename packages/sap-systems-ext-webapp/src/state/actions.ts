import type { BackendSystem } from '@sap-ux/store';
import type { IActionCalloutDetail } from '@sap-ux/ui-components';
import type {
    WebviewReady,
    CreateFioriProject,
    ExportSystem,
    FireGALinkClickedTelemetry,
    OpenGuidedAnswers,
    OpenOutputChannel,
    TestConnection,
    UpdateSystem
} from '@sap-ux/sap-systems-ext-types';

export const webViewReady = (): WebviewReady => ({
    type: 'WEBVIEW_READY'
});

export const createFioriProject = (backendSystem: BackendSystem): CreateFioriProject => ({
    type: 'CREATE_FIORI_PROJECT',
    payload: { system: backendSystem }
});

export const openOutputChannel = (): OpenOutputChannel => ({
    type: 'OPEN_OUTPUT_CHANNEL'
});

export const fireGALinkTelemetry = (): FireGALinkClickedTelemetry => ({
    type: 'FIRE_GA_LINK_CLICKED_TELEMETRY'
});

export const openGuidedAnswers = (command: IActionCalloutDetail['command']): OpenGuidedAnswers => ({
    type: 'OPEN_GUIDED_ANSWERS',
    payload: { command }
});

export const exportSystem = (backendSystem: BackendSystem): ExportSystem => ({
    type: 'EXPORT_SYSTEM',
    payload: { system: backendSystem }
});

export const testConnection = (backendSystem: BackendSystem): TestConnection => ({
    type: 'TEST_CONNECTION',
    payload: { system: backendSystem }
});

export const updateSystem = (backendSystem: BackendSystem): UpdateSystem => ({
    type: 'UPDATE_SYSTEM',
    payload: {
        system: backendSystem
    }
});

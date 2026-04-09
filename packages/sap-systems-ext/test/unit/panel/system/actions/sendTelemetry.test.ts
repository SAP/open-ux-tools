import { jest } from '@jest/globals';
import type { PanelContext } from '../../../../../src/types';
import { SystemPanelViewType } from '../../../../../src/utils/constants';

const mockLogTelemetryEvent = jest.fn();

const realUtils = await import('../../../../../src/utils');
jest.unstable_mockModule('../../../../../src/utils', () => ({
    ...realUtils,
    logTelemetryEvent: mockLogTelemetryEvent
}));

const { fireGALinkClickedTelemetry } = await import('../../../../../src/panel/system/actions/sendTelemetry');
const { TelemetryHelper } = await import('../../../../../src/utils');

describe('Test the fireGALinkClickedTelemetry action', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should call the log telemetry event function with correct data', async () => {
        const logTelemetryEventSpy = jest.spyOn(TelemetryHelper, 'sendTelemetry');

        const panelContextGADisabled = {
            backendSystem: {} as any,
            updateBackendSystem: jest.fn(),
            disposePanel: jest.fn(),
            isGuidedAnswersEnabled: false,
            postMessage: jest.fn(),
            panelViewType: SystemPanelViewType.View
        } as PanelContext;

        fireGALinkClickedTelemetry(panelContextGADisabled);

        expect(logTelemetryEventSpy).toHaveBeenCalledWith('SYSTEM_DETAILS_VIEW_EVENT', {
            action: 'GUIDED_ANSWERS',
            status: 'LINK_CLICKED',
            isGuidedAnswersEnabled: 'false'
        });

        const panelContextGAEnabled = {
            backendSystem: {} as any,
            disposePanel: jest.fn(),
            isGuidedAnswersEnabled: true,
            postMessage: jest.fn(),
            panelViewType: SystemPanelViewType.View,
            updateBackendSystem: jest.fn()
        } as PanelContext;

        fireGALinkClickedTelemetry(panelContextGAEnabled);

        expect(logTelemetryEventSpy).toHaveBeenCalledWith('SYSTEM_DETAILS_VIEW_EVENT', {
            action: 'GUIDED_ANSWERS',
            status: 'LINK_CLICKED',
            isGuidedAnswersEnabled: 'true'
        });
    });
});

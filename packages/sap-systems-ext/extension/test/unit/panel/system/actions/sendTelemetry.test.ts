import type { PanelContext } from '../../../../../src/types';
import { fireGALinkClickedTelemetry } from '../../../../../src/panel/system/actions/sendTelemetry';
import { SystemPanelViewType } from '../../../../../src/utils/constants';
import * as panelActionUtils from '../../../../../src/utils';

jest.mock('../../../../../src/utils', () => ({
    ...jest.requireActual('../../../../../src/utils'),
    logTelemetryEvent: jest.fn()
}));

describe('Test the fireGALinkClickedTelemetry action', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should call the log telemetry event function with correct data', async () => {
        const logTelemetryEventSpy = jest.spyOn(panelActionUtils, 'logTelemetryEvent');

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

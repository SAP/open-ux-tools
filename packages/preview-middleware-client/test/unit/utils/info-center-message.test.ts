import { MessageBarType, showInfoCenterMessage } from '@sap-ux-private/control-property-editor-common';
import MessageToast from 'mock/sap/m/MessageToast';
import { CommunicationService } from 'open/ux/preview/client/cpe/communication-service';

// Since the function is globally mocked we need the actual implementation here.
const { sendInfoCenterMessage } = jest.requireActual('../../../src/utils/info-center-message');

jest.mock('../../../src/i18n', () => ({
    getTextBundle: () => Promise.resolve({
        getText: jest.fn().mockImplementation(
            (key: string, params: string[] | undefined) =>
                Array.isArray(params) ? `${key} - ${params.join(', ')}` : key)
    })
}));

jest.mock('@sap-ux-private/control-property-editor-common', () => ({
    ...jest.requireActual('@sap-ux-private/control-property-editor-common'),
    showInfoCenterMessage: jest.fn()
}));

describe('utils/info-center-message', () => {
    const TOASTER_DEFAULT_TIMEOUT_IN_MS = 5000;
    const messageA = {
        title: 'title A',
        description: 'description A',
        type: MessageBarType.error
    };
    const messageB = {
        title: { key: 'titleKeyB', params: ['a', 'b'] },
        description: { key: 'descriptionKeyB' },
        details: { key: 'detailsKeyB' },
        type: MessageBarType.warning,
        showToast: false
    };
    const infoCenterResult = 'info center result';

    const showInfoCenterMessageMock = showInfoCenterMessage as unknown as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    beforeEach(() => {
        showInfoCenterMessageMock.mockReturnValue(infoCenterResult);
        jest.spyOn(CommunicationService, 'sendAction');
    });

    it('should display a toast message and a message in the info center by default', async () => {
        await sendInfoCenterMessage(messageA)
        expect(MessageToast.show).toHaveBeenCalledWith(messageA.description, { duration: TOASTER_DEFAULT_TIMEOUT_IN_MS });
        expect(showInfoCenterMessageMock).toHaveBeenCalledWith(messageA);
    });

    it('should send the message to the info center with translated key strings', async () => {
        await sendInfoCenterMessage(messageB);
        expect(CommunicationService.sendAction).toHaveBeenCalledWith(infoCenterResult);
        expect(showInfoCenterMessageMock).toHaveBeenCalledWith({
            title: 'titleKeyB - a, b',
            description: 'descriptionKeyB',
            details: 'detailsKeyB',
            type: MessageBarType.warning
        });
        expect(MessageToast.show).not.toHaveBeenCalled();
    });
});
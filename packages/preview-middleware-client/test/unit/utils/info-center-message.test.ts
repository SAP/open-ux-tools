import { MessageBarType, showInfoCenterMessage } from '@sap-ux-private/control-property-editor-common';
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
    const message = {
        title: { key: 'titleKey', params: ['a', 'b'] },
        description: { key: 'descriptionKey' },
        details: 'details',
        type: MessageBarType.warning
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

    it('should send the message to the info center with translated key strings', async () => {
        await sendInfoCenterMessage(message);
        expect(CommunicationService.sendAction).toHaveBeenCalledWith(infoCenterResult);
        expect(showInfoCenterMessageMock).toHaveBeenCalledWith({
            title: 'titleKey - a, b',
            description: 'descriptionKey',
            details: 'details',
            type: MessageBarType.warning
        });
    });
});
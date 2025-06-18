import { MessageBarType, showInfoCenterMessage } from '@sap-ux-private/control-property-editor-common';
import MessageToast from 'mock/sap/m/MessageToast';
import { CommunicationService } from 'open/ux/preview/client/cpe/communication-service';

// Since the function is globally mocked we need the actual implementation here.
const { showLocalizedMessage } = jest.requireActual('../../../src/utils/localized-message');

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

describe('utils/localized-message', () => {
    const TOASTER_DEFAULT_TIMEOUT = 5000;
    const TEN_SEC_IN_MS = 10_000;
    const messageA = {
        title: 'title A',
        description: 'description A',
        type: MessageBarType.error
    };
    const messageB = {
        title: 'title B',
        description: 'description B',
        type: MessageBarType.error,
        showToast: false
    };
    const messageC = {
        title: 'title B',
        description: 'description B',
        type: MessageBarType.error,
        showToast: true,
        toastDuration: TEN_SEC_IN_MS
    };
    const messageD = {
        title: 'title D',
        description: 'description D',
        details: 'details D',
        type: MessageBarType.error
    };
    const messageE = {
        title: { key: 'titleKeyE', params: ['a', 'b'] },
        description: { key: 'descriptionKeyE' },
        details: { key: 'detailsKeyE' },
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

    it('should display a toast message by default', async () => {
        await showLocalizedMessage(messageA)
        expect(MessageToast.show).toHaveBeenCalledWith(messageA.description, { duration: TOASTER_DEFAULT_TIMEOUT });
    });

    it('should display the toast message within the provided time period when configured', async () => {
        await showLocalizedMessage(messageC)
        expect(MessageToast.show).toHaveBeenCalledWith(messageC.description, { duration: TEN_SEC_IN_MS });
    });

    it('should NOT display the toaster when configured in the message', async () => {
        await showLocalizedMessage(messageB);
        expect(MessageToast.show).not.toHaveBeenCalled();
    });

    it('should send the message to the info center when there are NO localizations', async () => {
        await showLocalizedMessage(messageD)
        expect(CommunicationService.sendAction).toHaveBeenCalledWith(infoCenterResult);
        expect(showInfoCenterMessageMock).toHaveBeenCalledWith(messageD);
    });

    describe('WHEN the message contains localized keys', () => {
        it('THEN sends the message to the info center with translated key strings', async () => {
            await showLocalizedMessage(messageE);
            expect(CommunicationService.sendAction).toHaveBeenCalledWith(infoCenterResult);
            expect(showInfoCenterMessageMock).toHaveBeenCalledWith({
                title: 'titleKeyE - a, b',
                description: 'descriptionKeyE',
                details: 'detailsKeyE',
                type: MessageBarType.warning
            })
        });
    });
});
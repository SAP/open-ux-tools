import { MessageBarType, showInfoCenterMessage } from '@sap-ux-private/control-property-editor-common';
import { CommunicationService } from 'open/ux/preview/client/cpe/communication-service';

jest.unstable_mockModule('open/ux/preview/client/i18n', () => ({
    getTextBundle: () =>
        Promise.resolve({
            getText: jest
                .fn()
                .mockImplementation((key: string, params: string[] | undefined) =>
                    Array.isArray(params) ? `${key} - ${params.join(', ')}` : key
                )
        })
}));

const { sendInfoCenterMessage } = await import('open/ux/preview/client/utils/info-center-message');

describe('utils/info-center-message', () => {
    const message = {
        title: { key: 'titleKey', params: ['a', 'b'] },
        description: { key: 'descriptionKey' },
        details: 'details',
        type: MessageBarType.warning
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    beforeEach(() => {
        jest.spyOn(CommunicationService, 'sendAction');
    });

    it('should send the message to the info center with translated key strings', async () => {
        await sendInfoCenterMessage(message);
        expect(CommunicationService.sendAction).toHaveBeenCalledWith(
            showInfoCenterMessage({
                title: 'titleKey - a, b',
                description: 'descriptionKey',
                details: 'details',
                type: MessageBarType.warning
            })
        );
    });
});

import { jest } from '@jest/globals';

const mockIsAppStudio = jest.fn();

const realBtpUtils = await import('@sap-ux/btp-utils');
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...realBtpUtils,
    isAppStudio: mockIsAppStudio
}));

const { initI18n, t } = await import('../../../../src/utils/i18n');
const { getExtProjectMessage } = await import('../../../../src/app/questions/helper/message');

describe('getExtProjectMessage', () => {
    beforeAll(async () => {
        await initI18n();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should return message with sync views if app is supported and has sync views', () => {
        const result = getExtProjectMessage(true, true);
        expect(result).toBe(t('prompts.createExtProjectWithSyncViewsLabel'));
    });

    it('should return base message if app is supported but no sync views', () => {
        const result = getExtProjectMessage(true, false);
        expect(result).toBe(t('prompts.createExtProjectLabel'));
    });

    it('should return base message if app is not supported', () => {
        const result = getExtProjectMessage(false, true);
        expect(result).toBe(t('prompts.createExtProjectLabel'));
    });

    it('should return base message if neither supported nor has sync views', () => {
        const result = getExtProjectMessage(false, false);
        expect(result).toBe(t('prompts.createExtProjectLabel'));
    });

    it('should include error message and suggestion if in BAS and error message is present', () => {
        const errorMsg = 'App is missing manifest';
        mockIsAppStudio.mockReturnValue(true);
        const result = getExtProjectMessage(false, false, errorMsg);
        expect(result).toBe(`${errorMsg} ${t('prompts.extProjectSuggestion')}`);
    });

    it('should not use error message if not in BAS', () => {
        const errorMsg = 'App is missing manifest';
        mockIsAppStudio.mockReturnValue(false);
        const result = getExtProjectMessage(false, false, errorMsg);
        expect(result).toBe(t('prompts.createExtProjectLabel'));
    });
});

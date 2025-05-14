import { isAppStudio } from '@sap-ux/btp-utils';

import { initI18n, t } from '../../../../src/utils/i18n';
import { getExtProjectMessage } from '../../../../src/app/questions/helper/message';

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn()
}));

const mockIsAppStudio = isAppStudio as jest.Mock;

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

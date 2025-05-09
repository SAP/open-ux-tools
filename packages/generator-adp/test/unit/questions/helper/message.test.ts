import { initI18n, t } from '../../../../src/utils/i18n';
import { getExtProjectMessage } from '../../../../src/app/questions/helper/message';

describe('getExtProjectMessage', () => {
    beforeAll(async () => {
        await initI18n();
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
});

import { getExtProjectMessage } from '../../../../../../src';
import type { ConfigInfoPrompter } from '../../../../../../src';
import { t } from '../../../../../../src/i18n';

class MockPrompter {
    isApplicationSupported = false;
    appIdentifier = {
        appSync: false
    };
}

describe('Messages Tests', () => {
    describe('getExtProjectMessage', () => {
        const projectName = 'app.variant1';
        let prompter: MockPrompter;

        beforeEach(() => {
            prompter = new MockPrompter();
        });

        it('returns the basic extension project message when the app is not supported for sync', () => {
            const message = getExtProjectMessage(projectName, prompter as ConfigInfoPrompter);

            expect(message).toBe(t('prompts.createExtProjectLabel', { value: projectName }));
        });

        it('returns the sync extension project message when the app is supported for sync', () => {
            prompter.isApplicationSupported = true;
            prompter.appIdentifier.appSync = true;

            const message = getExtProjectMessage(projectName, prompter as ConfigInfoPrompter);

            expect(message).toBe(t('prompts.createExtProjectWithSyncViewsLabel', { value: projectName }));
        });
    });
});

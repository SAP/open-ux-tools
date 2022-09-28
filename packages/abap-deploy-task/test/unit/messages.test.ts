import { t } from '../../src/messages';
import messages from '../../src/messages/messages.json';

describe('t', () => {
    test('without params', () => {
        expect(t('NO_CONFIG_ERROR')).toBe(messages.NO_CONFIG_ERROR);
    });

    test('with params', () => {
        expect(t('STARTING_DEPLOYMENT', { test: true })).toContain('in test mode');
        expect(t('STARTING_DEPLOYMENT', { test: false })).not.toContain('in test mode');
        expect(t('STARTING_DEPLOYMENT')).not.toContain('in test mode');
    });
});

import { Severity } from '../src';
import { getLogger } from '../src/logger';

describe('Tests for logger', () => {
    test('Add all types of messages', () => {
        const logger = getLogger();
        logger.error('ERROR');
        logger.warn('WARNING');
        logger.info('INFO');
        logger.debug('DEBUG');
        logger.push(
            ...[
                { severity: Severity.Error, text: 'PUSHED_ERROR' },
                { severity: Severity.Debug, text: 'PUSHED_INFO' }
            ]
        );

        const messages = logger.getMessages();
        expect(messages).toMatchSnapshot();
    });
});

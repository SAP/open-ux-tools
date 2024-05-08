import { extractMessage } from '../../src/matchers/utils';

describe('extractMessage function', () => {
    it('should add message to messages array if getMessage function returns a message', () => {
        const messages: string[] = [];
        extractMessage({ getMessage: () => 'Hello World', messages });
        expect(messages).toContain('Hello World');
    });

    it('should not add message to messages array if getMessage function returns undefined', () => {
        const messages: string[] = [];
        extractMessage({ getMessage: () => undefined, messages });
        expect(messages).toHaveLength(0);
    });

    it('should not add message to messages array if getMessage function returns null', () => {
        const messages: string[] = [];
        extractMessage({ getMessage: () => null, messages });
        expect(messages).toHaveLength(0);
    });

    it('should not add message to messages array if getMessage function is not provided', () => {
        const messages: string[] = [];
        extractMessage({ messages });
        expect(messages).toHaveLength(0);
    });

    it('should add multiple messages to the messages array if called multiple times', () => {
        const messages: string[] = [];
        extractMessage({ getMessage: () => 'First message', messages });
        extractMessage({ getMessage: () => 'Second message', messages });
        extractMessage({ getMessage: () => 'Third message', messages });
        expect(messages).toEqual(['First message', 'Second message', 'Third message']);
    });
});

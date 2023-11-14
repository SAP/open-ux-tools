import { ACTION_KIND, wrapInQuotes } from '../src';

describe('text formatting', () => {
    test('wrap in quotes', () => {
        const result = wrapInQuotes(ACTION_KIND);
        expect(result).toEqual("'Action'");
    });
});

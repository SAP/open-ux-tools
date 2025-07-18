import { wrapInQuotes, printOptions } from '../src/text-formatting';

describe('wrapInQuotes', () => {
    it('should wrap text in single quotes', () => {
        const text = 'hello';
        const result = wrapInQuotes(text);
        expect(result).toBe("'hello'");
    });

    it('should handle empty strings', () => {
        const text = '';
        const result = wrapInQuotes(text);
        expect(result).toBe("''");
    });

    it('should handle strings with single quotes inside', () => {
        const text = "it's a test";
        const result = wrapInQuotes(text);
        expect(result).toBe("'it's a test'");
    });
});

describe('printOptions', () => {
    it('should have default values for formatter options', () => {
        expect(printOptions).toEqual({
            printWidth: 300,
            tabWidth: 4,
            useTabs: false,
            useSnippetSyntax: true
        });
    });
});

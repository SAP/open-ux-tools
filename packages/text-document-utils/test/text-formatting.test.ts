import { wrapInQuotes, printOptions, createTextDocument } from '../src/text-formatting';

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

describe('createTextDocument', () => {
    it('should create a TextDocument with the given parameters', () => {
        const uri = 'file://test.txt';
        const languageId = 'plaintext';
        const version = 1;
        const content = 'Hello, world!';

        const document = createTextDocument(uri, languageId, version, content);

        expect(document.uri).toBe(uri);
        expect(document.languageId).toBe(languageId);
        expect(document.version).toBe(version);
        expect(document.getText()).toBe(content);
    });

    it('should handle empty content', () => {
        const uri = 'file://test.txt';
        const languageId = 'plaintext';
        const version = 1;
        const content = '';

        const document = createTextDocument(uri, languageId, version, content);

        expect(document.uri).toBe(uri);
        expect(document.languageId).toBe(languageId);
        expect(document.version).toBe(version);
        expect(document.getText()).toBe(content);
    });
});

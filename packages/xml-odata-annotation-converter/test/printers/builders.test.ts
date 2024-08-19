import { concat, hardline, indent, line, printDocumentToString } from '../../src/printer/builders';
import { printOptions } from '@sap-ux/odata-annotation-core';

declare const expect: jest.Expect;
const options = { tabWidth: printOptions.tabWidth };

describe('print document', () => {
    test('concat strings', () => {
        const document = concat(['a', 'b', 'c']);
        const text = printDocumentToString(document, options);
        expect(text).toMatchSnapshot();
    });
    test('soft line', () => {
        const document = concat(['a', line, 'b']);
        const text = printDocumentToString(document, options);
        expect(text).toMatchSnapshot();
    });
    test('hard line', () => {
        const document = concat(['a', hardline, 'b']);
        const text = printDocumentToString(document, options);
        expect(text).toMatchSnapshot();
    });
    test('indent', () => {
        const document = indent(concat(['a', hardline, 'b']));
        const text = printDocumentToString(document, options);
        expect(text).toMatchSnapshot();
    });
    test('double indent', () => {
        const document = indent(indent(concat(['a', hardline, 'b'])));
        const text = printDocumentToString(document, options);
        expect(text).toMatchSnapshot();
    });
    test('tabWidth', () => {
        const document = indent(concat(['a', hardline, 'b']));
        const text = printDocumentToString(document, { tabWidth: 10 });
        expect(text).toMatchSnapshot();
    });
    test('indent content', () => {
        const document = concat(['a', indent(concat([hardline, 'b'])), hardline, 'c']);
        const text = printDocumentToString(document, options);
        expect(text).toMatchSnapshot();
    });
    test('trailing whitespace removal', () => {
        const document = concat(['a', indent(concat([hardline, 'b', hardline, hardline])), hardline, 'c']);
        const text = printDocumentToString(document, options);
        expect(text).toMatchSnapshot();
    });
});

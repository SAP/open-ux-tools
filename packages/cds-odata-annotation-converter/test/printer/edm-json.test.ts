import { printEdmJson } from '../../src/printer/edm-json';
import type { Element } from '@sap-ux/odata-annotation-core';
import { printOptions as defaultPrintOptions } from '@sap-ux/odata-annotation-core';

describe('edmJson', () => {
    const printOptions = {
        ...defaultPrintOptions,
        useSnippetSyntax: true
    };
    const noRange = {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 }
    };
    test('Apply odata.concat function', () => {
        // arrange
        const element: Element = {
            name: 'Apply',
            nameRange: noRange,
            content: [{ text: '$0', type: 'text' }],
            contentRange: noRange,
            attributes: {
                Function: {
                    type: 'attribute',
                    name: 'Function',
                    value: 'odata.concat'
                }
            },
            type: 'element'
        };

        // act
        const result = printEdmJson(element, printOptions);

        // assert
        expect(result).toMatchInlineSnapshot(`
            "{
                \\\\$Apply : [
                    $0
                ],
                \\\\$Function : 'odata.concat',
            }"
        `);
    });
    test('Apply odata.fillUriTemplate function', () => {
        // arrange
        const element: Element = {
            name: 'Apply',
            nameRange: noRange,
            content: [
                {
                    name: 'String',
                    nameRange: noRange,
                    content: [{ text: '$1', type: 'text' }],
                    contentRange: noRange,
                    type: 'element',
                    attributes: {}
                },
                {
                    name: 'LabeledElement',
                    nameRange: noRange,
                    content: [],
                    contentRange: noRange,
                    attributes: {
                        Name: { type: 'attribute', name: 'Name', value: '$2' },
                        $0: { type: 'attribute', name: '$0', value: '' }
                    },
                    type: 'element'
                }
            ],
            contentRange: noRange,
            attributes: {
                Function: {
                    type: 'attribute',
                    name: 'Function',
                    value: 'odata.fillUriTemplate'
                }
            },
            type: 'element'
        };

        // act
        const result = printEdmJson(element, printOptions);

        // assert
        expect(result).toMatchInlineSnapshot(`
            "{
                \\\\$Apply : [
                    '$1',
                    {
                        \\\\$LabeledElement : [
                        ],
                        \\\\$Name : '$2',
                        $0
                    },
                ],
                \\\\$Function : 'odata.fillUriTemplate',
            }"
        `);
    });
    test('Apply odata.uriEncode function', () => {
        // arrange
        const element: Element = {
            name: 'Apply',
            nameRange: noRange,
            content: [{ text: '$0', type: 'text' }],
            contentRange: noRange,
            attributes: {
                Function: {
                    type: 'attribute',
                    name: 'Function',
                    value: 'odata.uriEncode'
                }
            },
            type: 'element'
        };

        // act
        const result = printEdmJson(element, printOptions);

        // assert
        expect(result).toMatchInlineSnapshot(`
            "{
                \\\\$Apply : [
                    $0
                ],
                \\\\$Function : 'odata.uriEncode',
            }"
        `);
    });
    test('wrap in $edmJson odata.uriEncode function', () => {
        // arrange
        const element: Element = {
            name: 'Apply',
            nameRange: noRange,
            content: [],
            contentRange: noRange,
            attributes: {},
            type: 'element'
        };

        // act
        const result = printEdmJson(element, { ...printOptions, includeEdmJson: true });

        // assert
        expect(result).toMatchInlineSnapshot(`
            "{
                \\\\$edmJson : {
                    \\\\$Apply : [
                    ],
                },
            }"
        `);
    });
    test('remove container', () => {
        // arrange
        const element: Element = {
            name: 'Apply',
            nameRange: noRange,
            contentRange: noRange,
            type: 'element',
            content: [],
            attributes: {}
        };

        // act
        const result = printEdmJson(element, { ...printOptions, removeRootElementContainer: true });

        // assert
        expect(result).toMatchInlineSnapshot(`
            "\\\\$Apply : [
            ]"
        `);
    });
    describe('primitive values', () => {
        test.each([
            ['Bool'],
            ['Decimal'],
            ['Duration'],
            ['Float'],
            ['Int'],
            ['DateTimeOffset'],
            ['TimeOfDay'],
            ['Date'],
            ['EnumMember'],
            ['Guid'],
            ['Binary'],
            ['AnnotationPath'],
            ['ModelElementPath'],
            ['NavigationPropertyPath'],
            ['PropertyPath'],
            ['Path']
        ])('%s', (elementName) => {
            // arrange
            const element: Element = {
                name: elementName,
                nameRange: noRange,
                content: [{ text: '$0', type: 'text' }],
                contentRange: noRange,
                attributes: {},
                type: 'element'
            };

            // act
            const result = printEdmJson(element, { ...printOptions, removeRootElementContainer: true });

            // assert
            expect(result).toMatch(`\\$${elementName} : '$0'`);
        });
    });

    test('string element', () => {
        // arrange
        const element: Element = {
            name: 'String',
            nameRange: noRange,
            contentRange: noRange,
            attributes: {},
            type: 'element',
            content: []
        };

        // act
        const result = printEdmJson(element, { ...printOptions, removeRootElementContainer: true });

        // assert
        expect(result).toMatchInlineSnapshot(`"''"`);
    });
    test('text node', () => {
        // arrange
        const element: Element = {
            name: 'Path',
            nameRange: noRange,
            contentRange: noRange,
            content: [
                {
                    type: 'text',
                    text: 'abc'
                }
            ],
            attributes: {},
            type: 'element'
        };

        // act
        const result = printEdmJson(element, { ...printOptions, removeRootElementContainer: true });

        // assert
        expect(result).toMatchInlineSnapshot(`"\\\\$Path : 'abc'"`);
    });
});

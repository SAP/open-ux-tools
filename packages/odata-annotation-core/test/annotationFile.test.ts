import type { Element } from '@sap-ux/odata-annotation-core-types';
import {
    createElementNode,
    createTextNode,
    createAttributeNode,
    ELEMENT_TYPE
} from '@sap-ux/odata-annotation-core-types';

import { elementsWithName, getElementAttributeValue, getSingleTextNode, isElementWithName } from '../src';

const rangeInfo = {
    start: {
        character: 0,
        line: 0
    },
    end: {
        character: 0,
        line: 0
    }
};
const element: Element = {
    type: 'element',
    name: 'Annotation',
    attributes: {
        Term: {
            type: 'attribute',
            name: 'Term',
            nameRange: rangeInfo,
            value: 'UI.LineItem',
            valueRange: rangeInfo
        }
    },
    content: [
        {
            type: 'text',
            range: rangeInfo,
            text: '\n                ',
            fragmentRanges: undefined
        },
        {
            type: 'element',
            name: 'Collection',
            attributes: {},
            content: [],
            range: rangeInfo,
            nameRange: rangeInfo
        },
        {
            type: 'text',
            range: rangeInfo,
            text: '\n            ',
            fragmentRanges: undefined
        }
    ],
    range: rangeInfo,
    nameRange: rangeInfo,
    contentRange: rangeInfo
};
declare const expect: jest.Expect;
describe('annotationFile.ts', () => {
    test('elementsWithName: true', () => {
        // Act
        const result = elementsWithName('Collection', element);
        // Expect
        expect(result).toMatchSnapshot();
    });

    test('attributeValue', () => {
        // Act
        const result = getElementAttributeValue(element, 'Term');
        // Expect
        expect(result).toMatchSnapshot();
    });

    test('attributeValue: false', () => {
        // Act
        const result = getElementAttributeValue(element, 'Qualifier');
        // Expect
        expect(result).toMatchSnapshot();
    });

    describe('getSingleTextNode', () => {
        test('getSingleTextNode: valid case', () => {
            const nodes = element.content.filter((node) => node.type !== 'element');
            element.content = nodes;
            element.content.push({
                type: 'text',
                range: rangeInfo,
                text: 'testText',
                fragmentRanges: undefined
            });
            const result = getSingleTextNode(element);

            expect(result).toMatchInlineSnapshot(`
            Object {
              "fragmentRanges": undefined,
              "range": Object {
                "end": Object {
                  "character": 0,
                  "line": 0,
                },
                "start": Object {
                  "character": 0,
                  "line": 0,
                },
              },
              "text": "testText",
              "type": "text",
            }
        `);
        });

        test('getSingleTextNode: invalid case', () => {
            element.content.push({
                type: 'text',
                range: rangeInfo,
                text: 'testText2',
                fragmentRanges: undefined
            });
            const result = getSingleTextNode(element);

            expect(result).toMatchInlineSnapshot(`null`);
        });

        test('getSingleTextNode: invalid case2', () => {
            element.content = [];
            element.content.push({
                type: ELEMENT_TYPE,
                range: rangeInfo,
                name: 'Unknown',
                attributes: {},
                content: []
            });
            const result = getSingleTextNode(element);

            expect(result).toMatchInlineSnapshot(`null`);
        });
    });

    describe('isElementWithName', () => {
        test('attribute', () => {
            expect(isElementWithName(createAttributeNode('attribute', ''), 'name')).toBe(false);
        });
        test('text node', () => {
            expect(isElementWithName(createTextNode('text'), 'name')).toBe(false);
        });
        test('element', () => {
            expect(
                isElementWithName(
                    createElementNode({
                        name: 'element'
                    }),
                    'name'
                )
            ).toBe(false);
        });
        test('element', () => {
            expect(
                isElementWithName(
                    createElementNode({
                        name: 'name'
                    }),
                    'name'
                )
            ).toBe(true);
        });
    });
});

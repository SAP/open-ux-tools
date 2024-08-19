import type { PrintContext } from '../../src/printer/csdl-to-xml';
import {
    printCsdlNodeToXmlString,
    escapeAttribute,
    unescapeText,
    unescapeAttribute,
    escapeText
} from '../../src/printer/csdl-to-xml';
import type { Element, TextNode } from '@sap-ux/odata-annotation-core';
import { ELEMENT_TYPE, ATTRIBUTE_TYPE, TEXT_TYPE, printOptions } from '@sap-ux/odata-annotation-core';

declare const expect: jest.Expect;
const defaultPrintContext: PrintContext = { cursorIndentLevel: 0 };

describe('print CSDL to XML:', () => {
    describe('convert node into Prettier Doc object:', () => {
        it('convert nested snippet to XML', () => {
            const snippet: Element = {
                name: 'Annotation',
                type: ELEMENT_TYPE,
                attributes: {
                    Term: {
                        name: 'Term',
                        type: ATTRIBUTE_TYPE,
                        value: 'UI.Chart'
                    },
                    Qualifier: {
                        name: 'Qualifier',
                        type: ATTRIBUTE_TYPE,
                        value: 'q1'
                    }
                },
                content: [
                    {
                        name: 'Record',
                        type: ELEMENT_TYPE,
                        attributes: {
                            Type: {
                                name: 'Type',
                                type: ATTRIBUTE_TYPE,
                                value: 'UI.ChartDefinitionType'
                            }
                        },
                        content: [
                            {
                                name: 'PropertyValue',
                                type: ELEMENT_TYPE,
                                attributes: {},
                                content: []
                            }
                        ]
                    },
                    {
                        type: TEXT_TYPE,
                        text: 'Child Node Text'
                    }
                ]
            };
            const result = printCsdlNodeToXmlString(snippet, printOptions, defaultPrintContext);
            expect(result).toMatchInlineSnapshot(`
                "<Annotation Term=\\"UI.Chart\\" Qualifier=\\"q1\\">
                    <Record Type=\\"UI.ChartDefinitionType\\">
                        <PropertyValue/>
                    </Record>Child Node Text
                </Annotation>"
            `);
        });

        it('print text node only', () => {
            const ast: TextNode = {
                type: TEXT_TYPE,
                text: 'Node Text'
            };
            const result = printCsdlNodeToXmlString(ast, printOptions, defaultPrintContext);
            expect(result).toMatchInlineSnapshot(`"Node Text"`);
        });

        it('print element with empty content', () => {
            const snippet: Element = {
                name: 'String',
                type: ELEMENT_TYPE,
                attributes: {},
                content: []
            };
            const result = printCsdlNodeToXmlString(snippet, printOptions, defaultPrintContext);
            expect(result).toMatchInlineSnapshot(`"<String/>"`);
        });

        it('print node of unknow type', () => {
            const ast = {
                type: null as any,
                text: 'Node Text'
            };
            const result = printCsdlNodeToXmlString(ast, printOptions, defaultPrintContext);
            expect(result).toBe(``);
        });

        it('print node of structured type with text subnodes', () => {
            const snippet: Element = {
                name: 'Annotation',
                type: ELEMENT_TYPE,
                attributes: {
                    Term: {
                        name: 'Term',
                        type: ATTRIBUTE_TYPE,
                        value: 'UI.Chart'
                    },
                    Qualifier: {
                        name: 'Qualifier',
                        type: ATTRIBUTE_TYPE,
                        value: ''
                    }
                },
                content: [
                    {
                        type: TEXT_TYPE,
                        text: ''
                    },
                    {
                        type: TEXT_TYPE,
                        text: ''
                    }
                ]
            };
            const result = printCsdlNodeToXmlString(snippet, printOptions, defaultPrintContext);
            expect(result).toMatchInlineSnapshot(`
                "<Annotation Term=\\"UI.Chart\\" Qualifier=\\"\\">


                </Annotation>"
            `);
        });

        it('print node of non-structured type with single text subnode', () => {
            const snippet: Element = {
                name: 'String',
                type: ELEMENT_TYPE,
                attributes: {},
                content: [
                    {
                        type: TEXT_TYPE,
                        text: 'Some text'
                    }
                ]
            };
            const result = printCsdlNodeToXmlString(snippet, printOptions, defaultPrintContext);
            expect(result).toMatchInlineSnapshot(`"<String>Some text</String>"`);
        });

        it('print node without attributes with multiple text subnodes', () => {
            const snippet: Element = {
                name: 'PropertyValue',
                type: ELEMENT_TYPE,
                content: [
                    {
                        name: 'String',
                        type: ELEMENT_TYPE,
                        attributes: {},
                        content: [
                            {
                                type: TEXT_TYPE,
                                text: 'Some text'
                            }
                        ]
                    },
                    {
                        type: TEXT_TYPE,
                        text: 'Another text'
                    }
                ],
                attributes: {}
            };
            const result = printCsdlNodeToXmlString(snippet, printOptions, defaultPrintContext);
            expect(result).toMatchInlineSnapshot(`
                "<PropertyValue>
                    <String>Some text</String>Another text
                </PropertyValue>"
            `);
        });
        it('uses root level indentation', () => {
            const snippet: Element = {
                name: 'Annotation',
                type: ELEMENT_TYPE,
                attributes: {},
                content: [
                    {
                        name: 'String',
                        type: ELEMENT_TYPE,
                        attributes: {},
                        content: [
                            {
                                type: TEXT_TYPE,
                                text: 'Some text'
                            }
                        ]
                    }
                ]
            };
            const result = printCsdlNodeToXmlString(snippet, printOptions, { cursorIndentLevel: 2 });
            expect(result).toMatchInlineSnapshot(`
                "        <Annotation>
                            <String>Some text</String>
                        </Annotation>"
            `);
        });
        it('inserts Edmx namespace prefix in empty element', () => {
            const snippet: Element = {
                name: 'Reference',
                namespaceAlias: 'Edmx',
                type: 'element',
                attributes: {},
                content: []
            };
            const result = printCsdlNodeToXmlString(snippet, printOptions, {
                cursorIndentLevel: 0,
                namespaces: {
                    Edmx: 'Edmx'
                }
            });
            expect(result).toMatchInlineSnapshot(`"<Edmx:Reference/>"`);
        });
        it('inserts Edmx namespace prefix in element with content', () => {
            const snippet: Element = {
                name: 'Reference',
                namespaceAlias: 'Edmx',
                type: 'element',
                attributes: {},
                content: [
                    {
                        type: 'text',
                        text: ''
                    }
                ]
            };
            const result = printCsdlNodeToXmlString(snippet, printOptions, {
                cursorIndentLevel: 0,
                namespaces: {
                    Edmx: 'Edmx'
                }
            });
            expect(result).toMatchInlineSnapshot(`"<Edmx:Reference></Edmx:Reference>"`);
        });
        it('inserts empty prefix', () => {
            const snippet: Element = {
                name: 'Reference',
                namespaceAlias: 'Edmx',
                type: 'element',
                attributes: {},
                content: [
                    {
                        type: 'text',
                        text: ''
                    }
                ]
            };
            const result = printCsdlNodeToXmlString(snippet, printOptions, {
                cursorIndentLevel: 0,
                namespaces: {
                    Edmx: ''
                }
            });
            expect(result).toMatchInlineSnapshot(`"<:Reference></:Reference>"`);
        });
    });
});

describe('escape unescape csdl', () => {
    it('attribute values', () => {
        const attrValueUnescaped =
            'attribute with to be escaped characters "<" as "&lt;" and "&" as "&amp;" and " itself';
        const attrValueEscaped = escapeAttribute(attrValueUnescaped);
        expect(attrValueEscaped).toMatchInlineSnapshot(
            `"attribute with to be escaped characters &quot;&lt;&quot; as &quot;&amp;lt;&quot; and &quot;&amp;&quot; as &quot;&amp;amp;&quot; and &quot; itself"`
        );
        expect(unescapeAttribute(attrValueEscaped)).toBe(attrValueUnescaped);
    });
    it('text content', () => {
        const textValueUnescaped = 'text node with to be escaped characters "<" as "&lt;" and "&" as "&amp;"';
        const textValueEscaped = escapeText(textValueUnescaped);
        expect(textValueEscaped).toMatchInlineSnapshot(
            `"text node with to be escaped characters \\"&lt;\\" as \\"&amp;lt;\\" and \\"&amp;\\" as \\"&amp;amp;\\""`
        );
        expect(unescapeText(textValueEscaped)).toBe(textValueUnescaped);
    });
});

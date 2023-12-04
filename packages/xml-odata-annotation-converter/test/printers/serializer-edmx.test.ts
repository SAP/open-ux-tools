import type { Element, Attribute, Target } from '@sap-ux/odata-annotation-core';
import { Position, Range } from '@sap-ux/odata-annotation-core';
import { VocabularyService } from '@sap-ux/odata-vocabularies';
import {
    getNewAnnotationFile,
    serializeAttribute,
    serializeElement,
    serializeReference,
    serializeTarget
} from '../../src';
declare const expect: jest.Expect;

const vocabularyService = new VocabularyService();
describe('ts', () => {
    const position = Position.create(0, 1);
    describe('serializeReference', () => {
        const data = {
            alias: 'UI',
            referenceUri: 'https://sap.github.io/odata-vocabularies/vocabularies/Common.xml',
            namespace: 'com.sap.vocabularies.Common.v1'
        };

        test('case 1: when alias is deffined', () => {
            // Act
            const result = serializeReference(data);

            // Assert
            expect(result).toMatchSnapshot();
        });

        test('case 2: when alias is undefined', () => {
            // Arrange
            data.alias = '';

            // Act
            const result = serializeReference(data);

            // Assert
            expect(result).toMatchSnapshot();
        });
    });

    test('serialize attribute', () => {
        // Arrange
        const attribute: Attribute = {
            type: 'attribute',
            name: 'type',
            value: 'abc',
            nameRange: Range.create(position, position),
            valueRange: Range.create(position, position)
        };

        // Act
        const result = serializeAttribute(attribute);

        // Assert
        expect(result).toEqual('type="abc"');
    });

    test('serializeElement', () => {
        // Arrange
        const element: Element = {
            name: 'Reference',
            namespaceAlias: 'Edmx',
            type: 'element',
            attributes: {},
            content: []
        };

        // Act
        const result = serializeElement(element);

        // expect
        expect(result).toMatchSnapshot();
    });

    test('serializeTarget', () => {
        // Arrange
        const target: Target = {
            type: 'target',
            name: 'abc',
            nameRange: Range.create(position, position),
            terms: [
                {
                    type: 'element',
                    name: 'Annotation',
                    attributes: {
                        Term: {
                            type: 'attribute',
                            name: 'Term',
                            value: 'Common.ValueList'
                        }
                    },
                    content: [
                        {
                            type: 'element',
                            name: 'Record',
                            attributes: {
                                Type: {
                                    type: 'attribute',
                                    name: 'Type',
                                    value: 'Common.ValueListType'
                                }
                            },
                            content: [
                                {
                                    type: 'element',
                                    name: 'PropertyValue',
                                    attributes: {
                                        Property: {
                                            type: 'attribute',
                                            name: 'Property',
                                            value: 'CollectionPath'
                                        },
                                        String: {
                                            type: 'attribute',
                                            name: 'String',
                                            value: 'Airports'
                                        }
                                    },
                                    content: []
                                },
                                {
                                    type: 'element',
                                    name: 'PropertyValue',
                                    attributes: {
                                        Property: {
                                            type: 'attribute',
                                            name: 'Property',
                                            value: 'Parameters'
                                        }
                                    },
                                    content: [
                                        {
                                            type: 'element',
                                            name: 'Collection',
                                            attributes: {},
                                            content: [
                                                {
                                                    type: 'element',
                                                    name: 'Record',
                                                    attributes: {
                                                        Type: {
                                                            type: 'attribute',
                                                            name: 'Type',
                                                            value: 'Common.ValueListParameterInOut'
                                                        }
                                                    },
                                                    content: [
                                                        {
                                                            type: 'element',
                                                            name: 'PropertyValue',
                                                            attributes: {
                                                                Property: {
                                                                    type: 'attribute',
                                                                    name: 'Property',
                                                                    value: 'LocalDataProperty'
                                                                },
                                                                PropertyPath: {
                                                                    type: 'attribute',
                                                                    name: 'PropertyPath',
                                                                    value: 'LastName'
                                                                }
                                                            },
                                                            content: []
                                                        },
                                                        {
                                                            type: 'element',
                                                            name: 'PropertyValue',
                                                            attributes: {
                                                                Property: {
                                                                    type: 'attribute',
                                                                    name: 'Property',
                                                                    value: 'ValueListProperty'
                                                                },
                                                                String: {
                                                                    type: 'attribute',
                                                                    name: 'String',
                                                                    value: 'IcaoCode'
                                                                }
                                                            },
                                                            content: []
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                } as any,
                {
                    type: 'element',
                    name: 'Annotation',
                    attributes: {
                        Term: {
                            type: 'attribute',
                            name: 'Term',
                            value: 'Common.ValueListWithFixedValues'
                        },
                        Bool: {
                            type: 'attribute',
                            name: 'Bool',
                            value: 'true'
                        }
                    },
                    content: []
                },
                {
                    type: 'element',
                    name: 'Annotation',
                    attributes: {
                        Term: {
                            type: 'attribute',
                            name: 'Term',
                            value: 'Common.ValueList'
                        },
                        Qualifier: {
                            type: 'attribute',
                            name: 'Qualifier',
                            value: 'cxcx'
                        }
                    },
                    content: [
                        {
                            type: 'element',
                            name: 'Record',
                            attributes: {
                                Type: {
                                    type: 'attribute',
                                    name: 'Type',
                                    value: 'Common.ValueListType'
                                }
                            },
                            content: [
                                {
                                    type: 'element',
                                    name: 'PropertyValue',
                                    attributes: {
                                        Property: {
                                            type: 'attribute',
                                            name: 'Property',
                                            value: 'CollectionPath'
                                        },
                                        String: {
                                            type: 'attribute',
                                            name: 'String',
                                            value: 'AddressInfo'
                                        }
                                    },
                                    content: []
                                }
                            ]
                        }
                    ]
                }
            ],
            termsRange: Range.create(position, position),
            range: Range.create(position, position)
        };

        // Act
        const result = serializeTarget(target, 8);

        // Expect
        expect(result).toMatchSnapshot();
    });

    test('serializeTarget with embedded annotations', () => {
        // Arrange
        const target: Target = {
            type: 'target',
            name: 'abc',
            nameRange: Range.create(position, position),
            terms: [
                {
                    type: 'element',
                    name: 'Annotation',
                    attributes: {
                        Term: {
                            type: 'attribute',
                            name: 'Term',
                            value: 'Common.ValueList'
                        }
                    },
                    content: [
                        {
                            type: 'element',
                            name: 'Record',
                            attributes: {
                                Type: {
                                    type: 'attribute',
                                    name: 'Type',
                                    value: 'Common.ValueListType'
                                }
                            },
                            content: [
                                {
                                    type: 'element',
                                    name: 'PropertyValue',
                                    attributes: {
                                        Property: {
                                            type: 'attribute',
                                            name: 'Property',
                                            value: 'CollectionPath'
                                        },
                                        String: {
                                            type: 'attribute',
                                            name: 'String',
                                            value: 'Airports'
                                        }
                                    },
                                    content: [],
                                    contentRange: null
                                },
                                {
                                    type: 'element',
                                    name: 'PropertyValue',
                                    attributes: {
                                        Property: {
                                            type: 'attribute',
                                            name: 'Property',
                                            value: 'Parameters'
                                        }
                                    },
                                    content: [
                                        {
                                            type: 'element',
                                            name: 'Collection',
                                            attributes: {},
                                            content: [
                                                {
                                                    type: 'element',
                                                    name: 'Record',
                                                    attributes: {
                                                        Type: {
                                                            type: 'attribute',
                                                            name: 'Type',
                                                            value: 'Common.ValueListParameterInOut'
                                                        }
                                                    },
                                                    content: [
                                                        {
                                                            type: 'element',
                                                            name: 'Annotation',
                                                            attributes: {
                                                                Term: {
                                                                    type: 'attribute',
                                                                    name: 'Term',
                                                                    value: 'UI.Emphasized'
                                                                }
                                                            },
                                                            content: [],
                                                            contentRange: null
                                                        },
                                                        {
                                                            type: 'element',
                                                            name: 'PropertyValue',
                                                            attributes: {
                                                                Property: {
                                                                    type: 'attribute',
                                                                    name: 'Property',
                                                                    value: 'LocalDataProperty'
                                                                },
                                                                PropertyPath: {
                                                                    type: 'attribute',
                                                                    name: 'PropertyPath',
                                                                    value: 'LastName'
                                                                }
                                                            },
                                                            content: [
                                                                {
                                                                    type: 'element',
                                                                    name: 'Annotation',
                                                                    attributes: {
                                                                        Term: {
                                                                            type: 'attribute',
                                                                            name: 'Term',
                                                                            value: 'Common.Application'
                                                                        }
                                                                    },
                                                                    content: [
                                                                        {
                                                                            type: 'element',
                                                                            name: 'Record',
                                                                            attributes: {
                                                                                Type: {
                                                                                    type: 'attribute',
                                                                                    name: 'Type',
                                                                                    value: 'Common.ApplicationType'
                                                                                }
                                                                            },
                                                                            content: [
                                                                                {
                                                                                    type: 'element',
                                                                                    name: 'PropertyValue',
                                                                                    attributes: {
                                                                                        Property: {
                                                                                            type: 'attribute',
                                                                                            name: 'Property',
                                                                                            value: 'ServiceVersion'
                                                                                        },
                                                                                        String: {
                                                                                            type: 'attribute',
                                                                                            name: 'String',
                                                                                            value: '2.0'
                                                                                        }
                                                                                    },
                                                                                    content: [],
                                                                                    contentRange: null
                                                                                }
                                                                            ]
                                                                        }
                                                                    ]
                                                                }
                                                            ]
                                                        },
                                                        {
                                                            type: 'element',
                                                            name: 'PropertyValue',
                                                            attributes: {
                                                                Property: {
                                                                    type: 'attribute',
                                                                    name: 'Property',
                                                                    value: 'ValueListProperty'
                                                                },
                                                                String: {
                                                                    type: 'attribute',
                                                                    name: 'String',
                                                                    value: 'IcaoCode'
                                                                }
                                                            },
                                                            content: [],
                                                            contentRange: null
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                } as any
            ],
            termsRange: Range.create(position, position),
            range: Range.create(position, position)
        };

        // Act
        const result = serializeTarget(target, 0);

        // Expect
        expect(result).toMatchSnapshot();
    });

    it('getNewAnnotationFile', () => {
        // Arrange
        const aliasInfo = {
            aliasMap: {
                'com.sap.vocabularies.UI.v1': 'com.sap.vocabularies.UI.v1',
                'com.sap.vocabularies.Common.v1': 'com.sap.vocabularies.Common.v1',
                STTA_PROD_MAN: 'STTA_PROD_MAN',
                UI: 'com.sap.vocabularies.UI.v1',
                Common: 'com.sap.vocabularies.Common.v1',
                Test: 'test'
            },
            aliasMapMetadata: { STTA_PROD_MAN: 'STTA_PROD_MAN' },
            aliasMapVocabulary: {
                'com.sap.vocabularies.UI.v1': 'com.sap.vocabularies.UI.v1',
                'com.sap.vocabularies.Common.v1': 'com.sap.vocabularies.Common.v1',
                UI: 'com.sap.vocabularies.UI.v1',
                Common: 'com.sap.vocabularies.Common.v1'
            },
            currentFileNamespace: 'schemaNamespace',
            reverseAliasMap: {
                'com.sap.vocabularies.UI.v1': 'UI',
                STTA_PROD_MAN: 'STTA_PROD_MAN',
                'com.sap.vocabularies.Common.v1': 'Common',
                test1: 'Test1'
            }
        };

        const vocabularies = vocabularyService.getVocabularies();

        //Act
        const result = getNewAnnotationFile(aliasInfo, 'metadatauri/def/ghi', vocabularies);

        // Assert
        expect(result).toMatchSnapshot();
    });
});

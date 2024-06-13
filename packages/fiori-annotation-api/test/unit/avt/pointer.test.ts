import type { Element } from '@sap-ux/odata-annotation-core';

import { convertPointerInAnnotationToInternal } from '../../../src/avt/pointer';

// real world example: parsed value of this annotation (omitting position information)
/*
<Annotation Term="Common.ValueList">
   <Record>
       <PropertyValue Property="Label" String="Quantity Unit - Custom Label"/>
       <PropertyValue Property="CollectionPath" String="SEPMRA_I_QuantityUnit"/>
       <PropertyValue Property="SearchSupported" Bool="true"/>
       <PropertyValue Property="Parameters">
           <Collection>
              <Record Type="Common.ValueListParameterInOut">
                  <PropertyValue Property="LocalDataProperty" PropertyPath="ProductBaseUnit"/>
                  <PropertyValue Property="ValueListProperty" String="UnitOfMeasure"/>
              </Record>
              <Record Type="Common.ValueListParameterDisplayOnly">
                  <PropertyValue Property="ValueListProperty" String="UnitOfMeasure_Text"/>
              </Record>
          </Collection>
          <Annotation Term="UI.Importance" EnumMember="UI.ImportanceType/High"/>
       </PropertyValue>
       <Annotation Term="UI.Importance" EnumMember="UI.ImportanceType/High"/>
   </Record>
   <Annotation Term="UI.Importance" EnumMember="UI.ImportanceType/High"/>
</Annotation>
 */
const annotation: Element = {
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
            value: 'MainList'
        }
    },
    content: [
        {
            type: 'text',
            text: '\n                    '
        },
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
                    type: 'text',
                    text: '\n                        '
                },
                {
                    type: 'element',
                    name: 'PropertyValue',
                    attributes: {
                        Property: {
                            type: 'attribute',
                            name: 'Property',
                            value: 'Label'
                        },
                        String: {
                            type: 'attribute',
                            name: 'String',
                            value: 'Quantity Unit - Custom Label'
                        }
                    },
                    content: []
                },
                {
                    type: 'text',
                    text: '\n                        '
                },
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
                            value: 'SEPMRA_I_QuantityUnit'
                        }
                    },
                    content: []
                },
                {
                    type: 'text',
                    text: '\n                        '
                },
                {
                    type: 'element',
                    name: 'PropertyValue',
                    attributes: {
                        Property: {
                            type: 'attribute',
                            name: 'Property',
                            value: 'SearchSupported'
                        }
                    },
                    content: [
                        {
                            type: 'element',
                            name: 'Bool',
                            attributes: {},
                            content: [
                                {
                                    type: 'text',
                                    text: 'true'
                                }
                            ]
                        }
                    ]
                },
                {
                    type: 'text',
                    text: '\n                        '
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
                            type: 'text',
                            text: '\n                            '
                        },
                        {
                            type: 'element',
                            name: 'Collection',
                            attributes: {},
                            content: [
                                {
                                    type: 'text',
                                    text: '\n                                '
                                },
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
                                            type: 'text',
                                            text: '\n                                    '
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
                                                    value: 'ProductBaseUnit'
                                                }
                                            },
                                            content: []
                                        },
                                        {
                                            type: 'text',
                                            text: '\n                                    '
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
                                                    value: 'UnitOfMeasure'
                                                }
                                            },
                                            content: []
                                        },
                                        {
                                            type: 'text',
                                            text: '\n                                '
                                        }
                                    ]
                                },
                                {
                                    type: 'text',
                                    text: '\n                                '
                                },
                                {
                                    type: 'element',
                                    name: 'Record',
                                    attributes: {
                                        Type: {
                                            type: 'attribute',
                                            name: 'Type',
                                            value: 'Common.ValueListParameterDisplayOnly'
                                        }
                                    },
                                    content: [
                                        {
                                            type: 'text',
                                            text: '\n                                    '
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
                                                    value: 'UnitOfMeasure_Text'
                                                }
                                            },
                                            content: []
                                        },
                                        {
                                            type: 'text',
                                            text: '\n                                '
                                        }
                                    ]
                                },
                                {
                                    type: 'text',
                                    text: '\n                            '
                                }
                            ]
                        },
                        {
                            type: 'text',
                            text: '\n                        '
                        },
                        {
                            type: 'element',
                            name: 'Annotation',
                            attributes: {
                                Term: {
                                    type: 'attribute',
                                    name: 'Term',
                                    value: 'UI.Importance'
                                },
                                EnumMember: {
                                    type: 'attribute',
                                    name: 'EnumMember',
                                    value: 'UI.ImportanceType/High'
                                }
                            },
                            content: []
                        },
                        {
                            type: 'text',
                            text: '\n                '
                        }
                    ]
                },
                {
                    type: 'text',
                    text: '\n                    '
                },
                {
                    type: 'element',
                    name: 'Annotation',
                    attributes: {
                        Term: {
                            type: 'attribute',
                            name: 'Term',
                            value: 'UI.Importance'
                        },
                        EnumMember: {
                            type: 'attribute',
                            name: 'EnumMember',
                            value: 'UI.ImportanceType/High'
                        }
                    },
                    content: []
                },
                {
                    type: 'text',
                    text: '\n                '
                },
                {
                    type: 'element',
                    name: 'PropertyValue',
                    attributes: {
                        Property: {
                            type: 'attribute',
                            name: 'Property',
                            value: 'Parameters2'
                        }
                    },
                    content: [
                        {
                            type: 'element',
                            name: 'String',
                            attributes: {},
                            content: [
                                {
                                    type: 'text',
                                    text: 'Test'
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
                            value: 'Parameters3'
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
                                    value: 'UI.Hidden'
                                }
                            },
                            content: []
                        },
                        {
                            type: 'element',
                            name: 'String',
                            attributes: {},
                            content: [
                                {
                                    type: 'text',
                                    text: 'Test'
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            type: 'text',
            text: '\n                '
        },
        {
            type: 'element',
            name: 'Annotation',
            attributes: {
                Term: {
                    type: 'attribute',
                    name: 'Term',
                    value: 'UI.Importance'
                },
                EnumMember: {
                    type: 'attribute',
                    name: 'EnumMember',
                    value: 'UI.ImportanceType/High'
                }
            },
            content: []
        },
        {
            type: 'text',
            text: '\n                '
        }
    ]
};

describe('convertPointerInAnnotationToInternal', () => {
    test('Term value', () => {
        const pathInternal = '/attributes/Term/value';
        const pathInternal2 = convertPointerInAnnotationToInternal(annotation, '/term');
        expect(pathInternal2).toMatch(pathInternal);
    });
    test('Qualifier value', () => {
        const pathInternal = '/attributes/Qualifier/value';
        const pathInternal2 = convertPointerInAnnotationToInternal(annotation, '/qualifier');
        expect(pathInternal2).toMatch(pathInternal);
    });
    test('Record value', () => {
        const pathInternal = '/content/1';
        const pathInternal2 = convertPointerInAnnotationToInternal(annotation, '/record');
        expect(pathInternal2).toMatch(pathInternal);
    });
    test('Collection value', () => {
        const lineItem = {
            type: 'element',
            name: 'Annotation',
            attributes: {
                Term: {
                    type: 'attribute',
                    name: 'Term',
                    value: 'UI.LineItem'
                }
            },
            content: [
                {
                    type: 'text',
                    text: ''
                },
                {
                    type: 'element',
                    name: 'Collection',
                    content: []
                }
            ]
        } as unknown as Element;
        const pathInternal = '/content/1';
        const pathInternal2 = convertPointerInAnnotationToInternal(lineItem, '/collection');
        expect(pathInternal2).toMatch(pathInternal);
    });
    test('Record Type value', () => {
        const pathInternal = '/content/1/attributes/Type/value';
        const pathInternal2 = convertPointerInAnnotationToInternal(annotation, '/record/type');
        expect(pathInternal2).toMatch(pathInternal);
    });
    test('Record Property (CollectionPath) name ', () => {
        const pathInternal = '/content/1/content/3/attributes/Property/value';
        const pathInternal2 = convertPointerInAnnotationToInternal(annotation, '/record/propertyValues/1/name');
        expect(pathInternal2).toMatch(pathInternal);
    });
    test('Record Property (CollectionPath) value ', () => {
        const pathInternal = '/content/1/content/3/attributes/String/value';
        const pathInternal2 = convertPointerInAnnotationToInternal(annotation, '/record/propertyValues/1/value/String');
        expect(pathInternal2).toMatch(pathInternal);
    });
    test('Record property (element) ', () => {
        const pathInternal = '/content/1/content/11/content/0';
        const pathInternal2 = convertPointerInAnnotationToInternal(
            annotation,
            '/record/propertyValues/4/value',
            'String'
        );
        expect(pathInternal2).toMatch(pathInternal);
    });
    test('Record property (element no type) ', () => {
        const pathInternal = '/content/1/content/11';
        const pathInternal2 = convertPointerInAnnotationToInternal(annotation, '/record/propertyValues/4/value');
        expect(pathInternal2).toMatch(pathInternal);
    });
    test('Record property (element) with annotations', () => {
        const pathInternal = '/content/1/content/12/content/1';
        const pathInternal2 = convertPointerInAnnotationToInternal(
            annotation,
            '/record/propertyValues/5/value',
            'String'
        );
        expect(pathInternal2).toMatch(pathInternal);
    });
    test('Record property (attribute)', () => {
        const pathInternal = '/content/1/content/3/attributes/String';
        const pathInternal2 = convertPointerInAnnotationToInternal(
            annotation,
            '/record/propertyValues/1/value',
            'String'
        );
        expect(pathInternal2).toMatch(pathInternal);
    });
    test('Record Property (SearchSupported) value ', () => {
        const pathInternal = '/content/1/content/5/content/0';
        const pathInternal2 = convertPointerInAnnotationToInternal(annotation, '/record/propertyValues/2/value/Bool');
        expect(pathInternal2).toMatch(pathInternal);
    });
    test('Record Property (Parameters) collection value position 0, whole record', () => {
        const pathInternal = '/content/1/content/7/content/1/content/1';
        const pathInternal2 = convertPointerInAnnotationToInternal(
            annotation,
            '/record/propertyValues/3/value/Collection/0'
        );
        expect(pathInternal2).toMatch(pathInternal);
    });

    test('Record Property (Parameters) collection[0], 1st property value (Property) of record, value', () => {
        const pathInternal = '/content/1/content/7/content/1/content/1/content/1/attributes/PropertyPath/value';

        const pathInternal2 = convertPointerInAnnotationToInternal(
            annotation,
            '/record/propertyValues/3/value/Collection/0/propertyValues/0/value/PropertyPath'
        );
        expect(pathInternal2).toMatch(pathInternal);
    });
    test('Record Property (Parameters) collection value position 1, first property value (Property) of record', () => {
        const pathInternal = '/content/1/content/7/content/1/content/3/content/1';
        const pathInternal2 = convertPointerInAnnotationToInternal(
            annotation,
            '/record/propertyValues/3/value/Collection/1/propertyValues/0'
        );
        expect(pathInternal2).toMatch(pathInternal);
    });

    // embedded annotations
    test('embedded annotation', () => {
        const pathInternal = '/content/3';
        const pathInternal2 = convertPointerInAnnotationToInternal(annotation, '/annotations/0');
        expect(pathInternal2).toMatch(pathInternal);
    });
    test('Embedded in Annotation: Term value', () => {
        const pathInternal = '/content/3/attributes/Term/value';
        const pathInternal2 = convertPointerInAnnotationToInternal(annotation, '/annotations/0/term');
        expect(pathInternal2).toMatch(pathInternal);
    });
    test('Embedded in Annotation: EnumValue value', () => {
        const pathInternal = '/content/3/attributes/EnumMember/value';
        const pathInternal2 = convertPointerInAnnotationToInternal(annotation, '/annotations/0/value/EnumMember');
        expect(pathInternal2).toMatch(pathInternal);
    });
    test('Embedded in Record: Term value', () => {
        const pathInternal = '/content/1/content/9/attributes/Term/value';

        const pathInternal2 = convertPointerInAnnotationToInternal(annotation, '/record/annotations/0/term');
        expect(pathInternal2).toMatch(pathInternal);
    });
    test('Embedded in PropertyValue: Term value', () => {
        const pathInternal = '/content/1/content/7/content/3/attributes/Term/value';
        const pathInternal2 = convertPointerInAnnotationToInternal(
            annotation,
            '/record/propertyValues/3/annotations/0/term'
        );
        expect(pathInternal2).toMatch(pathInternal);
    });

    describe('flattened', () => {
        test('Record Property (Parameters) collection value position 1, first property value (Property) of record', () => {
            const pathInternal = '/content/1/content/7/content/1/content/3/content/1';
            const pathInternal2 = convertPointerInAnnotationToInternal(
                annotation,
                '/record/propertyValues/3/value/Collection/1/propertyValues/0'
            );
            expect(pathInternal2).toMatch(pathInternal);
        });
    });
});

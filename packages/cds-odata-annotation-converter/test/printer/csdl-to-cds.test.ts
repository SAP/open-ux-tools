import { print, printTarget } from '../../src/printer/csdl-to-cds';
import { printOptions as defaultPrintOptions, Edm } from '@sap-ux/odata-annotation-core';
import type { Element, Target, TextNode, Attribute } from '@sap-ux/odata-annotation-core';

describe('csdlToCds', () => {
    const printOptions = {
        ...defaultPrintOptions,
        useSnippetSyntax: true
    };
    const noRange = {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 }
    };
    describe('printTarget', () => {
        test('!childSegments || childSegments.length === 0]', () => {
            // arrange
            const target: Target = {
                type: 'target',
                name: 'AdminService.Books',
                terms: [
                    {
                        type: 'element',
                        name: 'Annotation',
                        attributes: {
                            Term: {
                                type: 'attribute',
                                name: 'Term',
                                value: 'UI.Facets'
                            }
                        },
                        content: [
                            {
                                type: 'element',
                                name: 'Collection',
                                content: [
                                    {
                                        type: 'element',
                                        name: 'Record',
                                        content: [
                                            {
                                                type: 'element',
                                                name: 'PropertyValue',
                                                content: [],
                                                attributes: {
                                                    Property: {
                                                        type: 'attribute',
                                                        name: 'Property',
                                                        value: 'Label'
                                                    },
                                                    String: {
                                                        type: 'attribute',
                                                        name: 'String',
                                                        value: "Tom's Sales"
                                                    }
                                                }
                                            },
                                            {
                                                type: 'element',
                                                name: 'PropertyValue',
                                                content: [],
                                                attributes: {
                                                    Property: {
                                                        type: 'attribute',
                                                        name: 'Property',
                                                        value: 'ID'
                                                    },
                                                    String: {
                                                        type: 'attribute',
                                                        name: 'String',
                                                        value: 'Sales'
                                                    }
                                                }
                                            },
                                            {
                                                type: 'element',
                                                name: 'PropertyValue',
                                                content: [],
                                                attributes: {
                                                    Property: {
                                                        type: 'attribute',
                                                        name: 'Property',
                                                        value: 'Target'
                                                    },
                                                    AnnotationPath: {
                                                        type: 'attribute',
                                                        name: 'AnnotationPath',
                                                        value: 'to_ProductSalesData/@UI.Chart'
                                                    }
                                                }
                                            }
                                        ],
                                        attributes: {
                                            Type: { type: 'attribute', name: 'Type', value: 'UI.ReferenceFacet' }
                                        }
                                    }
                                ],
                                attributes: {}
                            }
                        ]
                    }
                ]
            };

            // act
            const result = printTarget(target);

            // assert
            expect(result).toMatchSnapshot();
            /* "annotate AdminService.Books with @(
                    UI.Facets: [
                            {
                                $Type:'UI.ReferenceFacet',
                                Label : 'Tom''s Sales',
                                ID : 'Sales',
                                Target :  'to_ProductSalesData/@UI.Chart',
                            },
                            ]
                        );
                    " */
        });

        test('multiple terms in single target', () => {
            // arrange
            const target: Target = {
                type: 'target',
                name: 'AdminService.Books',
                terms: [
                    {
                        type: 'element',
                        name: 'Annotation',
                        attributes: {
                            Term: {
                                type: 'attribute',
                                name: 'Term',
                                value: 'UI.Facets'
                            }
                        },
                        content: [
                            {
                                type: 'element',
                                name: 'Collection',
                                content: [],
                                attributes: {
                                    Type: { type: 'attribute', name: 'Type', value: 'UI.ReferenceFacet' }
                                }
                            }
                        ]
                    },
                    {
                        type: 'element',
                        name: 'Annotation',
                        attributes: {
                            Term: {
                                type: 'attribute',
                                name: 'Term',
                                value: 'UI.Facets'
                            },
                            Qualifier: {
                                type: 'attribute',
                                name: 'Qualifier',
                                value: 'MyQualifierName'
                            }
                        },
                        content: [
                            {
                                type: 'element',
                                name: 'Collection',
                                content: [],
                                attributes: {
                                    Type: { type: 'attribute', name: 'Type', value: 'UI.ReferenceFacet' }
                                }
                            }
                        ]
                    }
                ]
            };

            // act
            const result = printTarget(target);

            // assert
            expect(result).toMatchSnapshot();
            /* "annotate AdminService.Books with @(
                    UI.Facets : [
                    ],
                    UI.Facets #MyQualifierName : [
                    ]
                );
            " */
        });

        test('Annotating bound Action/Function', () => {
            // arrange
            const target: Target = {
                type: 'target',
                name: 'AdminService.addRating(AdminService.Books)',
                range: {
                    start: { line: 49, character: 12 },
                    end: { line: 49, character: 54 }
                },
                termsRange: {
                    start: { line: 49, character: 12 },
                    end: { line: 49, character: 54 }
                },
                terms: [
                    {
                        name: 'Annotation',

                        type: 'element',
                        attributes: {
                            Term: {
                                type: 'attribute',
                                name: 'Term',

                                value: 'Common.IsActionCritical',
                                valueRange: {
                                    start: { line: 49, character: 12 },
                                    end: { line: 49, character: 35 }
                                }
                            },
                            Qualifier: {
                                type: 'attribute',
                                name: 'Qualifier',

                                value: 'actionAfter',
                                valueRange: {
                                    start: { line: 49, character: 37 },
                                    end: { line: 49, character: 48 }
                                }
                            }
                        },
                        range: {
                            start: { line: 49, character: 12 },
                            end: { line: 49, character: 54 }
                        },
                        contentRange: {
                            start: { line: 49, character: 50 },
                            end: { line: 49, character: 54 }
                        },
                        content: [
                            {
                                type: 'element',
                                name: 'Bool',

                                range: {
                                    start: { line: 49, character: 50 },
                                    end: { line: 49, character: 54 }
                                },
                                contentRange: {
                                    start: { line: 49, character: 50 },
                                    end: { line: 49, character: 54 }
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: 'true',
                                        range: {
                                            start: { line: 49, character: 50 },
                                            end: { line: 49, character: 54 }
                                        }
                                    }
                                ],
                                attributes: {}
                            }
                        ]
                    }
                ]
            };

            // act
            const result = printTarget(target);

            // assert
            expect(result).toMatchSnapshot();
        });

        test('Annotating bound Action/Function paramter', () => {
            // arrange
            const target: Target = {
                type: 'target',
                name: 'AdminService.addRating(AdminService.Books)/stars',
                range: {
                    start: { line: 57, character: 12 },
                    end: { line: 57, character: 55 }
                },
                termsRange: {
                    start: { line: 57, character: 12 },
                    end: { line: 57, character: 55 }
                },
                terms: [
                    {
                        name: 'Annotation',

                        type: 'element',
                        attributes: {
                            Term: {
                                type: 'attribute',
                                name: 'Term',

                                value: 'UI.ParameterDefaultValue',
                                valueRange: {
                                    start: { line: 57, character: 12 },
                                    end: { line: 57, character: 36 }
                                }
                            },
                            Qualifier: {
                                type: 'attribute',
                                name: 'Qualifier',

                                value: 'paramAfter',
                                valueRange: {
                                    start: { line: 57, character: 38 },
                                    end: { line: 57, character: 48 }
                                }
                            }
                        },
                        range: {
                            start: { line: 57, character: 12 },
                            end: { line: 57, character: 55 }
                        },
                        contentRange: {
                            start: { line: 57, character: 50 },
                            end: { line: 57, character: 55 }
                        },
                        content: [
                            {
                                type: 'element',
                                name: 'Bool',

                                range: {
                                    start: { line: 57, character: 50 },
                                    end: { line: 57, character: 55 }
                                },
                                contentRange: {
                                    start: { line: 57, character: 50 },
                                    end: { line: 57, character: 55 }
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: 'false',
                                        range: {
                                            start: { line: 57, character: 50 },
                                            end: { line: 57, character: 55 }
                                        }
                                    }
                                ],
                                attributes: {}
                            }
                        ]
                    }
                ]
            };

            // act
            const result = printTarget(target);

            // assert
            expect(result).toMatchSnapshot();
        });

        test('Annotating unbound Action/Function parameter', () => {
            // arrange
            const target: Target = {
                type: 'target',
                name: 'AdminService.cancelOrder()/orderID',
                range: {
                    start: { line: 14, character: 10 },
                    end: { line: 14, character: 52 }
                },
                termsRange: {
                    start: { line: 14, character: 10 },
                    end: { line: 14, character: 52 }
                },
                terms: [
                    {
                        name: 'Annotation',

                        type: 'element',
                        attributes: {
                            Term: {
                                type: 'attribute',
                                name: 'Term',

                                value: 'UI.ParameterDefaultValue',
                                valueRange: {
                                    start: { line: 14, character: 10 },
                                    end: { line: 14, character: 34 }
                                }
                            },
                            Qualifier: {
                                type: 'attribute',
                                name: 'Qualifier',

                                value: 'paramAfter',
                                valueRange: {
                                    start: { line: 14, character: 36 },
                                    end: { line: 14, character: 46 }
                                }
                            }
                        },
                        range: {
                            start: { line: 14, character: 10 },
                            end: { line: 14, character: 52 }
                        },
                        contentRange: {
                            start: { line: 14, character: 48 },
                            end: { line: 14, character: 52 }
                        },
                        content: [
                            {
                                type: 'element',
                                name: 'Bool',

                                range: {
                                    start: { line: 14, character: 48 },
                                    end: { line: 14, character: 52 }
                                },
                                contentRange: {
                                    start: { line: 14, character: 48 },
                                    end: { line: 14, character: 52 }
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: 'true',
                                        range: {
                                            start: { line: 14, character: 48 },
                                            end: { line: 14, character: 52 }
                                        }
                                    }
                                ],
                                attributes: {}
                            }
                        ]
                    }
                ]
            };

            // act
            const result = printTarget(target);

            // assert
            expect(result).toMatchSnapshot();
        });

        test('childSegments.length === 1]', () => {
            // arrange
            const target: Target = {
                type: 'target',
                name: 'AdminService.Books/Autor',
                terms: [
                    {
                        type: 'element',
                        name: 'Annotation',
                        attributes: {
                            Term: {
                                type: 'attribute',
                                name: 'Term',
                                value: 'UI.Facets'
                            }
                        },
                        content: [
                            {
                                type: 'element',
                                name: 'Collection',
                                content: [
                                    {
                                        type: 'element',
                                        name: 'Record',
                                        content: [
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
                                                        value: 'Sales'
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
                                                        value: 'ID'
                                                    },
                                                    String: {
                                                        type: 'attribute',
                                                        name: 'String',
                                                        value: 'Sales'
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
                                                        value: 'Target'
                                                    },
                                                    AnnotationPath: {
                                                        type: 'attribute',
                                                        name: 'AnnotationPath',
                                                        value: 'to_ProductSalesData/@UI.Chart'
                                                    }
                                                },
                                                content: []
                                            }
                                        ],
                                        attributes: {
                                            Type: { type: 'attribute', name: 'Type', value: 'UI.ReferenceFacet' }
                                        }
                                    }
                                ],
                                attributes: {}
                            }
                        ]
                    }
                ]
            };

            // act
            const result = printTarget(target);

            // assert
            expect(result).toMatchSnapshot();
            /* "annotate AdminService.Books with {
                Autor @UI.Facets: [
                        {
                            $Type:'UI.ReferenceFacet',
                            Label : 'Sales',
                            ID : 'Sales',
                            Target :  'to_ProductSalesData/@UI.Chart',
                        },
                        ]
                    }
                " */
        });

        test('childSegments.length > 1]', () => {
            // arrange
            const target: Target = {
                type: 'target',
                name: 'AdminService.Books/Autor',
                terms: [
                    {
                        type: 'element',
                        name: 'Annotation',
                        attributes: {
                            Term: {
                                type: 'attribute',
                                name: 'Term',
                                value: 'UI.Facets'
                            }
                        },
                        content: [
                            {
                                type: 'element',
                                name: 'Collection',
                                content: [
                                    {
                                        type: 'element',
                                        name: 'Record',
                                        content: [
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
                                                        value: 'Sales'
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
                                                        value: 'ID'
                                                    },
                                                    String: {
                                                        type: 'attribute',
                                                        name: 'String',
                                                        value: 'Sales'
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
                                                        value: 'Target'
                                                    },
                                                    AnnotationPath: {
                                                        type: 'attribute',
                                                        name: 'AnnotationPath',
                                                        value: 'to_ProductSalesData/@UI.Chart'
                                                    }
                                                },
                                                content: []
                                            }
                                        ],
                                        attributes: {
                                            Type: { type: 'attribute', name: 'Type', value: 'UI.ReferenceFacet' }
                                        }
                                    }
                                ],
                                attributes: {}
                            }
                        ]
                    },
                    {
                        type: 'element',
                        name: 'Annotation',
                        attributes: {
                            Term: {
                                type: 'attribute',
                                name: 'Term',
                                value: 'UI.Facets'
                            },
                            Qualifier: {
                                type: 'attribute',
                                name: 'Qualifier',
                                value: 'qual1'
                            }
                        },
                        content: [
                            {
                                type: 'element',
                                name: 'Collection',
                                content: [
                                    {
                                        type: 'element',
                                        name: 'Record',
                                        content: [
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
                                                        value: 'Sales'
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
                                                        value: 'ID'
                                                    },
                                                    String: {
                                                        type: 'attribute',
                                                        name: 'String',
                                                        value: 'Sales'
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
                                                        value: 'Target'
                                                    },
                                                    AnnotationPath: {
                                                        type: 'attribute',
                                                        name: 'AnnotationPath',
                                                        value: 'to_ProductSalesData/@UI.Chart'
                                                    }
                                                },
                                                content: []
                                            }
                                        ],
                                        attributes: {
                                            Type: { type: 'attribute', name: 'Type', value: 'UI.ReferenceFacet' }
                                        }
                                    }
                                ],
                                attributes: {}
                            }
                        ]
                    }
                ]
            };

            // act
            const result = printTarget(target);

            // assert
            expect(result).toMatchSnapshot();
            /* "annotate AdminService.Books with {
                Autor @(UI.Facets : [
                    {
                      $Type : 'UI.ReferenceFacet',
                      Label : 'Sales',
                      ID : 'Sales',
                      Target : 'to_ProductSalesData/@UI.Chart',
                  },
                ],
                UI.Facets #qual1 : [
                    {
                        $Type : 'UI.ReferenceFacet',
                        Label : 'Sales',
                        ID : 'Sales',
                        Target : 'to_ProductSalesData/@UI.Chart',
                    },
                ]
                    )};
                " */
        });
        describe('primitive values as Annotation values', () => {
            const buildTarget = (name: string, value: string, asAttribute: boolean): Target => {
                const targetTemplate = {
                    name: 'AdminService.Books/Author',
                    terms: [
                        {
                            type: 'element',
                            name: 'Annotation',
                            attributes: {
                                Term: {
                                    type: 'attribute',
                                    name: 'Term',
                                    value: 'UI.TermAcceptingAnyValue'
                                },
                                Qualifier: {
                                    type: 'attribute',
                                    name: 'Qualifier',
                                    value: 'qual1'
                                }
                            },
                            content: []
                        }
                    ]
                };
                const target = JSON.parse(JSON.stringify(targetTemplate));
                const propValueElement = target.terms[0] as Element;
                if (asAttribute) {
                    propValueElement.attributes[name] = {
                        type: 'attribute',
                        name: name,
                        value: value
                    };
                } else {
                    propValueElement.content.push({
                        type: 'element',
                        name: name,
                        attributes: {},

                        content: [
                            {
                                type: 'text',
                                text: value
                            }
                        ]
                    });
                }
                return target;
            };

            test('String', () => {
                let result = printTarget(buildTarget(Edm.String, 'myStringAttribute', true));
                expect(result).toMatchSnapshot();
                result = printTarget(buildTarget(Edm.String, 'myStringTextNode', false));
                expect(result).toMatchSnapshot();
            });
            test('Boolean', () => {
                let result = printTarget(buildTarget(Edm.Bool, 'true', true));
                expect(result).toMatchSnapshot();
                result = printTarget(buildTarget(Edm.Bool, 'false', false));
                expect(result).toMatchSnapshot();
            });
            test('EnumMember', () => {
                let result = printTarget(buildTarget(Edm.EnumMember, 'UI.ChartDefinitionType/Column', true));
                expect(result).toMatchSnapshot();
                result = printTarget(buildTarget(Edm.EnumMember, 'UI.ChartDefinitionType/Column', false));
                expect(result).toMatchSnapshot();
            });
            test('AnnotationPath', () => {
                let result = printTarget(buildTarget(Edm.AnnotationPath, '$1', true));
                expect(result).toMatchSnapshot();
                result = printTarget(buildTarget(Edm.AnnotationPath, 'ns1.seg1/seg2/@seg3', false));
                expect(result).toMatchSnapshot();
            });
            test('Path', () => {
                let result = printTarget(buildTarget(Edm.Path, 'navProp1/prop2', true));
                expect(result).toMatchSnapshot();
                result = printTarget(buildTarget(Edm.Path, 'navProp1/@UI.Chart/chartType', false));
                expect(result).toMatchSnapshot();
            });
        });

        describe('primitive values as PropertyValues', () => {
            const buildTarget = (name: string, value: string, asAttribute: boolean, emptyContent = false): Target => {
                const targetTemplate = {
                    name: 'AdminService.Books/Author',
                    terms: [
                        {
                            type: 'element',
                            name: 'Annotation',
                            attributes: {
                                Term: { type: 'attribute', name: 'Term', value: 'UI.LineItem' }
                            },
                            content: [
                                {
                                    type: 'element',
                                    name: 'Collection',
                                    content: [
                                        {
                                            type: 'element',
                                            name: 'Record',
                                            attributes: {
                                                Type: { type: 'attribute', name: 'Type', value: 'UI.DataField' }
                                            },
                                            content: [
                                                {
                                                    type: 'element',
                                                    name: 'PropertyValue',
                                                    attributes: {
                                                        Property: {
                                                            type: 'attribute',
                                                            name: 'Property',
                                                            value: 'Value'
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
                };
                const target = JSON.parse(JSON.stringify(targetTemplate));
                const propValueElement = target.terms[0].content[0].content[0].content[0] as Element;
                if (asAttribute) {
                    propValueElement.attributes[name] = {
                        type: 'attribute',
                        name: name,
                        value: value
                    };
                } else {
                    propValueElement.content.push({
                        type: 'element',
                        name: name,
                        attributes: {},

                        content: emptyContent
                            ? []
                            : [
                                  {
                                      type: 'text',
                                      text: value
                                  }
                              ]
                    });
                }
                return target;
            };

            test('String', () => {
                let result = printTarget(buildTarget(Edm.String, 'myStringAttribute', true));
                expect(result).toMatchSnapshot();
                result = printTarget(buildTarget(Edm.String, 'myStringTextNode', false));
                expect(result).toMatchSnapshot();
            });
            test('Boolean', () => {
                let result = printTarget(buildTarget(Edm.Bool, 'true', true));
                expect(result).toMatchSnapshot();
                result = printTarget(buildTarget(Edm.Bool, 'false', false));
                expect(result).toMatchSnapshot();
            });
            test('EnumMember', () => {
                let result = printTarget(
                    buildTarget(Edm.EnumMember, 'UI.ChartDefinitionType/Column UI.ChartDefinitionType/Row', true)
                );
                expect(result).toMatchSnapshot();
                result = printTarget(buildTarget(Edm.EnumMember, 'UI.ChartDefinitionType/Column', false));
                expect(result).toMatchSnapshot();
            });
            test('AnnotationPath', () => {
                let result = printTarget(buildTarget(Edm.AnnotationPath, 'ns1.seg1/seg2/@seg3', true));
                expect(result).toMatchSnapshot();
                result = printTarget(buildTarget(Edm.AnnotationPath, 'ns1.n2.seg1/seg2/@seg3', false));
                expect(result).toMatchSnapshot();
            });
            test('Path', () => {
                let result = printTarget(buildTarget(Edm.Path, 'navProp1/prop2', true));
                expect(result).toMatchSnapshot();
                result = printTarget(buildTarget(Edm.Path, 'navProp1/@UI.Chart/chartType', false));
                expect(result).toMatchSnapshot();
            });
            test('Int', () => {
                let result = printTarget(buildTarget('Int', '1', true));
                expect(result).toMatchSnapshot();
                result = printTarget(buildTarget('Int', '2', false));
                expect(result).toMatchSnapshot();
            });
            test('Null', () => {
                const result = printTarget(buildTarget('Null', '', false, true));
                expect(result).toMatchSnapshot();
            });
        });

        describe('Embedded annotation', () => {
            test('collection', () => {
                const target: Target = {
                    type: 'target',
                    name: 'AdminService.Books/Autor',
                    terms: [
                        {
                            type: 'element',
                            name: 'Annotation',
                            attributes: {
                                Term: {
                                    type: 'attribute',
                                    name: 'Term',
                                    value: 'UI.Facets'
                                }
                            },
                            content: [
                                {
                                    type: 'element',
                                    name: 'Collection',
                                    content: [
                                        {
                                            type: 'element',
                                            name: 'Record',
                                            content: [
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
                                                            value: 'Sales'
                                                        }
                                                    },
                                                    content: []
                                                }
                                            ],
                                            attributes: {
                                                Type: { type: 'attribute', name: 'Type', value: 'UI.ReferenceFacet' }
                                            }
                                        }
                                    ],
                                    attributes: {}
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
                                }
                            ]
                        }
                    ]
                };

                // act
                const result = printTarget(target);

                // assert
                expect(result).toMatchSnapshot();
            });
            test('record', () => {
                const target: Target = {
                    type: 'target',
                    name: 'AdminService.Books/Autor',
                    terms: [
                        {
                            type: 'element',
                            name: 'Annotation',
                            attributes: {
                                Term: {
                                    type: 'attribute',
                                    name: 'Term',
                                    value: 'UI.HeaderInfo'
                                }
                            },
                            content: [
                                {
                                    type: 'element',
                                    name: 'Record',
                                    content: [
                                        {
                                            type: 'element',
                                            name: 'PropertyValue',
                                            attributes: {
                                                Property: {
                                                    type: 'attribute',
                                                    name: 'Property',
                                                    value: 'TypeName'
                                                },
                                                String: {
                                                    type: 'attribute',
                                                    name: 'String',
                                                    value: 'My Book'
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
                                                            value: 'Core.Description'
                                                        },
                                                        Qualifier: {
                                                            type: 'attribute',
                                                            name: 'Qualifier',
                                                            value: 'something'
                                                        },
                                                        String: {
                                                            type: 'attribute',
                                                            name: 'String',
                                                            value: 'PropertyValue annotation'
                                                        }
                                                    },
                                                    content: []
                                                }
                                            ]
                                        },
                                        {
                                            type: 'element',
                                            name: 'Annotation',
                                            attributes: {
                                                Term: {
                                                    type: 'attribute',
                                                    name: 'Term',
                                                    value: 'Core.Description'
                                                },
                                                String: {
                                                    type: 'attribute',
                                                    name: 'String',
                                                    value: 'Record annotation'
                                                }
                                            },
                                            content: []
                                        }
                                    ],
                                    attributes: {
                                        Type: { type: 'attribute', name: 'Type', value: 'UI.HeaderInfo' }
                                    }
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
                                }
                            ]
                        }
                    ]
                };

                // act
                const result = printTarget(target);

                // assert
                expect(result).toMatchSnapshot();
            });
        });
    });

    describe('print', () => {
        describe('PropertyValue', () => {
            test("attributes['AnnotationPath']", () => {
                // arrange
                const element: Element = {
                    name: 'PropertyValue',

                    content: [],

                    attributes: {
                        Property: {
                            type: 'attribute',
                            name: 'Property',

                            value: 'Target'
                        },
                        AnnotationPath: {
                            type: 'attribute',
                            name: 'AnnotationPath',

                            value: '$0'
                        }
                    },
                    type: 'element'
                };

                // act
                const result = print(element);

                // assert
                expect(result).toMatchSnapshot();
            });

            /*test("attributes['String']", () => {
        // arrange
        const element: Element = {};

        // act
        const result = print(element );

        // assert
        expect(result).toMatchSnapshot();
    });*/
            /*test("attributes['EnumMember']", () => {
        // arrange
        const element: Element = 

        // act
        const result = print(element );

        // assert
        expect(result).toMatchSnapshot();
    });*/

            test('content.length', () => {
                // arrange
                const element: Element = {
                    name: 'PropertyValue',

                    content: [
                        {
                            name: 'Record',

                            content: [
                                {
                                    name: 'PropertyValue',

                                    content: [],

                                    attributes: {
                                        Property: {
                                            type: 'attribute',
                                            name: 'Property',

                                            value: 'Value'
                                        },
                                        $2: {
                                            type: 'attribute',
                                            name: '$2',

                                            value: ''
                                        }
                                    },
                                    type: 'element'
                                }
                            ],

                            attributes: {
                                Type: {
                                    type: 'attribute',
                                    name: 'Type',

                                    value: 'UI.DataField'
                                }
                            },
                            type: 'element'
                        }
                    ],

                    attributes: {
                        Property: {
                            type: 'attribute',
                            name: 'Property',

                            value: 'HeadLine'
                        }
                    },
                    type: 'element'
                };

                // act
                const result = print(element);

                // assert
                expect(result).toMatchSnapshot();
            });

            test('content.length (2)', () => {
                // arrange
                const element: Element[] = [
                    {
                        name: 'PropertyValue',

                        content: [],

                        attributes: {
                            Property: {
                                type: 'attribute',
                                name: 'Property',

                                value: 'TypeName'
                            },
                            $1: { type: 'attribute', name: '$1' } as Attribute
                        },
                        type: 'element'
                    },
                    {
                        name: 'PropertyValue',

                        content: [],

                        attributes: {
                            Property: {
                                type: 'attribute',
                                name: 'Property',

                                value: 'TypeNamePlural'
                            },
                            $2: { type: 'attribute', name: '$2' } as Attribute
                        },
                        type: 'element'
                    },
                    {
                        name: 'PropertyValue',

                        content: [{ text: '$3', type: 'text' }],

                        attributes: {
                            Property: {
                                type: 'attribute',
                                name: 'Property',

                                value: 'Title'
                            }
                        },
                        type: 'element'
                    },
                    {
                        name: 'PropertyValue',

                        content: [{ text: '$4', type: 'text' }],

                        attributes: {
                            Property: {
                                type: 'attribute',
                                name: 'Property',

                                value: 'Description'
                            }
                        },
                        type: 'element'
                    },
                    {
                        name: 'PropertyValue',

                        content: [],

                        attributes: {
                            Property: {
                                type: 'attribute',
                                name: 'Property',

                                value: 'ImageUrl'
                            },
                            $5: { type: 'attribute', name: '$5' } as Attribute
                        },
                        type: 'element'
                    },
                    {
                        name: 'PropertyValue',

                        content: [],

                        attributes: {
                            Property: {
                                type: 'attribute',
                                name: 'Property',

                                value: 'TypeImageUrl'
                            },
                            $6: { type: 'attribute', name: '$6' } as Attribute
                        },
                        type: 'element'
                    },
                    {
                        name: 'PropertyValue',

                        content: [],

                        attributes: {
                            Property: {
                                type: 'attribute',
                                name: 'Property',

                                value: 'Initials'
                            },
                            $0: { type: 'attribute', name: '$0' } as Attribute
                        },
                        type: 'element'
                    }
                ];

                // act
                const result = print(element);

                // assert
                expect(result).toMatchSnapshot();
            });

            test('annotation path', () => {
                // arrange
                const element: Element[] = [
                    {
                        name: 'PropertyValue',

                        content: [],

                        attributes: {
                            Property: {
                                type: 'attribute',
                                name: 'Property',

                                value: 'Target'
                            },
                            AnnotationPath: { type: 'attribute', name: 'AnnotationPath', value: '$1' }
                        },
                        type: 'element'
                    },
                    {
                        name: 'PropertyValue',

                        content: [],

                        attributes: {
                            Property: {
                                type: 'attribute',
                                name: 'Property',

                                value: 'Label'
                            },
                            $2: { type: 'attribute', name: '$2' } as Attribute
                        },
                        type: 'element'
                    },
                    {
                        name: 'PropertyValue',

                        content: [],

                        attributes: {
                            Property: {
                                type: 'attribute',
                                name: 'Property',

                                value: 'ID'
                            },
                            $0: { type: 'attribute', name: '$0' } as Attribute
                        },
                        type: 'element'
                    }
                ];

                // act
                const result = print(element);

                // assert
                expect(result).toMatchSnapshot();
            });

            test('else', () => {
                // arrange
                const element: Element = {
                    name: 'PropertyValue',

                    content: [],

                    attributes: {
                        Property: {
                            type: 'attribute',
                            name: 'Property',

                            value: 'Value'
                        },
                        $1: {
                            type: 'attribute',
                            name: '$1',

                            value: ''
                        }
                    },
                    type: 'element'
                };

                // act
                const result = print(element);

                // assert
                expect(result).toMatchSnapshot();
            });
        });

        test('Record', () => {
            // arrange
            const element: Element = {
                name: 'Record',
                content: [
                    {
                        name: 'PropertyValue',

                        content: [],

                        attributes: {
                            Property: {
                                type: 'attribute',
                                name: 'Property',

                                value: 'Kind'
                            },
                            $2: {
                                type: 'attribute',
                                name: '$2',

                                value: ''
                            }
                        },
                        type: 'element'
                    },
                    {
                        name: 'PropertyValue',

                        content: [],

                        attributes: {
                            Property: {
                                type: 'attribute',
                                name: 'Property',

                                value: 'Description'
                            },
                            $0: {
                                type: 'attribute',
                                name: '$0',

                                value: ''
                            }
                        },
                        type: 'element'
                    }
                ],

                attributes: {
                    Type: {
                        type: 'attribute',
                        name: 'Type',

                        value: 'Core.RevisionType'
                    }
                },
                type: 'element'
            };

            // act
            const result = print(element);

            // assert
            expect(result).toMatchSnapshot();
        });
        test('Record with placeholder', () => {
            // arrange
            const element: Element = {
                name: 'Record',
                content: [
                    {
                        type: 'text',
                        text: '$0'
                    }
                ],

                type: 'element',
                attributes: {}
            };

            // act
            const result = print(element);

            // assert
            expect(result).toEqual('{\n    $0\n}');
        });
        test('Record indentation', () => {
            // arrange
            const element: Element = {
                name: 'Annotation',
                content: [
                    {
                        name: 'Record',

                        content: [
                            {
                                name: 'PropertyValue',

                                content: [],

                                attributes: {
                                    Property: {
                                        type: 'attribute',
                                        name: 'Property',

                                        value: 'ImprovementDirection'
                                    },
                                    $0: { type: 'attribute', name: '$0', value: '' }
                                },
                                type: 'element'
                            }
                        ],

                        attributes: {
                            Type: {
                                type: 'attribute',
                                name: 'Type',

                                value: 'UI.CriticalityCalculationType'
                            }
                        },
                        type: 'element'
                    }
                ],

                attributes: {
                    Term: {
                        type: 'attribute',
                        name: 'Term',

                        value: '![@UI.CriticalityCalculation]'
                    },
                    $1: { type: 'attribute', name: '$1', value: '' }
                },
                type: 'element'
            };

            // act
            const result = print(element);

            // assert
            expect(result).toEqual(`![@UI.CriticalityCalculation] : {
    \\$Type : 'UI.CriticalityCalculationType',
    ImprovementDirection : $0,
}`);
        });

        describe('Annotation', () => {
            test('content.length <= 0', () => {
                // arrange
                const element: Element = {
                    name: 'Annotation',

                    content: [],

                    attributes: {
                        Term: {
                            type: 'attribute',
                            name: 'Term',

                            value: 'Core.Description'
                        },
                        String: { type: 'attribute', name: 'String', value: '$0' }
                    },
                    type: 'element'
                };

                // act
                const result = print(element);

                // assert
                expect(result).toMatchSnapshot();
            });

            test('content.length > 0', () => {
                // arrange
                const element: Element = {
                    name: 'Annotation',

                    content: [
                        {
                            name: 'Collection',

                            content: [
                                {
                                    name: 'Record',

                                    content: [
                                        {
                                            name: 'PropertyValue',

                                            content: [],

                                            attributes: {
                                                Property: {
                                                    type: 'attribute',
                                                    name: 'Property',

                                                    value: 'Kind'
                                                },
                                                $2: {
                                                    type: 'attribute',
                                                    name: '$2',

                                                    value: ''
                                                }
                                            },
                                            type: 'element'
                                        },
                                        {
                                            name: 'PropertyValue',

                                            content: [],

                                            attributes: {
                                                Property: {
                                                    type: 'attribute',
                                                    name: 'Property',

                                                    value: 'Description'
                                                },
                                                $0: {
                                                    type: 'attribute',
                                                    name: '$0',

                                                    value: ''
                                                }
                                            },
                                            type: 'element'
                                        }
                                    ],

                                    attributes: {
                                        Type: {
                                            type: 'attribute',
                                            name: 'Type',

                                            value: 'Core.RevisionType'
                                        }
                                    },
                                    type: 'element'
                                }
                            ],

                            attributes: {},
                            type: 'element'
                        }
                    ],

                    attributes: {
                        Term: {
                            type: 'attribute',
                            name: 'Term',

                            value: 'Core.Revisions'
                        },
                        $1: { type: 'attribute', name: '$1', value: '' }
                    },
                    type: 'element'
                };

                // act
                const result = print(element);

                // assert
                expect(result).toMatchSnapshot();
            });
        });

        test('Collection', () => {
            // arrange
            const element: Element = {
                name: 'Collection',
                content: [
                    {
                        name: 'Record',

                        content: [
                            {
                                name: 'PropertyValue',

                                content: [],

                                attributes: {
                                    Property: {
                                        type: 'attribute',
                                        name: 'Property',

                                        value: 'rel'
                                    },
                                    $2: {
                                        type: 'attribute',
                                        name: '$2',

                                        value: ''
                                    }
                                },
                                type: 'element'
                            },
                            {
                                name: 'PropertyValue',

                                content: [],

                                attributes: {
                                    Property: {
                                        type: 'attribute',
                                        name: 'Property',

                                        value: 'href'
                                    },
                                    $0: {
                                        type: 'attribute',
                                        name: '$0',

                                        value: ''
                                    }
                                },
                                type: 'element'
                            }
                        ],

                        attributes: {
                            Type: {
                                type: 'attribute',
                                name: 'Type',

                                value: 'Core.Link'
                            }
                        },
                        type: 'element'
                    }
                ],

                attributes: {},
                type: 'element'
            };

            // act
            const result = print(element);

            // assert
            expect(result).toMatchSnapshot();
        });
        test('Collection with placeholder', () => {
            // arrange
            const element: Element = {
                name: 'Collection',
                content: [
                    {
                        type: 'text',
                        text: '$0'
                    }
                ],

                attributes: {},
                type: 'element'
            };

            // act
            const result = print(element);

            // assert
            expect(result).toEqual('[\n    $0\n]');
        });
        test('Record', () => {
            // arrange
            const element: Element[] = [
                {
                    name: 'PropertyValue',

                    content: [],

                    attributes: {
                        Property: {
                            type: 'attribute',
                            name: 'Property',

                            value: 'rel'
                        },
                        $2: {
                            type: 'attribute',
                            name: '$2',

                            value: ''
                        }
                    },
                    type: 'element'
                },
                {
                    name: 'PropertyValue',

                    content: [],

                    attributes: {
                        Property: {
                            type: 'attribute',
                            name: 'Property',
                            value: 'href'
                        },
                        $0: {
                            type: 'attribute',
                            name: '$0',
                            value: ''
                        }
                    },
                    type: 'element'
                },
                {
                    type: 'element',
                    name: 'Record',

                    content: [
                        {
                            type: 'text',
                            text: '$3'
                        }
                    ],

                    attributes: {
                        Type: {
                            type: 'attribute',
                            name: 'Type',
                            value: 'UI.ReferencePeriod'
                        }
                    }
                }
            ];

            // act
            const result = print(element);

            // assert
            expect(result).toMatchSnapshot();
        });

        test('Text', () => {
            // arrange
            const element: TextNode = {
                text: '$0',
                type: 'text'
            };

            // act
            const result = print(element);

            // assert
            expect(result).toMatchSnapshot();
        });

        test('Default', () => {
            // arrange
            const element: Element = {
                name: 'String',
                content: [{ text: '$0', type: 'text' }],

                attributes: {},
                type: 'element'
            };

            // act
            const result = print(element);

            // assert
            expect(result).toMatchSnapshot();
        });

        test('Multi line string', () => {
            // arrange
            const element: Element = {
                name: 'String',
                content: [{ text: 'a\nb', type: 'text' }],

                attributes: {},
                type: 'element'
            };

            // act
            const result = print(element);

            // assert
            expect(result).toMatchSnapshot();
        });

        test('complete term', () => {
            // arrange
            const element: Element = {
                name: 'Annotation',
                content: [
                    {
                        name: 'Record',

                        content: [
                            {
                                name: 'PropertyValue',

                                content: [
                                    {
                                        name: 'Record',

                                        content: [
                                            {
                                                name: 'PropertyValue',

                                                content: [],

                                                attributes: {
                                                    Property: {
                                                        type: 'attribute',
                                                        name: 'Property',

                                                        value: 'Value'
                                                    },
                                                    $2: {
                                                        type: 'attribute',
                                                        name: '$2',

                                                        value: ''
                                                    }
                                                },
                                                type: 'element'
                                            }
                                        ],

                                        attributes: {
                                            Type: {
                                                type: 'attribute',
                                                name: 'Type',

                                                value: 'UI.DataField'
                                            }
                                        },
                                        type: 'element'
                                    }
                                ],

                                attributes: {
                                    Property: {
                                        type: 'attribute',
                                        name: 'Property',

                                        value: 'HeadLine'
                                    }
                                },
                                type: 'element'
                            },
                            {
                                name: 'PropertyValue',

                                content: [
                                    {
                                        name: 'Record',

                                        content: [
                                            {
                                                name: 'PropertyValue',

                                                content: [],

                                                attributes: {
                                                    Property: {
                                                        type: 'attribute',
                                                        name: 'Property',

                                                        value: 'Value',
                                                        valueRange: noRange
                                                    },
                                                    $0: {
                                                        type: 'attribute',
                                                        name: '$0',

                                                        value: '',
                                                        valueRange: noRange
                                                    }
                                                },
                                                type: 'element'
                                            }
                                        ],

                                        attributes: {
                                            Type: {
                                                type: 'attribute',
                                                name: 'Type',
                                                value: 'UI.DataField'
                                            }
                                        },
                                        type: 'element'
                                    }
                                ],

                                attributes: {
                                    Property: {
                                        type: 'attribute',
                                        name: 'Property',
                                        value: 'Title'
                                    }
                                },
                                type: 'element'
                            }
                        ],

                        attributes: {
                            Type: {
                                type: 'attribute',
                                name: 'Type',
                                value: 'UI.BadgeType'
                            }
                        },
                        type: 'element'
                    }
                ],

                attributes: {
                    Term: { type: 'attribute', name: 'Term', value: 'UI.Badge' },
                    $1: { type: 'attribute', name: '$1', value: '' }
                },
                type: 'element'
            };

            // act
            const result = print(element);

            // assert
            expect(result).toMatchSnapshot();
        });

        describe('primitive values', () => {
            const buildAnnotation = (name: string, value: string, asAttribute: boolean): Element => {
                const targetTemplate = {
                    type: 'element',
                    name: 'Annotation',
                    attributes: {
                        Term: { type: 'attribute', name: 'Term', value: 'Primitive.Value' }
                    },
                    content: []
                };
                const annotation = JSON.parse(JSON.stringify(targetTemplate));
                if (asAttribute) {
                    annotation.attributes[name] = {
                        type: 'attribute',
                        name: name,
                        value: value
                    };
                } else {
                    annotation.content.push({
                        type: 'element',
                        name: name,
                        attributes: {},
                        content: [
                            {
                                type: 'text',
                                text: value
                            }
                        ]
                    });
                }
                return annotation;
            };

            const primitiveValueTest = (name: string, value: string): void => {
                test(`${name} attribute ${value}`, () => {
                    // arrange
                    const element: Element = buildAnnotation(name, value, true);
                    // act
                    const result = print(element);
                    // assert
                    expect(result).toMatchSnapshot();
                });
                test(`${name} element ${value}`, () => {
                    // arrange
                    const element: Element = buildAnnotation(name, value, false);
                    // act
                    const result = print(element);
                    // assert
                    expect(result).toMatchSnapshot();
                });
            };

            primitiveValueTest('Int', '1');
            primitiveValueTest('Int', '$0');
            primitiveValueTest('String', 'abc');
            primitiveValueTest('Bool', 'true');
            primitiveValueTest('Bool', 'false');
            primitiveValueTest('EnumMember', 'Alias.Type/Value');
        });

        describe('Default boolean true value:', () => {
            test(`Annotation with no value element`, () => {
                // arrange
                const targetTemplate = {
                    type: 'element',
                    name: 'Annotation',
                    attributes: {
                        Term: { type: 'attribute', name: 'Term', value: 'UI.Hidden' }
                    },
                    content: []
                };
                const element = JSON.parse(JSON.stringify(targetTemplate));
                // act
                const result = print(element);
                // assert
                expect(result).toMatchSnapshot();
            });

            test(`PropertyValue with no value element`, () => {
                // arrange
                const targetTemplate = {
                    type: 'element',
                    name: 'PropertyValue',
                    attributes: {
                        Property: { type: 'attribute', name: 'Property', value: 'SomeBooleanProperty' }
                    },
                    content: []
                };
                const element = JSON.parse(JSON.stringify(targetTemplate));
                // act
                const result = print(element);
                // assert
                expect(result).toMatchSnapshot();
            });
        });
    });
    test(`use attribute value over content value`, () => {
        // arrange
        const targetTemplate = {
            type: 'element',
            name: 'PropertyValue',
            attributes: {
                Property: { type: 'attribute', name: 'Property', value: 'SomeBooleanProperty' },
                Bool: { type: 'attribute', name: 'Bool', value: 'true' }
            },
            content: [
                { type: 'text', text: '\n' },
                { type: 'text', text: '\t' },
                { type: 'text', text: ' ' },
                { type: 'text', text: '' }
            ]
        };
        const element = JSON.parse(JSON.stringify(targetTemplate));
        // act
        const result = print(element, printOptions);
        // assert
        expect(result).toMatchInlineSnapshot(`"SomeBooleanProperty : true"`);
    });
    test(`primitive annotation value`, () => {
        // arrange
        const targetTemplate = {
            type: 'element',
            name: 'Annotation',
            attributes: {
                Term: { type: 'attribute', name: 'Term', value: 'Core.OperationAvailable' },
                Bool: { type: 'attribute', name: 'Bool', value: 'true' }
            }
        };
        const element = JSON.parse(JSON.stringify(targetTemplate));
        // act
        const result = print(element, printOptions);
        // assert
        expect(result).toMatchInlineSnapshot(`"Core.OperationAvailable : true"`);
    });

    test(`collection with empty text nodes`, () => {
        // arrange
        const targetTemplate = {
            type: 'element',
            name: 'Collection',
            content: [
                { type: 'text', text: '\n' },
                { type: 'text', text: '\t' },
                { type: 'text', text: ' ' },
                { type: 'text', text: '' },
                {
                    type: 'element',
                    name: 'Collection'
                }
            ]
        };
        const element = JSON.parse(JSON.stringify(targetTemplate));
        // act
        const result = print(element, { ...printOptions, useSnippetSyntax: false });
        // assert
        expect(result).toMatchInlineSnapshot(`
            "[
                [
                ],
            ]"
        `);
    });

    test(`record with empty text nodes`, () => {
        // arrange
        const targetTemplate = {
            type: 'element',
            name: 'Record',
            content: [
                { type: 'text', text: '\n' },
                { type: 'text', text: '\t' },
                { type: 'text', text: ' ' },
                { type: 'text', text: '' },
                {
                    type: 'element',
                    name: 'PropertyValue',
                    attributes: {
                        Property: { type: 'attribute', name: 'Property', value: 'Test' }
                        // String: { type: 'attribute', name: 'String', value: '123' }
                    },
                    content: [
                        { type: 'text', text: '\n' },
                        { type: 'text', text: '\t' },
                        { type: 'text', text: ' ' },
                        { type: 'text', text: '' },
                        {
                            type: 'element',
                            name: 'String',
                            content: [{ type: 'text', text: '  123  ' }]
                        }
                    ]
                }
            ]
        };
        const element = JSON.parse(JSON.stringify(targetTemplate));
        // act
        const result = print(element, { ...printOptions, useSnippetSyntax: false });
        // assert
        expect(result).toMatchInlineSnapshot(`
            "{
                Test : '  123  ',
            }"
        `);
    });
    test(`annotation with records and text content`, () => {
        // arrange
        const targetTemplate = {
            type: 'element',
            name: 'Annotation',
            attributes: {
                Term: { type: 'attribute', name: 'Term', value: 'UI.SelectionVariant' },
                Qualifier: { type: 'attribute', name: 'Qualifier', value: 'Expensive' }
            },
            content: [
                { type: 'text', text: '\n    ' },
                { type: 'text', text: '\t    ' },
                {
                    type: 'element',
                    name: 'Record',
                    attributes: {},
                    content: [
                        { type: 'text', text: '\n        ' },
                        {
                            type: 'element',
                            name: 'PropertyValue',
                            attributes: {
                                Property: { type: 'attribute', name: 'Property', value: 'Text' },
                                String: { type: 'attribute', name: 'String', value: 'Expensive' }
                            },
                            content: [{ type: 'text', text: '\n        ' }]
                        },
                        { type: 'text', text: '\n        ' },

                        { type: 'text', text: '\n    ' }
                    ]
                },
                { type: 'text', text: '\n' }
            ]
        };
        const element = JSON.parse(JSON.stringify(targetTemplate));
        // act
        const result = print(element, { ...printOptions, useSnippetSyntax: false });
        // assert
        expect(result).toMatchInlineSnapshot(`
            "UI.SelectionVariant #Expensive : {
                Text : 'Expensive',
            }"
        `);
    });

    test(`Records with embedded annotations`, () => {
        // arrange
        const targetTemplate = {
            type: 'element',
            name: 'Annotation',
            attributes: {
                Term: { type: 'attribute', name: 'Term', value: 'UI.SelectionVariant' },
                Qualifier: { type: 'attribute', name: 'Qualifier', value: 'Expensive' }
            },
            content: [
                { type: 'text', text: '\n    ' },
                { type: 'text', text: '\t    ' },
                {
                    type: 'element',
                    name: 'Record',
                    attributes: {},
                    content: [
                        {
                            type: 'element',
                            name: 'PropertyValue',
                            attributes: {
                                Property: { type: 'attribute', name: 'Property', value: 'Text' },
                                String: { type: 'attribute', name: 'String', value: 'Expensive' }
                            },
                            content: [{ type: 'text', text: '\n        ' }]
                        },
                        {
                            type: 'element',
                            name: 'Annotation',
                            attributes: {
                                Term: { type: 'attribute', name: 'Term', value: 'UI.Importance' }
                            }
                        }
                    ]
                },
                { type: 'text', text: '\n' }
            ]
        };
        const element = JSON.parse(JSON.stringify(targetTemplate));
        // act
        const result = print(element, { ...printOptions, useSnippetSyntax: false });
        // assert
        expect(result).toMatchInlineSnapshot(`
            "UI.SelectionVariant #Expensive : {
                Text : 'Expensive',
                ![@UI.Importance],
            }"
        `);
    });

    describe(`edmJson`, () => {
        test(`term value`, () => {
            // arrange
            const targetTemplate = {
                type: 'element',
                name: 'Annotation',
                attributes: {
                    Term: { type: 'attribute', name: 'Term', value: 'Test' }
                },
                content: [
                    {
                        type: 'element',
                        name: 'If',
                        content: [
                            { type: 'text', text: '\n' },
                            { type: 'text', text: '\t' },
                            { type: 'text', text: ' ' },
                            { type: 'text', text: '' },
                            {
                                type: 'element',
                                name: 'String',
                                content: [{ type: 'text', text: '  123  ' }]
                            }
                        ]
                    }
                ]
            };
            const element = JSON.parse(JSON.stringify(targetTemplate));
            // act
            const result = print(element, { ...printOptions, useSnippetSyntax: false });
            // assert
            expect(result).toMatchInlineSnapshot(`
                "Test : {
                    $edmJson : {
                        $If : [
                            '  123  ',
                        ],
                    },
                }"
            `);
        });
        test(`record value`, () => {
            // arrange
            const targetTemplate = {
                type: 'element',
                name: 'Record',
                content: [
                    {
                        type: 'element',
                        name: 'PropertyValue',
                        attributes: {
                            Property: { type: 'attribute', name: 'Property', value: 'Test' }
                        },
                        content: [
                            {
                                type: 'element',
                                name: 'If'
                            }
                        ]
                    }
                ]
            };
            const element = JSON.parse(JSON.stringify(targetTemplate));
            // act
            const result = print(element, { ...printOptions, useSnippetSyntax: false });
            // assert
            expect(result).toMatchInlineSnapshot(`
                "{
                    Test : {
                        $edmJson : {
                            $If : [
                            ],
                        },
                    },
                }"
            `);
        });

        test(`Apply`, () => {
            // arrange
            const targetTemplate = {
                type: 'element',
                name: 'Apply'
            };
            const element = JSON.parse(JSON.stringify(targetTemplate));
            // act
            const result = print(element, { ...printOptions, useSnippetSyntax: false });
            // assert
            expect(result).toMatchInlineSnapshot(`
                "{
                    $edmJson : {
                        $Apply : [
                        ],
                    },
                }"
            `);
        });

        test(`Not`, () => {
            // arrange
            const targetTemplate = {
                type: 'element',
                name: 'Not'
            };
            const element = JSON.parse(JSON.stringify(targetTemplate));
            // act
            const result = print(element, { ...printOptions, useSnippetSyntax: false });
            // assert
            expect(result).toMatchInlineSnapshot(`
                "{
                    $edmJson : {
                        $Not : [
                        ],
                    },
                }"
            `);
        });

        test(`If`, () => {
            // arrange
            const targetTemplate = {
                type: 'element',
                name: 'If'
            };
            const element = JSON.parse(JSON.stringify(targetTemplate));
            // act
            const result = print(element, { ...printOptions, useSnippetSyntax: false });
            // assert
            expect(result).toMatchInlineSnapshot(`
                "{
                    $edmJson : {
                        $If : [
                        ],
                    },
                }"
            `);
        });
    });
});

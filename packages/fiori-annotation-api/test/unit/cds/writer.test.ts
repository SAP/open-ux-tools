import { TextDocument } from 'vscode-languageserver-textdocument';

import { createElementNode, createAttributeNode, Edm, createTextNode } from '@sap-ux/odata-annotation-core-types';
import { VocabularyService } from '@sap-ux/odata-vocabularies';

import type { CDSDocumentChange } from '../../../src/cds/change';
import {
    MOVE_COLLECTION_VALUE_CHANGE_TYPE,
    createDeleteAnnotationChange,
    createDeleteAnnotationGroupChange,
    createDeleteAnnotationGroupItemsChange,
    createDeleteTargetChange,
    createInsertAnnotationChange,
    createInsertRecordPropertyChange
} from '../../../src/cds/change';
import { CDSWriter } from '../../../src/cds/writer';

import { applyTextEdits } from '../apply-edits';
import { PROJECTS } from '../projects';

import { getCDSDocument } from './utils';

async function testWriter(
    text: string,
    changes: CDSDocumentChange[],
    expectedText: string,
    log = false
): Promise<void> {
    const vocabularyService = new VocabularyService(true);
    const [facade, document] = await getCDSDocument(PROJECTS.V4_CDS_START.root, text);
    const textDocument = TextDocument.create(document.uri, 'cds', 0, text);
    const writer = new CDSWriter(
        facade,
        vocabularyService,
        document.ast,
        document.comments,
        document.tokens,
        textDocument,
        PROJECTS.V4_CDS_START.root,
        document.annotationFile
    );
    for (const change of changes) {
        writer.addChange(change);
    }

    const edits = await writer.getTextEdits();
    const textAfterEdit = applyTextEdits(document.uri, 'cds', edits, text);
    if (log) {
        console.log(text);
        console.log(JSON.stringify(edits, undefined, 2));
        console.log(textAfterEdit);
    }
    expect(textAfterEdit).toStrictEqual(expectedText);
}

/**
 * There are multiple text edits that lead to the same output text.
 * For this reason we should use resulting text for testing instead.
 */
describe('cds writer', () => {
    describe('insert target', () => {
        test('annotate service entity', async () => {
            const fixture = 'Service S { entity E {}; };';
            await testWriter(
                fixture,
                [
                    {
                        type: 'insert-target',
                        pointer: '',
                        target: {
                            type: 'target',
                            name: 'S.E',
                            terms: [
                                createElementNode({
                                    name: Edm.Annotation,
                                    attributes: {
                                        [Edm.Term]: createAttributeNode(Edm.Term, 'UI.LineItem')
                                    },
                                    content: [
                                        createElementNode({
                                            name: Edm.Collection
                                        })
                                    ]
                                })
                            ]
                        }
                    }
                ],
                fixture +
                    `
annotate S.E with @(
    UI.LineItem : [
    ]
);

`
            );
        });
        test('annotate element', async () => {
            const fixture = 'Service S { entity E {}; };';
            await testWriter(
                fixture,
                [
                    {
                        type: 'insert-target',
                        pointer: '',
                        target: {
                            type: 'target',
                            name: 'S.E/category',
                            terms: [
                                createElementNode({
                                    name: Edm.Annotation,
                                    attributes: {
                                        [Edm.Term]: createAttributeNode(Edm.Term, 'UI.Hidden'),
                                        [Edm.Bool]: createAttributeNode(Edm.Bool, 'true')
                                    }
                                })
                            ]
                        }
                    }
                ],
                fixture +
                    `
annotate S.E with {
    category @UI.Hidden : true
};

`
            );
        });
        test('annotate element with existing annotate statement', async () => {
            const fixture = `Service S { entity E {}; };
annotate S.E with @(
    UI.LineItem : []
);`;
            await testWriter(
                fixture,
                [
                    {
                        type: 'insert-target',
                        pointer: '',
                        target: {
                            type: 'target',
                            name: 'S.E/category',
                            terms: [
                                createElementNode({
                                    name: Edm.Annotation,
                                    attributes: {
                                        [Edm.Term]: createAttributeNode(Edm.Term, 'UI.Hidden'),
                                        [Edm.Bool]: createAttributeNode(Edm.Bool, 'true')
                                    }
                                })
                            ]
                        }
                    }
                ],
                fixture +
                    `
annotate S.E with {
    category @UI.Hidden : true
};

`
            );
        });
    });

    describe('insert', () => {
        describe('reference', () => {
            test('no references', async () => {
                const fixture = ``;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'insert-reference',
                            pointer: '/references',
                            references: ['db/schema.cds']
                        }
                    ],
                    "using from './db/schema';\n"
                );
            });
            test('existing reference', async () => {
                const fixture = `using { sap.fe.cap.travel as my } from './db/schema';`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'insert-reference',
                            pointer: '/references',
                            references: ['db/schema.cds']
                        }
                    ],
                    `using { sap.fe.cap.travel as my } from './db/schema';
using from './db/schema';
`
                );
            });
        });
        describe('annotation', () => {
            const lineItem = createElementNode({
                name: Edm.Annotation,
                attributes: {
                    [Edm.Term]: createAttributeNode(Edm.Term, 'UI.LineItem'),
                    [Edm.Qualifier]: createAttributeNode(Edm.Qualifier, 'second')
                },
                content: [
                    createElementNode({
                        name: Edm.Collection
                    })
                ]
            });
            test('group', async () => {
                const fixture = `Service S { entity E {}; };
annotate S.E with @UI : {
    LineItem : []
};`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'insert-annotation',
                            pointer: '/targets/0',
                            element: lineItem
                        }
                    ],
                    `Service S { entity E {}; };
annotate S.E with @(
    UI : {
        LineItem : []
    },
    UI.LineItem #second : [
    ],
);`
                );
            });
            test('group containing @', async () => {
                // test@UI.Hidden leads to compile error, once it is supported we should test it as well
                const fixture = `Service S { entity E {}; };
annotate S.E with @UI : {
    LineItem : [
        {
            Label : '@UI.Chart#qualChart',
            @UI.Hidden : true,
            ![@UI.Hidden#two] : test.@UI.Hidden,
        }
    ]
};`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'insert-annotation',
                            pointer: '/targets/0',
                            element: lineItem
                        }
                    ],
                    `Service S { entity E {}; };
annotate S.E with @(
    UI : {
        LineItem : [
            {
                Label : '@UI.Chart#qualChart',
                @UI.Hidden : true,
                ![@UI.Hidden#two] : test.@UI.Hidden,
            }
        ]
    },
    UI.LineItem #second : [
    ],
);`
                );
            });
            test('compound annotations with @', async () => {
                const fixture = `Service S { entity E {}; };
annotate S.E with @(
    UI.LineItem : [
        {
            Label : '@UI.Chart#qualChart',
            @UI.Hidden : true,
            ![@UI.Hidden#two] : test.@UI.Hidden,
        }
    ],
    UI.LineItem #next : [
        {
            Label : '@UI.Chart#qualChart',
            @UI.Hidden : true,
            ![@UI.Hidden#two] : test.@UI.Hidden,
        }
    ],
);`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'insert-annotation',
                            pointer: '/targets/0',
                            element: lineItem
                        }
                    ],
                    `Service S { entity E {}; };
annotate S.E with @(
    UI.LineItem : [
        {
            Label : '@UI.Chart#qualChart',
            @UI.Hidden : true,
            ![@UI.Hidden#two] : test.@UI.Hidden,
        }
    ],
    UI.LineItem #next : [
        {
            Label : '@UI.Chart#qualChart',
            @UI.Hidden : true,
            ![@UI.Hidden#two] : test.@UI.Hidden,
        }
    ],
    UI.LineItem #second : [
    ],
);`
                );
            });
            test('compound annotation', async () => {
                const fixture = `Service S { entity E {}; };
annotate S.E with @(
    UI.LineItem : []
);`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'insert-annotation',
                            pointer: '/targets/0',
                            element: lineItem
                        }
                    ],
                    `Service S { entity E {}; };
annotate S.E with @(
    UI.LineItem : [],
    UI.LineItem #second : [
    ],
);`
                );
            });
            test('compound annotation without comma', async () => {
                const fixture = `Service S { entity E {}; };
annotate S.E with @(
    UI.FieldGroup : {
        Data: [],
    }
);`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'insert-annotation',
                            pointer: '/targets/0',
                            element: lineItem
                        }
                    ],
                    `Service S { entity E {}; };
annotate S.E with @(
    UI.FieldGroup : {
        Data: [],
    },
    UI.LineItem #second : [
    ],
);`
                );
            });

            test('compound annotation with comma', async () => {
                const fixture = `Service S { entity E {}; };
annotate S.E with @(
    UI.LineItem : [],
    UI.LineItem #b : [],
);`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'insert-annotation',
                            pointer: '/targets/0',
                            element: lineItem
                        }
                    ],
                    `Service S { entity E {}; };
annotate S.E with @(
    UI.LineItem : [],
    UI.LineItem #b : [],
    UI.LineItem #second : [
    ],
);`
                );
            });
            test('single annotation', async () => {
                const fixture = `Service S { entity E {}; };
annotate S.E with @UI.LineItem : [];`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'insert-annotation',
                            pointer: '/targets/0',
                            element: lineItem
                        }
                    ],
                    `Service S { entity E {}; };
annotate S.E with @(
    UI.LineItem : [],
    UI.LineItem #second : [
    ],
);`
                );
            });
            test('to existing element', async () => {
                const fixture = `Service S { entity E { name: String; }; };
annotate S.E with {
    name @Common.Label : 'label';
};`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'insert-annotation',
                            pointer: '/targets/0',
                            element: createElementNode({
                                name: Edm.Annotation,
                                attributes: {
                                    [Edm.Term]: createAttributeNode(Edm.Term, 'UI.Hidden'),
                                    [Edm.Bool]: createAttributeNode(Edm.Bool, 'true')
                                },
                                content: []
                            })
                        }
                    ],
                    `Service S { entity E { name: String; }; };
annotate S.E with {
    name @(
        Common.Label : 'label',
        UI.Hidden : true,
    );
};`
                );
            });
            test('to existing element and delete multiple lines', async () => {
                const fixture = `Service S { entity E { name: String; }; };
annotate S.E with @UI.LineItem : [
    {
        Value: original
    }
];`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'delete-record',
                            pointer: '/targets/0/assignments/0/value/items/0'
                        },
                        {
                            type: 'insert-annotation',
                            pointer: '/targets/0',
                            element: createElementNode({
                                name: Edm.Annotation,
                                attributes: {
                                    [Edm.Term]: createAttributeNode(Edm.Term, 'UI.Hidden'),
                                    [Edm.Bool]: createAttributeNode(Edm.Bool, 'true')
                                },
                                content: []
                            })
                        }
                    ],
                    `Service S { entity E { name: String; }; };
annotate S.E with @(
    UI.LineItem : [
    
],
    UI.Hidden : true,
);`
                );
            });
            test('no semicolon after element annotation', async () => {
                const fixture = `Service S { entity E { name: String; }; };
annotate S.E with {
    name @Common.Label: 'abc'
};`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'insert-annotation',
                            pointer: '/targets/0',
                            element: createElementNode({
                                name: Edm.Annotation,
                                attributes: {
                                    [Edm.Term]: createAttributeNode(Edm.Term, 'UI.Hidden'),
                                    [Edm.Bool]: createAttributeNode(Edm.Bool, 'true')
                                },
                                content: []
                            })
                        }
                    ],
                    `Service S { entity E { name: String; }; };
annotate S.E with {
    name @(
        Common.Label: 'abc',
        UI.Hidden : true,
    )
};`
                );
            });
            test('multiple annotations with no semicolon on element', async () => {
                const fixture = `Service S { entity E { name: String; }; };
annotate S.E with {
    name @Common.Label: 'abc' @Common.Label #two : {
        $value: 'abc',
        @Core.Description : '@UI.Chart#qualChart',
        ![@UI.Hidden] : test.@UI.Hidden,
    }
};`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'insert-annotation',
                            pointer: '/targets/0',
                            element: createElementNode({
                                name: Edm.Annotation,
                                attributes: {
                                    [Edm.Term]: createAttributeNode(Edm.Term, 'UI.Hidden'),
                                    [Edm.Bool]: createAttributeNode(Edm.Bool, 'true')
                                },
                                content: []
                            })
                        }
                    ],
                    `Service S { entity E { name: String; }; };
annotate S.E with {
    name @Common.Label: 'abc' @(
        Common.Label #two : {
            $value: 'abc',
            @Core.Description : '@UI.Chart#qualChart',
            ![@UI.Hidden] : test.@UI.Hidden,
        },
        UI.Hidden : true,
    )
};`
                );
            });
            test('@ in string value of annotation on element', async () => {
                const fixture = `Service S { entity E { name: String; }; };
annotate S.E with {
    name @Common.Label: '@abc'
};`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'insert-annotation',
                            pointer: '/targets/0',
                            element: createElementNode({
                                name: Edm.Annotation,
                                attributes: {
                                    [Edm.Term]: createAttributeNode(Edm.Term, 'UI.Hidden'),
                                    [Edm.Bool]: createAttributeNode(Edm.Bool, 'true')
                                },
                                content: []
                            })
                        }
                    ],
                    `Service S { entity E { name: String; }; };
annotate S.E with {
    name @(
        Common.Label: '@abc',
        UI.Hidden : true,
    )
};`
                );
            });
            test('delete existing annotation and insert annotation on the same element', async () => {
                const fixture = `Service S { entity E { name: String; }; };
annotate S.E with {
    name @Common.Label : 'label';
};`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'insert-annotation',
                            pointer: '/targets/0',
                            element: createElementNode({
                                name: Edm.Annotation,
                                attributes: {
                                    [Edm.Term]: createAttributeNode(Edm.Term, 'UI.Hidden'),
                                    [Edm.Bool]: createAttributeNode(Edm.Bool, 'true')
                                },
                                content: []
                            })
                        },
                        {
                            type: 'delete-annotation',
                            pointer: '/targets/0/assignments/0',
                            target: 'S.E/name'
                        }
                    ],
                    `Service S { entity E { name: String; }; };
annotate S.E with {
    name @UI.Hidden : true;
};`
                );
            });

            test('delete existing annotation and insert multiple annotation on the same element', async () => {
                function createTestNode(qualifier: string) {
                    return createElementNode({
                        name: Edm.Annotation,
                        attributes: {
                            [Edm.Term]: createAttributeNode(Edm.Term, 'UI.Hidden'),
                            [Edm.Qualifier]: createAttributeNode(Edm.Qualifier, qualifier),
                            [Edm.Bool]: createAttributeNode(Edm.Bool, 'true')
                        },
                        content: []
                    });
                }
                const fixture = `Service S { entity E { name: String; }; };
annotate S.E with {
    name @Common.Label : 'label';
};`;
                await testWriter(
                    fixture,
                    [
                        createInsertAnnotationChange('/targets/0', createTestNode('one')),
                        createInsertAnnotationChange('/targets/0', createTestNode('two')),
                        createInsertAnnotationChange('/targets/0', createTestNode('three')),
                        createDeleteAnnotationChange('/targets/0/assignments/0')
                    ],
                    `Service S { entity E { name: String; }; };
annotate S.E with {
    name @(
        UI.Hidden #one : true,
        UI.Hidden #two : true,
        UI.Hidden #three : true,
    );
};`
                );
            });

            test('delete multiple annotations and insert multiple annotations on the same element', async () => {
                const fixture = `Service S { entity E { name: String; }; };
annotate S.E with {
    name @(
        Common.Label : 'label',
        Common.Label #abc: 'label',
        Common.Label #xyz: 'label',
    );
};`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'insert-annotation',
                            pointer: '/targets/0',
                            element: createElementNode({
                                name: Edm.Annotation,
                                attributes: {
                                    [Edm.Term]: createAttributeNode(Edm.Term, 'UI.Hidden'),
                                    [Edm.Bool]: createAttributeNode(Edm.Bool, 'true')
                                },
                                content: []
                            })
                        },
                        {
                            type: 'insert-annotation',
                            pointer: '/targets/0',
                            element: createElementNode({
                                name: Edm.Annotation,
                                attributes: {
                                    [Edm.Term]: createAttributeNode(Edm.Term, 'UI.Hidden'),
                                    [Edm.Qualifier]: createAttributeNode(Edm.Qualifier, 'qfr'),
                                    [Edm.Bool]: createAttributeNode(Edm.Bool, 'true')
                                },
                                content: []
                            })
                        },
                        {
                            type: 'delete-annotation',
                            pointer: '/targets/0/assignments/0',
                            target: 'S.E/name'
                        },
                        {
                            type: 'delete-annotation',
                            pointer: '/targets/0/assignments/1',
                            target: 'S.E/name'
                        }
                    ],
                    `Service S { entity E { name: String; }; };
annotate S.E with {
    name @(
        Common.Label #xyz: 'label',
        UI.Hidden : true,
        UI.Hidden #qfr : true,
    );
};`
                );
            });
        });
        describe('record property', () => {
            function createRecordProperty(
                propName = 'Label',
                propValue: { type: Edm; value: string } = { type: Edm.String, value: 'testLabel' }
            ) {
                return createElementNode({
                    name: Edm.PropertyValue,
                    attributes: {
                        [Edm.Property]: createAttributeNode(Edm.Property, propName),
                        [propValue.type]: createAttributeNode(Edm.String, propValue.value)
                    }
                });
            }
            test('by default at the end', async () => {
                const fixture = `
    Service S { entity E {}; };
    annotate S.E with @UI.LineItem : [
        {
            $Type : 'UI.DataField',
        },
    ];`;
                await testWriter(
                    fixture,
                    [
                        createInsertRecordPropertyChange(
                            '/targets/0/assignments/0/value/items/0',
                            createRecordProperty('Value', { type: Edm.PropertyPath, value: 'test' })
                        )
                    ],
                    `
    Service S { entity E {}; };
    annotate S.E with @UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : test,
        },
    ];`
                );
            });
            test('at a specific index', async () => {
                const fixture = `
    Service S { entity E {}; };
    annotate S.E with @UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : test,
        },
    ];`;
                await testWriter(
                    fixture,
                    [
                        createInsertRecordPropertyChange(
                            '/targets/0/assignments/0/value/items/0',
                            createRecordProperty('Label', { type: Edm.String, value: 'abc' }),
                            1
                        )
                    ],
                    `
    Service S { entity E {}; };
    annotate S.E with @UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'abc',
            Value : test,
        },
    ];`
                );
            });
            test('by default inserting at the end when deleting property', async () => {
                const fixture = `
    Service S { entity E {}; };
    annotate S.E with @UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : test,
            Criticality : #Critical
        },
    ];`;
                await testWriter(
                    fixture,
                    [
                        createInsertRecordPropertyChange(
                            '/targets/0/assignments/0/value/items/0',
                            createRecordProperty()
                        ),
                        {
                            type: 'delete-record-property',
                            pointer: '/targets/0/assignments/0/value/items/0/properties/2'
                        }
                    ],
                    `
    Service S { entity E {}; };
    annotate S.E with @UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : test,
            Label : 'testLabel',
        },
    ];`
                );
            });
            test('by default inserting at the end when deleting property - datapoint', async () => {
                const fixture = `
    Service S { entity E {}; };
    annotate S.E with @UI.DataPoint  : {
        $Type : 'UI.DataPointType',
        Value : ID,
        Criticality: #Critical
    };`;
                await testWriter(
                    fixture,
                    [
                        createInsertRecordPropertyChange(
                            '/targets/0/assignments/0/value',
                            createRecordProperty('CriticalityLabels')
                        ),
                        {
                            type: 'delete-record-property',
                            pointer: '/targets/0/assignments/0/value/properties/2'
                        }
                    ],
                    `
    Service S { entity E {}; };
    annotate S.E with @UI.DataPoint  : {
        $Type : 'UI.DataPointType',
        Value : ID,
        CriticalityLabels : 'testLabel',
    };`
                );
            });
            test('by default inserting at the end when deleting only property - datapoint2', async () => {
                const fixture = `
    Service S { entity E {}; };
    annotate S.E with @UI.DataPoint  : {
        $Type : 'UI.DataPointType'
    };`;
                await testWriter(
                    fixture,
                    [
                        createInsertRecordPropertyChange(
                            '/targets/0/assignments/0/value',
                            createRecordProperty('CriticalityLabels')
                        ),
                        {
                            type: 'delete-record-property',
                            pointer: '/targets/0/assignments/0/value/properties/0'
                        }
                    ],
                    `
    Service S { entity E {}; };
    annotate S.E with @UI.DataPoint  : {
        
        CriticalityLabels : 'testLabel',
    };`
                );
            });
        });
        test('collection', async () => {
            const fixture = `Service S { entity E {}; };
annotate S.E with @UI.LineItem;`;
            await testWriter(
                fixture,
                [
                    {
                        type: 'insert-collection',
                        pointer: '/targets/0/assignments/0',
                        element: createElementNode({
                            name: Edm.Collection
                        })
                    }
                ],
                `Service S { entity E {}; };
annotate S.E with @UI.LineItem : [];`
            );
        });
        test('record in array', async () => {
            const fixture = `
Service S { entity E {}; };
annotate S.E with @UI.LineItem : [];`;
            await testWriter(
                fixture,
                [
                    {
                        type: 'insert-record',
                        pointer: '/targets/0/assignments/0/value',
                        element: createElementNode({
                            name: Edm.Record,
                            attributes: {
                                [Edm.Type]: createAttributeNode(Edm.Term, 'UI.DataField')
                            },
                            content: []
                        })
                    }
                ],
                `
Service S { entity E {}; };
annotate S.E with @UI.LineItem : [
    {
        $Type : 'UI.DataField',
    },
];`
            );
        });
        test('after entry with comment', async () => {
            const fixture = `
Service S { entity E {}; };
annotate S.E with @UI.LineItem : [
    {
        $Type : 'UI.DataField',
    } // some comment
];`;
            await testWriter(
                fixture,
                [
                    {
                        type: 'insert-record',
                        pointer: '/targets/0/assignments/0/value',
                        element: createElementNode({
                            name: Edm.Record,
                            attributes: {
                                [Edm.Type]: createAttributeNode(Edm.Term, 'UI.DataField')
                            },
                            content: []
                        })
                    }
                ],
                `
Service S { entity E {}; };
annotate S.E with @UI.LineItem : [
    {
        $Type : 'UI.DataField',
    }, // some comment
    {
        $Type : 'UI.DataField',
    },
];`
            );
        });
        test('record in array (multi line)', async () => {
            const fixture = `
Service S { entity E {}; };
annotate S.E with @UI.LineItem : [

];`;
            await testWriter(
                fixture,
                [
                    {
                        type: 'insert-record',
                        pointer: '/targets/0/assignments/0/value',
                        element: createElementNode({
                            name: Edm.Record,
                            attributes: {
                                [Edm.Type]: createAttributeNode(Edm.Term, 'UI.DataField')
                            },
                            content: []
                        })
                    }
                ],
                `
Service S { entity E {}; };
annotate S.E with @UI.LineItem : [
    {
        $Type : 'UI.DataField',
    },
];`
            );
        });
        test('record in array with index specified', async () => {
            const fixture = `Service S { entity E {}; };
annotate S.E with @UI.LineItem: [];`;
            await testWriter(
                fixture,
                [
                    {
                        type: 'insert-record',
                        pointer: '/targets/0/assignments/0/value',
                        element: createElementNode({
                            name: Edm.Record,
                            attributes: {
                                [Edm.Type]: createAttributeNode(Edm.Term, 'UI.DataField')
                            },
                            content: []
                        }),
                        index: 0
                    }
                ],
                `Service S { entity E {}; };
annotate S.E with @UI.LineItem: [
    {
        $Type : 'UI.DataField',
    },
];`
            );
        });
        test('merging inserts at the end of collection', async () => {
            const fixture = `Service S { entity E {}; };
annotate S.E with @UI.LineItem: [
    {
        $Type : 'UI.DataField',
    }
];`;
            await testWriter(
                fixture,
                [
                    {
                        type: 'insert-record',
                        pointer: '/targets/0/assignments/0/value',
                        element: createElementNode({
                            name: Edm.Record,
                            attributes: {
                                [Edm.Type]: createAttributeNode(Edm.Term, 'UI.DataField')
                            },
                            content: []
                        }),
                        index: 2
                    },
                    {
                        type: 'insert-record',
                        pointer: '/targets/0/assignments/0/value',
                        element: createElementNode({
                            name: Edm.Record,
                            attributes: {
                                [Edm.Type]: createAttributeNode(Edm.Term, 'UI.DataField')
                            },
                            content: []
                        }),
                        index: 3
                    },
                    {
                        type: 'insert-record',
                        pointer: '/targets/0/assignments/0/value',
                        element: createElementNode({
                            name: Edm.Record,
                            attributes: {
                                [Edm.Type]: createAttributeNode(Edm.Term, 'UI.DataField')
                            },
                            content: []
                        })
                    }
                ],
                `Service S { entity E {}; };
annotate S.E with @UI.LineItem: [
    {
        $Type : 'UI.DataField',
    },
    {
        $Type : 'UI.DataField',
    },
    {
        $Type : 'UI.DataField',
    },
    {
        $Type : 'UI.DataField',
    },
];`
            );
        });
        test('record in the middle', async () => {
            const fixture = `Service S { entity E {}; };
annotate S.E with @UI.FieldGroup : {
    Data: [
        {
            $Type : 'UI.DataField',
        },
        {
            $Type : 'UI.DataField',
        },
    ]
};`;
            await testWriter(
                fixture,
                [
                    {
                        type: 'insert-record',
                        pointer: '/targets/0/assignments/0/value/properties/0/value',
                        element: createElementNode({
                            name: Edm.Record,
                            attributes: {
                                [Edm.Type]: createAttributeNode(Edm.Term, 'UI.DataField')
                            },
                            content: [
                                createElementNode({
                                    name: Edm.PropertyValue,
                                    attributes: {
                                        [Edm.Property]: createAttributeNode(Edm.Property, 'Value'),
                                        [Edm.Path]: createAttributeNode(Edm.Path, 'test')
                                    },
                                    content: []
                                })
                            ]
                        }),
                        index: 1
                    }
                ],
                `Service S { entity E {}; };
annotate S.E with @UI.FieldGroup : {
    Data: [
        {
            $Type : 'UI.DataField',
        },
        {
            $Type : 'UI.DataField',
            Value : test,
        },
        {
            $Type : 'UI.DataField',
        },
    ]
};`
            );
        });
        test('record with larger index than items', async () => {
            const fixture = `Service S { entity E {}; };
annotate S.E with @UI.FieldGroup : {
    Data: [
        {
            $Type : 'UI.DataField',
        },
        {
            $Type : 'UI.DataField',
        },
    ]
};`;
            await testWriter(
                fixture,
                [
                    {
                        type: 'insert-record',
                        pointer: '/targets/0/assignments/0/value/properties/0/value',
                        element: createElementNode({
                            name: Edm.Record,
                            attributes: {
                                [Edm.Type]: createAttributeNode(Edm.Term, 'UI.DataField')
                            },
                            content: [
                                createElementNode({
                                    name: Edm.PropertyValue,
                                    attributes: {
                                        [Edm.Property]: createAttributeNode(Edm.Property, 'Value'),
                                        [Edm.Path]: createAttributeNode(Edm.Path, 'test')
                                    },
                                    content: []
                                })
                            ]
                        }),
                        index: 2
                    }
                ],
                `Service S { entity E {}; };
annotate S.E with @UI.FieldGroup : {
    Data: [
        {
            $Type : 'UI.DataField',
        },
        {
            $Type : 'UI.DataField',
        },
        {
            $Type : 'UI.DataField',
            Value : test,
        },
    ]
};`
            );
        });
        test('record to empty annotation', async () => {
            const fixture = `Service S { entity E {}; };
annotate S.E with @UI.KPI;`;
            await testWriter(
                fixture,
                [
                    {
                        type: 'insert-record',
                        pointer: '/targets/0/assignments/0',
                        element: createElementNode({
                            name: Edm.Record,
                            attributes: {
                                [Edm.Type]: createAttributeNode(Edm.Term, 'UI.KPIType')
                            },
                            content: []
                        }),
                        index: 0
                    }
                ],
                `Service S { entity E {}; };
annotate S.E with @UI.KPI : {
    $Type : 'UI.KPIType',
};`
            );
        });
    });
    describe('delete target', () => {
        test('whole declaration', async () => {
            const fixture = `Service S { entity E {}; };
annotate S.E with @(
    UI.LineItem : [
    ]
);
`;
            await testWriter(
                fixture,
                [
                    {
                        type: 'delete-target',
                        pointer: '/targets/0'
                    }
                ],
                `Service S { entity E {}; };\n`
            );
        });
        test('one of two annotations', async () => {
            const fixture = `Service S { entity E {}; };
annotate S.E with @(
    UI.LineItem : [],
    UI.Facets: []
);
`;
            await testWriter(
                fixture,
                [
                    {
                        type: 'delete-annotation',
                        pointer: '/targets/0/assignments/0',
                        target: 'S.E'
                    }
                ],
                `Service S { entity E {}; };
annotate S.E with @(
    UI.Facets: []
);
`
            );
        });
        test('two of two annotations starting with last one', async () => {
            const fixture = `Service S { entity E {}; };
annotate S.E with @(
    UI.LineItem : [],
    UI.Facets: []
);
`;
            await testWriter(
                fixture,
                [
                    // second one should be deleted first
                    {
                        type: 'delete-annotation',
                        pointer: '/targets/0/assignments/1',
                        target: 'S.E'
                    },
                    {
                        type: 'delete-annotation',
                        pointer: '/targets/0/assignments/0',
                        target: 'S.E'
                    }
                ],
                `Service S { entity E {}; };
`
            );
        });
        test('keep elements annotation', async () => {
            const fixture = `Service S { entity E { e: String(256);}; };
annotate S.E with @(
    UI.LineItem : [
    ]
) { e @UI.Hidden; };
`;
            await testWriter(
                fixture,
                [createDeleteTargetChange('/targets/0')],
                `Service S { entity E { e: String(256);}; };
annotate S.E with { e @UI.Hidden; };
`
            );
        });
        test('assignment over annotate statement', async () => {
            const fixture = `Service S { entity E { e: String(256);}; };
@Capabilities.FilterFunctions : [
    'min',
]
@UI.DataPoint #test : {
    Criticality : #Critical,
    Value : 'test',
}
annotate S.E with @(
    UI.LineItem : [
    ]
);
`;
            await testWriter(
                fixture,
                [
                    {
                        type: 'delete-annotation',
                        pointer: '/targets/0/assignments/0',
                        target: 'S.E'
                    }
                ],
                `Service S { entity E { e: String(256);}; };
@UI.DataPoint #test : {
    Criticality : #Critical,
    Value : 'test',
}
annotate S.E with @(
    UI.LineItem : [
    ]
);
`
            );
        });
        test('last assignment on entity element', async () => {
            const fixture = `Service S { entity E { e: String(256);}; };
annotate S.E with {
    e @UI.Hidden;
};
`;
            await testWriter(
                fixture,
                [
                    {
                        type: 'delete-annotation',
                        pointer: '/targets/0/assignments/0',
                        target: 'S.E'
                    }
                ],
                `Service S { entity E { e: String(256);}; };
`
            );
        });
        test('last assignment on entity element with cds term', async () => {
            const fixture = `Service S { entity E { e: String(256);}; };
annotate S.E with {
    e @title;
};
`;
            await testWriter(
                fixture,
                [
                    {
                        type: 'delete-annotation',
                        pointer: '/targets/0/assignments/0',
                        target: 'S.E'
                    }
                ],
                `Service S { entity E { e: String(256);}; };
`
            );
        });
        test('last encapsulated deleted annotation', async () => {
            const fixture = `Service S { entity E { e: String(256);}; };
@UI.DataPoint #test : {
    Criticality : #Critical,
    Value : 'test',
}
annotate S.E with @(
    UI.LineItem : [
    ]
);
`;
            await testWriter(
                fixture,
                [
                    {
                        type: 'delete-annotation',
                        pointer: '/targets/0/assignments/1',
                        target: 'S.E'
                    }
                ],
                `Service S { entity E { e: String(256);}; };
@UI.DataPoint #test : {
    Criticality : #Critical,
    Value : 'test',
}
annotate S.E with ;
`
            );
        });
    });

    describe('update', () => {
        describe('property value', () => {
            test('replace', async () => {
                const fixture = `Service S { entity E {}; };
annotate S.E with @UI.LineItem: [{
    $Type: 'UI.DataField',
    Label: #enum
}];`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'replace-record-property',
                            pointer: '/targets/0/assignments/0/value/items/0/properties/1',
                            newProperty: createElementNode({
                                name: Edm.PropertyValue,
                                attributes: {
                                    [Edm.Property]: createAttributeNode(Edm.Property, 'Value')
                                },
                                content: [createElementNode({ name: Edm.Path, content: [createTextNode('value')] })]
                            })
                        }
                    ],
                    `Service S { entity E {}; };
annotate S.E with @UI.LineItem: [{
    $Type: 'UI.DataField',
    Value : value
}];`
                );
            });
            test('string literal', async () => {
                const fixture = `Service S { entity E {}; };
annotate S.E with @UI.LineItem: [{
    $Type: 'UI.DataField',
    Label: 'test'
}];`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'update-primitive-value',
                            pointer: '/targets/0/assignments/0/value/items/0/properties/1/value',
                            newValue: 'new'
                        }
                    ],
                    `Service S { entity E {}; };
annotate S.E with @UI.LineItem: [{
    $Type: 'UI.DataField',
    Label: 'new'
}];`
                );
            });
            test('enum', async () => {
                const fixture = `Service S { entity E {}; };
annotate S.E with @UI.LineItem: [{
    $Type: 'UI.DataField',
    Label: #enum
}];`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'update-primitive-value',
                            pointer: '/targets/0/assignments/0/value/items/0/properties/1/value',
                            newValue: 'other'
                        }
                    ],
                    `Service S { entity E {}; };
annotate S.E with @UI.LineItem: [{
    $Type: 'UI.DataField',
    Label: #other
}];`
                );
            });

            test('odata enum', async () => {
                const fixture = `Service S { entity E {}; };
annotate S.E with @UI.Chart : {
    $Type : 'UI.ChartDefinitionType',
    ChartType : #Bar,
};`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'update-primitive-value',
                            pointer: '/targets/0/assignments/0/value/properties/1/value',
                            newValue: 'UI.ChartType/Column'
                        }
                    ],
                    `Service S { entity E {}; };
annotate S.E with @UI.Chart : {
    $Type : 'UI.ChartDefinitionType',
    ChartType : #Column,
};`
                );
            });

            test('odata enum flags', async () => {
                const fixture = `Service S { entity E {}; };
annotate S.E with @Communication.Contact : {
    tel : [
        {
            $Type : 'Communication.PhoneNumberType',
            type : [ #work, #cell ],
        },
    ],
}`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'set-flags',
                            pointer: '/targets/0/assignments/0/value/properties/0/value/items/0/properties/1/value',
                            value: 'Communication.PhoneType/work Communication.PhoneType/cell Communication.PhoneType/preferred'
                        }
                    ],
                    `Service S { entity E {}; };
annotate S.E with @Communication.Contact : {
    tel : [
        {
            $Type : 'Communication.PhoneNumberType',
            type : [ #work, #cell, #preferred ],
        },
    ],
}`
                );
            });
            test('annotationPath', async () => {
                const fixture = `Service S { entity E {}; };
annotate S.E with @UI.LineItem: [{
    $Type: 'UI.DataField',
    AnnotationPath: ![test@UI.Chart]
}];`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'update-primitive-value',
                            pointer: '/targets/0/assignments/0/value/items/0/properties/1/value',
                            newValue: 'test@UI.Chart#first'
                        }
                    ],
                    `Service S { entity E {}; };
annotate S.E with @UI.LineItem: [{
    $Type: 'UI.DataField',
    AnnotationPath: test@UI.Chart#first
}];`
                );
            });
        });
        describe('enums', () => {
            test('flag switch', async () => {
                const fixture = `Service S { entity E { p: String; }; };
annotate IncidentService.Individual with @(
    Communication.Contact : {
        email : [
            { type : #work },
            { type : [#work, #cell] },
        ],
    }
);`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'replace-text-value',
                            pointer: '/targets/0/assignments/0/value/properties/0/value/items/0/properties/0/value',
                            newValue:
                                'com.sap.vocabularies.Communication.v1.PhoneType/work com.sap.vocabularies.Communication.v1.PhoneType/cell'
                        },
                        {
                            type: 'set-flags',
                            pointer: '/targets/0/assignments/0/value/properties/0/value/items/1/properties/0/value',
                            value: 'com.sap.vocabularies.Communication.v1.PhoneType/work'
                        }
                    ],
                    `Service S { entity E { p: String; }; };
annotate IncidentService.Individual with @(
    Communication.Contact : {
        email : [
            { type : [ #work, #cell ] },
            { type : #work },
        ],
    }
);`
                );
            });
            test('single flag value', async () => {
                const fixture = `Service S { entity E { p: String; }; };
annotate IncidentService.Individual with @(
    Communication.Contact : {
        email : [
            { type : [ #work, #cell ] },
        ],
    }
);`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'replace-text-value',
                            pointer:
                                '/targets/0/assignments/0/value/properties/0/value/items/0/properties/0/value/items/1',
                            newValue: 'com.sap.vocabularies.Communication.v1.PhoneType/preferred'
                        }
                    ],
                    `Service S { entity E { p: String; }; };
annotate IncidentService.Individual with @(
    Communication.Contact : {
        email : [
            { type : [ #work, #preferred ] },
        ],
    }
);`
                );
            });
            test('single flag value (wrong change)', async () => {
                const fixture = `Service S { entity E { p: String; }; };
annotate IncidentService.Individual with @(
    Communication.Contact : {
        email : [
            { type : [ #work, #cell ] },
        ],
    }
);`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'set-flags',
                            pointer:
                                '/targets/0/assignments/0/value/properties/0/value/items/0/properties/0/value/items/1',
                            value: 'com.sap.vocabularies.Communication.v1.PhoneType/preferred'
                        }
                    ],
                    `Service S { entity E { p: String; }; };
annotate IncidentService.Individual with @(
    Communication.Contact : {
        email : [
            { type : [ #work, #cell ] },
        ],
    }
);`
                );
            });
        });
    });

    describe('replace element', () => {
        test('collection in one line', async () => {
            const fixture = `Service S { entity E {}; };
annotate S.E with @UI.LineItem: [];`;
            await testWriter(
                fixture,
                [
                    {
                        type: 'replace-node',
                        pointer: '/targets/0/assignments/0/value',
                        newElement: createElementNode({
                            name: Edm.Collection,
                            content: [
                                createElementNode({
                                    name: Edm.Record,
                                    content: [
                                        createElementNode({
                                            name: Edm.PropertyValue,
                                            attributes: {
                                                [Edm.Property]: createAttributeNode(Edm.Property, 'Value')
                                            },
                                            content: [
                                                createElementNode({
                                                    name: Edm.Path,
                                                    content: [createTextNode('some_path')]
                                                })
                                            ]
                                        })
                                    ]
                                })
                            ]
                        })
                    }
                ],
                `Service S { entity E {}; };
annotate S.E with @UI.LineItem: [
    {
        Value : some_path,
    },
];`
            );
        });

        test('collection in multiple lines', async () => {
            const fixture = `Service S { entity E {}; };
annotate S.E with @(
    UI.LineItem: [
    ]
);`;
            await testWriter(
                fixture,
                [
                    {
                        type: 'replace-node',
                        pointer: '/targets/0/assignments/0/value',
                        newElement: createElementNode({
                            name: Edm.Collection,
                            content: [
                                createElementNode({
                                    name: Edm.Record,
                                    content: [
                                        createElementNode({
                                            name: Edm.PropertyValue,
                                            attributes: {
                                                [Edm.Property]: createAttributeNode(Edm.Property, 'Value')
                                            },
                                            content: [
                                                createElementNode({
                                                    name: Edm.Path,
                                                    content: [createTextNode('some_path')]
                                                })
                                            ]
                                        })
                                    ]
                                })
                            ]
                        })
                    }
                ],
                `Service S { entity E {}; };
annotate S.E with @(
    UI.LineItem: [
        {
            Value : some_path,
        },
    ]
);`
            );
        });

        test('clear the collection', async () => {
            const fixture = `Service S { entity E {}; };
annotate S.E with @UI.LineItem: [
    {
        Value : some_path,
    },
];`;
            await testWriter(
                fixture,
                [
                    {
                        type: 'replace-node',
                        pointer: '/targets/0/assignments/0/value',
                        newElement: createElementNode({
                            name: Edm.Collection,
                            content: []
                        })
                    }
                ],
                `Service S { entity E {}; };
annotate S.E with @UI.LineItem: [
];`
            );
        });

        test('replace element in the collection', async () => {
            const fixture = `Service S { entity E {}; };
annotate S.E with @UI.LineItem: [
    {
        Value : some_path,
    },
];`;
            await testWriter(
                fixture,
                [
                    {
                        type: 'replace-node',
                        pointer: '/targets/0/assignments/0/value',
                        newElement: createElementNode({
                            name: Edm.Collection,
                            content: [
                                createElementNode({
                                    name: Edm.Record,
                                    attributes: {
                                        [Edm.Type]: createAttributeNode(Edm.Term, 'UI.DataFieldForAnnotation')
                                    }
                                })
                            ]
                        })
                    }
                ],
                `Service S { entity E {}; };
annotate S.E with @UI.LineItem: [
    {
        $Type : 'UI.DataFieldForAnnotation',
    },
];`
            );
        });
    });

    describe('delete', () => {
        describe('annotation group', () => {
            test('group', async () => {
                const fixture = `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI : {
                        HeaderInfo : {
                            Description: {
                                Value : title,
                            },
                        }
                    }
                );`;
                await testWriter(
                    fixture,
                    [createDeleteAnnotationGroupChange('/targets/0/assignments/0')],
                    `
                Service S { entity E {}; };
                `
                );
            });

            test('group + regular annotation before', async () => {
                const fixture = `
                Service S { entity E {}; };
                annotate S.E with @(
                    Common.Label: 'test',
                    UI : {
                        HeaderInfo : {
                            TypeName: 'a'
                        },
                        LineItem: [],
                    }
                );`;
                await testWriter(
                    fixture,
                    [
                        createDeleteAnnotationChange('/targets/0/assignments/0'),
                        createDeleteAnnotationGroupChange('/targets/0/assignments/1')
                    ],
                    `
                Service S { entity E {}; };
                `
                );
            });
            test('group + regular annotation before (keep one annotation)', async () => {
                const fixture = `
                Service S { entity E {}; };
                annotate S.E with @(
                    Common.Label: 'test',
                    UI : {
                        HeaderInfo : {
                            TypeName: 'a'
                        },
                        LineItem: [],
                    }
                );`;
                await testWriter(
                    fixture,
                    [createDeleteAnnotationGroupChange('/targets/0/assignments/1')],
                    `
                Service S { entity E {}; };
                annotate S.E with @(
                    Common.Label: 'test',
                );`
                );
            });

            test('group + regular annotation after', async () => {
                const fixture = `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI : {
                        HeaderInfo : {
                            TypeName: 'a'
                        },
                        LineItem: [],
                    },
                    Common.Label: 'test',
                );`;
                await testWriter(
                    fixture,
                    [
                        createDeleteAnnotationGroupChange('/targets/0/assignments/0'),
                        createDeleteAnnotationChange('/targets/0/assignments/1')
                    ],
                    `
                Service S { entity E {}; };
                `
                );
            });
            test('group + regular annotation after (keep one annotation)', async () => {
                const fixture = `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI : {
                        HeaderInfo : {
                            TypeName: 'a'
                        },
                        LineItem: [],
                    },
                    Common.Label: 'test',
                );`;
                await testWriter(
                    fixture,
                    [createDeleteAnnotationGroupChange('/targets/0/assignments/0')],
                    `
                Service S { entity E {}; };
                annotate S.E with @(
                    Common.Label: 'test',
                );`
                );
            });
            test('group items', async () => {
                const fixture = `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI : {
                        HeaderInfo : {
                            TypeName: 'a'
                        },
                        LineItem: [],
                    },
                    Common.Label: 'test',
                );`;
                await testWriter(
                    fixture,
                    [createDeleteAnnotationGroupItemsChange('/targets/0/assignments/0/items')],
                    `
                Service S { entity E {}; };
                annotate S.E with @(
                    Common.Label: 'test',
                );`
                );
            });
        });
        describe('collection elements', () => {
            test('record', async () => {
                const fixture = `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.LineItem: [
                        // before comment
                        {
                            Value: value1,
                        },
                        {
                            Value: value2,
                        },
                    ]
                );`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'delete-record',
                            pointer: '/targets/0/assignments/0/value/items/0'
                        }
                    ],
                    `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.LineItem: [
                        {
                            Value: value2,
                        },
                    ]
                );`
                );
            });
            test('block comment before', async () => {
                const fixture = `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.LineItem: [
                        /*
                         * block comment
                         */
                        {
                            Value: value1,
                        },
                        {
                            Value: value2,
                        },
                    ]
                );`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'delete-record',
                            pointer: '/targets/0/assignments/0/value/items/0'
                        }
                    ],
                    `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.LineItem: [
                        {
                            Value: value2,
                        },
                    ]
                );`
                );
            });
            test('block comment between', async () => {
                const fixture = `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.LineItem: [
                        {
                            Value: value1,
                        },
                        /*
                         * block comment
                         */
                        {
                            Value: value2,
                        },
                    ]
                );`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'delete-record',
                            pointer: '/targets/0/assignments/0/value/items/0'
                        }
                    ],
                    `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.LineItem: [
                        /*
                         * block comment
                         */
                        {
                            Value: value2,
                        },
                    ]
                );`
                );
            });
            test('doc comment between', async () => {
                const fixture = `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.LineItem: [
                        {
                            Value: value1,
                        },
                        /**
                         * doc comment
                         */
                        {
                            Value: value2,
                        },
                    ]
                );`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'delete-record',
                            pointer: '/targets/0/assignments/0/value/items/0'
                        }
                    ],
                    `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.LineItem: [
                        /**
                         * doc comment
                         */
                        {
                            Value: value2,
                        },
                    ]
                );`
                );
            });
            test('compact formatting', async () => {
                const fixture = `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.LineItem: [
                        // before comment
                        {
                            Value: value1,
                        }, {
                            Value: value2,
                        },
                    ]
                );`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'delete-record',
                            pointer: '/targets/0/assignments/0/value/items/0'
                        }
                    ],
                    `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.LineItem: [
                        {
                            Value: value2,
                        },
                    ]
                );`
                );
            });
            test('last collection element', async () => {
                const fixture = `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.LineItem: [
                        // before comment
                        {
                            Value: value1,
                        }, // after comment
                        {
                            Value: value2,
                        }, // comment to remove
                    ]
                );`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'delete-record',
                            pointer: '/targets/0/assignments/0/value/items/1'
                        }
                    ],
                    `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.LineItem: [
                        // before comment
                        {
                            Value: value1,
                        }, // after comment
                    ]
                );`
                );
            });
        });
        describe('value', () => {
            test('record', async () => {
                const fixture = `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.FieldGroup: {
                        Data : []
                    },
                );`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'delete-record',
                            pointer: '/targets/0/assignments/0/value'
                        }
                    ],
                    `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.FieldGroup,
                );`
                );
            });
            test('last record property', async () => {
                const fixture = `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.FieldGroup: {
                        Data : [], // data comment
                        // label comment
                        Label : 'Test', // inline comment
                    },
                );`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'delete-record-property',
                            pointer: '/targets/0/assignments/0/value/properties/1'
                        }
                    ],
                    `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.FieldGroup: {
                        Data : [], // data comment
                    },
                );`
                );
            });
            test('last record property with annotation', async () => {
                const fixture = `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.HeaderInfo : {
                        ![@Core.Description]: 'abc',
                        Description: {
                            Value : title,
                        },
                    }
                );`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'delete-record-property',
                            pointer: '/targets/0/assignments/0/value/properties/0/value/properties/0'
                        }
                    ],
                    `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.HeaderInfo : {
                        ![@Core.Description]: 'abc',
                    }
                );`
                );
            });
            test('last record property cascade', async () => {
                const fixture = `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.HeaderInfo : {
                        Description: {
                            Value : title,
                        },
                    } 
                    UI.HeaderInfo : {
                        Title.Value: title
                    }
                );`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'delete-record-property',
                            pointer: '/targets/0/assignments/0/value/properties/0/value/properties/0'
                        }
                    ],
                    `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.HeaderInfo : {
                        Title.Value: title
                    }
                );`
                );
            });
            test('flattened record property', async () => {
                const fixture = `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.HeaderInfo.Description : {
                        Value : title,
                    },
                    UI.HeaderInfo : {
                        Title.Value: title
                    }
                );`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'delete-record-property',
                            pointer: '/targets/0/assignments/0/value/properties/0'
                        }
                    ],
                    `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.HeaderInfo : {
                        Title.Value: title
                    }
                );`
                );
            });
        });
        describe('qualifier', () => {
            test('flattened record property', async () => {
                const fixture = `
                Service S { entity E {}; };
                annotate S.E with @UI.LineItem #xyz: [];`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'delete-qualifier',
                            pointer: '/targets/0/assignments/0/qualifier'
                        }
                    ],
                    `
                Service S { entity E {}; };
                annotate S.E with @UI.LineItem : [];`
                );
            });
        });
    });
    describe('embedded annotations', () => {
        describe('insert', () => {
            test('first embedded annotation', async () => {
                const fixture = `
                    Service S { entity E {}; };
                    annotate S.E with @(
                        Common.Text : 'abc'
                    );
                    `;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'insert-embedded-annotation',
                            pointer: '/targets/0/assignments/0',
                            element: createElementNode({
                                name: Edm.Annotation,
                                attributes: {
                                    [Edm.Term]: createAttributeNode(Edm.Term, 'UI.TextArrangement'),
                                    [Edm.EnumMember]: createAttributeNode(Edm.EnumMember, 'TextFirst')
                                }
                            })
                        }
                    ],
                    `
                    Service S { entity E {}; };
                    annotate S.E with @(
                        Common.Text : {
                            $value : 'abc',
                            ![@UI.TextArrangement] : #TextFirst
                        }
                    );
                    `
                );
            });

            test('embedded annotation with multi line collection', async () => {
                const fixture = `
                    Service S { entity E {}; };
                    annotate S.E with @(
                        UI.LineItem : [
                            {
                                Value: a
                            },
                            {
                                Value: b
                            },
                        ]
                    );
                    `;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'insert-embedded-annotation',
                            pointer: '/targets/0/assignments/0',
                            element: createElementNode({
                                name: Edm.Annotation,
                                attributes: {
                                    [Edm.Term]: createAttributeNode(Edm.Term, 'UI.TextArrangement'),
                                    [Edm.EnumMember]: createAttributeNode(Edm.EnumMember, 'TextFirst')
                                }
                            })
                        }
                    ],
                    `
                    Service S { entity E {}; };
                    annotate S.E with @(
                        UI.LineItem : {
                            $value : [
                                {
                                    Value: a
                                },
                                {
                                    Value: b
                                },
                            ],
                            ![@UI.TextArrangement] : #TextFirst
                        }
                    );
                    `
                );
            });

            test('embedded annotation with replacing whole value', async () => {
                const fixture = `
                    Service S { entity E {}; };
                    annotate S.E with @(
                        UI.LineItem : [
                            {
                                Value: a
                            },
                            {
                                Value: b
                            },
                        ]
                    );`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'insert-embedded-annotation',
                            pointer: '/targets/0/assignments/0',
                            element: createElementNode({
                                name: Edm.Annotation,
                                attributes: {
                                    [Edm.Term]: createAttributeNode(Edm.Term, 'UI.Criticality'),
                                    [Edm.Bool]: createAttributeNode(Edm.Bool, 'true')
                                }
                            })
                        },
                        {
                            // this change needs to be after to correctly test this scenario
                            type: 'replace-node',
                            pointer: '/targets/0/assignments/0/value',
                            newElement: createElementNode({
                                name: Edm.Collection,
                                content: [
                                    createElementNode({
                                        name: Edm.Record,
                                        attributes: {
                                            [Edm.Type]: createAttributeNode(Edm.Term, 'UI.DataFieldForAnnotation')
                                        }
                                    })
                                ]
                            })
                        }
                    ],
                    `
                    Service S { entity E {}; };
                    annotate S.E with @(
                        UI.LineItem : {
                            $value : [
                                {
                                    $Type : 'UI.DataFieldForAnnotation',
                                },
                            ],
                            ![@UI.Criticality] : true
                        }
                    );`
                );
            });

            test('embedded annotation where $value exists', async () => {
                const fixture = `
                    Service S { entity E {}; };
                    annotate S.E with @(
                        Common.Text : {
                            $value : 'abc'
                        }
                    );
                    `;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'insert-embedded-annotation',
                            pointer: '/targets/0/assignments/0',
                            element: createElementNode({
                                name: Edm.Annotation,
                                attributes: {
                                    [Edm.Term]: createAttributeNode(Edm.Term, 'UI.TextArrangement'),
                                    [Edm.EnumMember]: createAttributeNode(Edm.EnumMember, 'TextFirst')
                                }
                            })
                        }
                    ],
                    `
                    Service S { entity E {}; };
                    annotate S.E with @(
                        Common.Text : {
                            $value : 'abc',
                            ![@UI.TextArrangement] : #TextFirst,
                        }
                    );
                    `
                );
            });

            test('embedded annotation where $value exists and annotations', async () => {
                const fixture = `
                    Service S { entity E {}; };
                    annotate S.E with @(
                        UI.LineItem : {
                            $value : [],
                            ![@UI.Importance] : #Low,
                        }
                    );`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'insert-embedded-annotation',
                            pointer: '/targets/0/assignments/0',
                            element: createElementNode({
                                name: Edm.Annotation,
                                attributes: {
                                    [Edm.Term]: createAttributeNode(Edm.Term, 'UI.Criticality'),
                                    [Edm.Path]: createAttributeNode(Edm.Path, 'criticality')
                                }
                            })
                        }
                    ],
                    `
                    Service S { entity E {}; };
                    annotate S.E with @(
                        UI.LineItem : {
                            $value : [],
                            ![@UI.Importance] : #Low,
                            ![@UI.Criticality] : criticality,
                        }
                    );`
                );
            });

            test('embedded annotation with annotations in mixed order', async () => {
                const fixture = `
                    Service S { entity E {}; };
                    annotate S.E with @(
                        UI.DataPoint : {
                            Criticality : #Critical,
                            ![@UI.Hidden] : true,
                            Value : 'test',
                        }
                    );`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'insert-embedded-annotation',
                            pointer: '/targets/0/assignments/0/value',
                            element: createElementNode({
                                name: Edm.Annotation,
                                attributes: {
                                    [Edm.Term]: createAttributeNode(Edm.Term, 'UI.Criticality'),
                                    [Edm.Path]: createAttributeNode(Edm.Path, 'criticality')
                                }
                            })
                        }
                    ],
                    `
                    Service S { entity E {}; };
                    annotate S.E with @(
                        UI.DataPoint : {
                            Criticality : #Critical,
                            ![@UI.Hidden] : true,
                            Value : 'test',
                            ![@UI.Criticality] : criticality,
                        }
                    );`
                );
            });

            test('embedded annotation in specific position', async () => {
                const fixture = `
                    Service S { entity E {}; };
                    annotate S.E with @(
                        Common.Text : {
                            $value : 'abc',
                            ![@UI.Hidden],
                        }
                    );`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'insert-embedded-annotation',
                            pointer: '/targets/0/assignments/0',
                            element: createElementNode({
                                name: Edm.Annotation,
                                attributes: {
                                    [Edm.Term]: createAttributeNode(Edm.Term, 'UI.TextArrangement'),
                                    [Edm.EnumMember]: createAttributeNode(Edm.EnumMember, 'TextFirst')
                                }
                            }),
                            index: 1
                        }
                    ],
                    `
                    Service S { entity E {}; };
                    annotate S.E with @(
                        Common.Text : {
                            $value : 'abc',
                            ![@UI.TextArrangement] : #TextFirst,
                            ![@UI.Hidden],
                        }
                    );`
                );
            });

            test('and update value', async () => {
                const fixture = `
                    Service S { entity E { name: String; }; };
                    annotate S.E with {
                        name @Common.Text : initial
                    };`;
                await testWriter(
                    fixture,
                    [
                        {
                            // this change needs to be before to correctly test this scenario
                            type: 'replace-text-value',
                            pointer: '/targets/0/assignments/0/value',
                            newValue: 'updated'
                        },
                        {
                            type: 'insert-embedded-annotation',
                            pointer: '/targets/0/assignments/0',
                            element: {
                                type: 'element',
                                name: 'Annotation',
                                attributes: {
                                    Term: {
                                        type: 'attribute',
                                        name: 'Term',
                                        value: 'UI.TextArrangement'
                                    },
                                    EnumMember: {
                                        type: 'attribute',
                                        name: 'EnumMember',
                                        value: 'UI.TextArrangementType/TextFirst'
                                    }
                                },
                                content: []
                            }
                        }
                    ],
                    `
                    Service S { entity E { name: String; }; };
                    annotate S.E with {
                        name @Common.Text : {
                            $value : updated,
                            ![@UI.TextArrangement] : #TextFirst
                        }
                    };`
                );
            });
            test('embedded annotation in record', async () => {
                const fixture = `
                    Service S { entity E {}; };
                    annotate S.E with @(
                        Common.Text : {
                            $value : 'abc',
                            ![@UI.Hidden],
                        }
                    );`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'insert-embedded-annotation',
                            pointer: '/targets/0/assignments/0',
                            element: createElementNode({
                                name: Edm.Annotation,
                                attributes: {
                                    [Edm.Term]: createAttributeNode(Edm.Term, 'UI.TextArrangement'),
                                    [Edm.EnumMember]: createAttributeNode(Edm.EnumMember, 'TextFirst')
                                }
                            }),
                            index: 1
                        }
                    ],
                    `
                    Service S { entity E {}; };
                    annotate S.E with @(
                        Common.Text : {
                            $value : 'abc',
                            ![@UI.TextArrangement] : #TextFirst,
                            ![@UI.Hidden],
                        }
                    );`
                );
            });

            test('annotation and update existing value', async () => {
                const fixture = `Service S { entity E {}; };
annotate S.E with @UI.LineItem: [];`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'replace-node',
                            pointer: '/targets/0/assignments/0/value',
                            newElement: createElementNode({
                                name: Edm.Collection,
                                content: [
                                    createElementNode({
                                        name: Edm.Record,
                                        content: [
                                            createElementNode({
                                                name: Edm.PropertyValue,
                                                attributes: {
                                                    [Edm.Property]: createAttributeNode(Edm.Property, 'Value')
                                                },
                                                content: [
                                                    createElementNode({
                                                        name: Edm.Path,
                                                        content: [createTextNode('some_path')]
                                                    })
                                                ]
                                            })
                                        ]
                                    })
                                ]
                            })
                        },
                        {
                            type: 'insert-annotation',
                            pointer: '/targets/0',
                            element: createElementNode({
                                name: Edm.Annotation,
                                attributes: {
                                    [Edm.Term]: createAttributeNode(Edm.Term, 'UI.Hidden'),
                                    [Edm.Bool]: createAttributeNode(Edm.Bool, 'true')
                                },
                                content: []
                            })
                        }
                    ],
                    `Service S { entity E {}; };
annotate S.E with @(
    UI.LineItem: [
        {
            Value : some_path,
        },
    ],
    UI.Hidden : true,
);`
                );
            });
            test('annotation, update existing value and insert embedded annotation ', async () => {
                const fixture = `Service S { entity E {}; };
annotate S.E with @UI.LineItem: [];`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'replace-node',
                            pointer: '/targets/0/assignments/0/value',
                            newElement: createElementNode({
                                name: Edm.Collection,
                                content: [
                                    createElementNode({
                                        name: Edm.Record,
                                        content: [
                                            createElementNode({
                                                name: Edm.PropertyValue,
                                                attributes: {
                                                    [Edm.Property]: createAttributeNode(Edm.Property, 'Value')
                                                },
                                                content: [
                                                    createElementNode({
                                                        name: Edm.Path,
                                                        content: [createTextNode('some_path')]
                                                    })
                                                ]
                                            })
                                        ]
                                    })
                                ]
                            })
                        },
                        {
                            type: 'insert-embedded-annotation',
                            pointer: '/targets/0/assignments/0',
                            element: createElementNode({
                                name: Edm.Annotation,
                                attributes: {
                                    [Edm.Term]: createAttributeNode(Edm.Term, 'UI.Hidden'),
                                    [Edm.Bool]: createAttributeNode(Edm.Bool, 'true')
                                },
                                content: []
                            })
                        },
                        {
                            type: 'insert-annotation',
                            pointer: '/targets/0',
                            element: createElementNode({
                                name: Edm.Annotation,
                                attributes: {
                                    [Edm.Term]: createAttributeNode(Edm.Term, 'UI.Hidden'),
                                    [Edm.Bool]: createAttributeNode(Edm.Bool, 'true')
                                },
                                content: []
                            })
                        }
                    ],
                    `Service S { entity E {}; };
annotate S.E with @(
    UI.LineItem: {
        $value : [
            {
                Value : some_path,
            },
        ],
        ![@UI.Hidden] : true
    },
    UI.Hidden : true,
);`
                );
            });
            test('annotation and embedded annotation', async () => {
                const fixture = `Service S { entity E {}; };
annotate S.E with @UI.LineItem: [];`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'insert-embedded-annotation',
                            pointer: '/targets/0/assignments/0',
                            element: createElementNode({
                                name: Edm.Annotation,
                                attributes: {
                                    [Edm.Term]: createAttributeNode(Edm.Term, 'UI.Hidden'),
                                    [Edm.Bool]: createAttributeNode(Edm.Bool, 'true')
                                },
                                content: []
                            })
                        },
                        {
                            type: 'insert-annotation',
                            pointer: '/targets/0',
                            element: createElementNode({
                                name: Edm.Annotation,
                                attributes: {
                                    [Edm.Term]: createAttributeNode(Edm.Term, 'UI.Hidden'),
                                    [Edm.Bool]: createAttributeNode(Edm.Bool, 'true')
                                },
                                content: []
                            })
                        }
                    ],
                    `Service S { entity E {}; };
annotate S.E with @(
    UI.LineItem: {
        $value : [],
        ![@UI.Hidden] : true
    },
    UI.Hidden : true,
);`
                );
            });
        });

        describe('delete', () => {
            describe('embedded annotation', () => {
                test('delete single embedded annotation', async () => {
                    const fixture = `
                        Service S { entity E {}; };
                        annotate S.E with @(
                            Common.Text : {
                                $value : 'abc',
                                ![@UI.Hidden],
                            }
                        );
                        `;
                    await testWriter(
                        fixture,
                        [
                            {
                                type: 'delete-embedded-annotation',
                                pointer: '/targets/0/assignments/0/value/annotations/0'
                            }
                        ],
                        `
                        Service S { entity E {}; };
                        annotate S.E with @(
                            Common.Text : 'abc'
                        );
                        `
                    );
                });

                test('delete annotation from cds annotation group', async () => {
                    const fixture = `
                        Service S { entity E {}; };
                        annotate S.E with {
                            name @Common : {
                                Text : 'abc',
                                TextArrangement : #TextFirst,
                            }
                        );
                        `;
                    await testWriter(
                        fixture,
                        [
                            {
                                type: 'delete-annotation',
                                pointer: '/targets/0/assignments/0/items/items/1',
                                target: 'S.E'
                            }
                        ],
                        `
                        Service S { entity E {}; };
                        annotate S.E with {
                            name @Common : {
                                Text : 'abc',
                                }
                        );
                        `
                    );
                });

                test('delete one of multiple embedded annotations (case 1)', async () => {
                    const fixture = `
                        Service S { entity E {}; };
                        annotate S.E with @(
                            Common.Text : {
                                $value : 'abc',
                                ![@UI.Hidden],
                                ![@UI.TextArrangement]: #TextFirst
                            }
                        );
                        `;
                    await testWriter(
                        fixture,
                        [
                            {
                                type: 'delete-embedded-annotation',
                                pointer: '/targets/0/assignments/0/value/annotations/0'
                            }
                        ],
                        `
                        Service S { entity E {}; };
                        annotate S.E with @(
                            Common.Text : {
                                $value : 'abc',
                                ![@UI.TextArrangement]: #TextFirst
                            }
                        );
                        `
                    );
                });

                test('delete one of multiple embedded annotations (case 2)', async () => {
                    const fixture = `
                        Service S { entity E {}; };
                        annotate S.E with @(
                            Common.Text : {
                                ![@UI.Hidden],
                                $value : 'abc',
                                ![@UI.TextArrangement]: #TextFirst
                            }
                        );
                        `;
                    await testWriter(
                        fixture,
                        [
                            {
                                type: 'delete-embedded-annotation',
                                pointer: '/targets/0/assignments/0/value/annotations/0'
                            }
                        ],
                        `
                        Service S { entity E {}; };
                        annotate S.E with @(
                            Common.Text : {
                                $value : 'abc',
                                ![@UI.TextArrangement]: #TextFirst
                            }
                        );
                        `
                    );
                });

                test('delete one of multiple embedded annotations (case 3)', async () => {
                    const fixture = `
                        Service S { entity E {}; };
                        annotate S.E with @(
                            Common.Text : {
                                ![@UI.Hidden],
                                $value : 'abc',
                                ![@UI.TextArrangement]: #TextFirst
                            }
                        );
                        `;
                    await testWriter(
                        fixture,
                        [
                            {
                                type: 'delete-embedded-annotation',
                                pointer: '/targets/0/assignments/0/value/annotations/1'
                            }
                        ],
                        `
                        Service S { entity E {}; };
                        annotate S.E with @(
                            Common.Text : {
                                ![@UI.Hidden],
                                $value : 'abc',
                            }
                        );
                        `
                    );
                });

                test('delete one of multiple embedded annotations (case 4)', async () => {
                    const fixture = `
                        Service S { entity E {}; };
                        annotate S.E with @(
                            UI.LineItem: [
                                {
                                    $Type: 'UI.DataField',
                                    Value: title,
                                    ![@UI.Hidden],
                                    ![@UI.Importance]: #High
                                }
                            ]
                        );
                        `;
                    await testWriter(
                        fixture,
                        [
                            {
                                type: 'delete-embedded-annotation',
                                pointer: '/targets/0/assignments/0/value/items/0/annotations/1'
                            }
                        ],
                        `
                        Service S { entity E {}; };
                        annotate S.E with @(
                            UI.LineItem: [
                                {
                                    $Type: 'UI.DataField',
                                    Value: title,
                                    ![@UI.Hidden],
                                }
                            ]
                        );
                        `
                    );
                });
            });
            describe('primitive values', () => {
                test('combination', async () => {
                    const fixture = `Service S { entity E {}; };
annotate S.E with @(
    UI.LineItem : [
        #Bar,
        'text',
        path,
        null,
        false,
        5,
    ]
);`;
                    await testWriter(
                        fixture,
                        [
                            {
                                type: 'delete-primitive-value',
                                pointer: '/targets/0/assignments/0/value/items/0'
                            },
                            {
                                type: 'delete-primitive-value',
                                pointer: '/targets/0/assignments/0/value/items/1'
                            },
                            {
                                type: 'delete-primitive-value',
                                pointer: '/targets/0/assignments/0/value/items/2'
                            },
                            {
                                type: 'delete-primitive-value',
                                pointer: '/targets/0/assignments/0/value/items/3'
                            },
                            {
                                type: 'delete-primitive-value',
                                pointer: '/targets/0/assignments/0/value/items/4'
                            },
                            {
                                type: 'delete-primitive-value',
                                pointer: '/targets/0/assignments/0/value/items/5'
                            }
                        ],
                        `Service S { entity E {}; };
annotate S.E with @(
    UI.LineItem : [
        
    ]
);`
                    );
                });
            });
            test('delete record as $value', async () => {
                const fixture = `Service S { entity E {}; };
annotate S.E with @Aggregation: { ApplySupported: {$value : {AggregatableProperties: [{Property}, ], }}, };
`;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'delete-record',
                            pointer: '/targets/0/assignments/0/items/items/0/value'
                        }
                    ],
                    `Service S { entity E {}; };
annotate S.E with @Aggregation: { ApplySupported, };
`
                );
            });
        });

        describe('update', () => {
            test('update embedded annotation in annotation', async () => {
                const fixture = `
                    Service S { entity E {}; };
                    annotate S.E with @(
                        Common.Text : {
                            $value : 'abc',
                            ![@UI.TextArrangement]: #TextFirst,
                        }
                    );
                    `;
                await testWriter(
                    fixture,
                    [
                        {
                            type: 'update-primitive-value',
                            newValue: 'TextLast',
                            pointer: '/targets/0/assignments/0/value/annotations/0/value'
                        }
                    ],
                    `
                    Service S { entity E {}; };
                    annotate S.E with @(
                        Common.Text : {
                            $value : 'abc',
                            ![@UI.TextArrangement]: #TextLast,
                        }
                    );
                    `
                );
            });
        });

        test('update embedded annotation in record (set value)', async () => {
            const fixture = `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.LineItem: [
                        {
                            $Type: 'UI.DataField',
                            Value: title,
                            ![@UI.Hidden]
                        }
                    ]
                );
                `;
            await testWriter(
                fixture,
                [
                    {
                        type: 'insert-primitive-value',
                        element: {
                            type: 'element',
                            name: 'Bool',
                            attributes: {},
                            content: [{ type: 'text', text: 'false' }]
                        },
                        pointer: '/targets/0/assignments/0/value/items/0/annotations/0'
                    }
                ],
                `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.LineItem: [
                        {
                            $Type: 'UI.DataField',
                            Value: title,
                            ![@UI.Hidden] : false
                        }
                    ]
                );
                `
            );
        });

        test('update embedded annotation in record (update value)', async () => {
            const fixture = `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.LineItem: [
                        {
                            $Type: 'UI.DataField',
                            Value: title,
                            ![@UI.Hidden]: true
                        }
                    ]
                );
                `;
            await testWriter(
                fixture,
                [
                    {
                        type: 'update-primitive-value',
                        newValue: 'false',
                        pointer: '/targets/0/assignments/0/value/items/0/annotations/0/value'
                    }
                ],
                `
                Service S { entity E {}; };
                annotate S.E with @(
                    UI.LineItem: [
                        {
                            $Type: 'UI.DataField',
                            Value: title,
                            ![@UI.Hidden]: false
                        }
                    ]
                );
                `
            );
        });
    });
    describe('move collection value', () => {
        test('same collection', async () => {
            const fixture = `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value1,
                    },
                    {
                        Value: value2,
                    },
                ]
            );`;
            await testWriter(
                fixture,
                [
                    {
                        type: MOVE_COLLECTION_VALUE_CHANGE_TYPE,
                        pointer: '/targets/0/assignments/0/value',
                        index: 0,
                        fromPointers: ['/targets/0/assignments/0/value/items/1']
                    }
                ],
                `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value2,
                    },
                    {
                        Value: value1,
                    },
                ]
            );`
            );
        });
        test('same collection to the end', async () => {
            const fixture = `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value1,
                    },
                    {
                        Value: value2,
                    },
                ]
            );`;
            await testWriter(
                fixture,
                [
                    {
                        type: MOVE_COLLECTION_VALUE_CHANGE_TYPE,
                        pointer: '/targets/0/assignments/0/value',
                        index: 2,
                        fromPointers: ['/targets/0/assignments/0/value/items/0']
                    }
                ],
                `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value2,
                    },
                    {
                        Value: value1,
                    },
                ]
            );`
            );
        });
        test('same collection to position after trailing comment with no comma', async () => {
            const fixture = `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value1,
                    },
                    // comment before
                    {
                        // comment inside
                        Value: value2,
                    } // after
                ]
            );`;
            await testWriter(
                fixture,
                [
                    {
                        type: MOVE_COLLECTION_VALUE_CHANGE_TYPE,
                        pointer: '/targets/0/assignments/0/value',
                        fromPointers: ['/targets/0/assignments/0/value/items/0']
                    }
                ],
                `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    // comment before
                    {
                        // comment inside
                        Value: value2,
                    }, // after
                    {
                        Value: value1,
                    },
                ]
            );`
            );
        });
        test('same collection with comments', async () => {
            const fixture = `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value1,
                    },
                    // comment before
                    {
                        // comment inside
                        Value: value2,
                    } // after
                ]
            );`;
            await testWriter(
                fixture,
                [
                    {
                        type: MOVE_COLLECTION_VALUE_CHANGE_TYPE,
                        pointer: '/targets/0/assignments/0/value',
                        index: 0,
                        fromPointers: ['/targets/0/assignments/0/value/items/1']
                    }
                ],
                `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    // comment before
                    {
                        // comment inside
                        Value: value2,
                    }, // after
                    {
                        Value: value1,
                    },
                ]
            );`
            );
        });
        test('same collection with comments (trailing comma)', async () => {
            const fixture = `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value1,
                    },
                    // comment before
                    {
                        // comment inside
                        Value: value2,
                    }, // after
                ]
            );`;
            await testWriter(
                fixture,
                [
                    {
                        type: MOVE_COLLECTION_VALUE_CHANGE_TYPE,
                        pointer: '/targets/0/assignments/0/value',
                        index: 0,
                        fromPointers: ['/targets/0/assignments/0/value/items/1']
                    }
                ],
                `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    // comment before
                    {
                        // comment inside
                        Value: value2,
                    }, // after
                    {
                        Value: value1,
                    },
                ]
            );`
            );
        });
        test('move to middle of collection', async () => {
            const fixture = `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value1,
                    },
                    // comment before
                    {
                        // comment inside
                        Value: value2,
                    }, // after
                    {
                        Value: value3,
                    },
                    {
                        Value: value4,
                    },
                ]
            );`;
            await testWriter(
                fixture,
                [
                    {
                        type: MOVE_COLLECTION_VALUE_CHANGE_TYPE,
                        pointer: '/targets/0/assignments/0/value',
                        index: 3,
                        fromPointers: ['/targets/0/assignments/0/value/items/1']
                    }
                ],
                `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value1,
                    },
                    {
                        Value: value3,
                    },
                    // comment before
                    {
                        // comment inside
                        Value: value2,
                    }, // after
                    {
                        Value: value4,
                    },
                ]
            );`
            );
        });
        test('move to middle of collection multiple comments', async () => {
            const fixture = `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value1,
                    },
                    // comment before 1
                    // comment before 2
                    // comment before 3
                    {
                        // comment inside
                        Value: value2,
                    },
                    // after
                    {
                        Value: value3,
                    },
                    {
                        Value: value4,
                    },
                ]
            );`;
            await testWriter(
                fixture,
                [
                    {
                        type: MOVE_COLLECTION_VALUE_CHANGE_TYPE,
                        pointer: '/targets/0/assignments/0/value',
                        index: 3,
                        fromPointers: ['/targets/0/assignments/0/value/items/1']
                    }
                ],
                `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value1,
                    },
                    // after
                    {
                        Value: value3,
                    },
                    // comment before 1
                    // comment before 2
                    // comment before 3
                    {
                        // comment inside
                        Value: value2,
                    },
                    {
                        Value: value4,
                    },
                ]
            );`
            );
        });
        test('move to middle of collection with block comment', async () => {
            const fixture = `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value1,
                    },
                    /*
                     comment before
                    */
                    {
                        // comment inside
                        Value: value2,
                    }, // after
                    {
                        Value: value3,
                    },
                    {
                        Value: value4,
                    },
                ]
            );`;
            await testWriter(
                fixture,
                [
                    {
                        type: MOVE_COLLECTION_VALUE_CHANGE_TYPE,
                        pointer: '/targets/0/assignments/0/value',
                        index: 3,
                        fromPointers: ['/targets/0/assignments/0/value/items/1']
                    }
                ],
                `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value1,
                    },
                    {
                        Value: value3,
                    },
                    /*
                     comment before
                    */
                    {
                        // comment inside
                        Value: value2,
                    }, // after
                    {
                        Value: value4,
                    },
                ]
            );`
            );
        });
        test('move multiple element at the start of collection with no comma at the end of last element', async () => {
            const fixture = `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        $Type: 'UI.DataField',
                        Value: title // some comments 1
                    },
                    {
                        $Type: 'UI.DataField',
                        Value: title  // some comments 2
                    },
                    {
                        $Type: 'UI.DataField',
                        Value: title // some comments 3
                    }
                ]
            );`;
            await testWriter(
                fixture,
                [
                    {
                        type: MOVE_COLLECTION_VALUE_CHANGE_TYPE,
                        pointer: '/targets/0/assignments/0/value',
                        index: 0,
                        fromPointers: [
                            '/targets/0/assignments/0/value/items/1',
                            '/targets/0/assignments/0/value/items/2'
                        ]
                    }
                ],
                `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        $Type: 'UI.DataField',
                        Value: title  // some comments 2
                    },
                    {
                        $Type: 'UI.DataField',
                        Value: title // some comments 3
                    },
                    {
                        $Type: 'UI.DataField',
                        Value: title // some comments 1
                    },
                ]
            );`
            );
        });
        test('different collection with trailing comma', async () => {
            const fixture = `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value1,
                    },
                    {
                        Value: value2,
                    },
                ],
                UI.LineItem #two: []
            );`;
            await testWriter(
                fixture,
                [
                    {
                        type: MOVE_COLLECTION_VALUE_CHANGE_TYPE,
                        pointer: '/targets/0/assignments/1/value',
                        index: 0,
                        fromPointers: ['/targets/0/assignments/0/value/items/1']
                    }
                ],
                `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value1,
                    },
                ],
                UI.LineItem #two: [
                    {
                        Value: value2,
                    },
                ]
            );`
            );
        });
        test('different empty collection', async () => {
            const fixture = `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value1,
                    },
                    {
                        Value: value2,
                    }
                ],
                UI.LineItem #two: []
            );`;
            await testWriter(
                fixture,
                [
                    {
                        type: MOVE_COLLECTION_VALUE_CHANGE_TYPE,
                        pointer: '/targets/0/assignments/1/value',
                        index: 0,
                        fromPointers: ['/targets/0/assignments/0/value/items/1']
                    }
                ],
                `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value1,
                    },
                ],
                UI.LineItem #two: [
                    {
                        Value: value2,
                    },
                ]
            );`
            );
        });
        test('different collection', async () => {
            const fixture = `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value1,
                    },
                    {
                        Value: value2,
                    }
                ],
                UI.LineItem #two: [
                    {
                        Value: value3,
                    }
                ]
            );`;
            await testWriter(
                fixture,
                [
                    {
                        type: MOVE_COLLECTION_VALUE_CHANGE_TYPE,
                        pointer: '/targets/0/assignments/1/value',
                        fromPointers: ['/targets/0/assignments/0/value/items/1']
                    }
                ],
                `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value1,
                    },
                ],
                UI.LineItem #two: [
                    {
                        Value: value3,
                    },
                    {
                        Value: value2,
                    },
                ]
            );`
            );
        });
        test('different collection at last position', async () => {
            const fixture = `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value1,
                    },
                    {
                        Value: value2,
                    }
                ],
                UI.LineItem #two: [
                    {
                        Value: value3,
                    }
                ]
            );`;
            await testWriter(
                fixture,
                [
                    {
                        type: MOVE_COLLECTION_VALUE_CHANGE_TYPE,
                        pointer: '/targets/0/assignments/1/value',
                        index: 1,
                        fromPointers: ['/targets/0/assignments/0/value/items/1']
                    }
                ],
                `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value1,
                    },
                ],
                UI.LineItem #two: [
                    {
                        Value: value3,
                    },
                    {
                        Value: value2,
                    },
                ]
            );`
            );
        });
        test('different collection with higher indentation level', async () => {
            const fixture = `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value1,
                    },
                    {
                        Value: value2,
                    }
                ],
                UI.FieldGroup: {
                    Data : [
                        {
                            Value: value3,
                        },
                        {
                            Value: value4,
                        },
                    ]
                },
            );`;
            await testWriter(
                fixture,
                [
                    {
                        type: MOVE_COLLECTION_VALUE_CHANGE_TYPE,
                        pointer: '/targets/0/assignments/1/value/properties/0/value',
                        index: 1,
                        fromPointers: ['/targets/0/assignments/0/value/items/1']
                    }
                ],
                `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value1,
                    },
                ],
                UI.FieldGroup: {
                    Data : [
                        {
                            Value: value3,
                        },
                        {
                            Value: value2,
                        },
                        {
                            Value: value4,
                        },
                    ]
                },
            );`
            );
        });
        test('different collection with lower indentation level', async () => {
            const fixture = `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value1,
                    },
                    {
                        Value: value2,
                    },
                ],
                UI.FieldGroup: {
                    Data : [
                        {
                            Value: value3,
                        },
                        {
                            Value: value4,
                        },
                    ]
                },
            );`;
            await testWriter(
                fixture,
                [
                    {
                        type: MOVE_COLLECTION_VALUE_CHANGE_TYPE,
                        pointer: '/targets/0/assignments/0/value',
                        index: 1,
                        fromPointers: ['/targets/0/assignments/1/value/properties/0/value/items/1']
                    }
                ],
                `
            Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        Value: value1,
                    },
                    {
                        Value: value4,
                    },
                    {
                        Value: value2,
                    },
                ],
                UI.FieldGroup: {
                    Data : [
                        {
                            Value: value3,
                        },
                    ]
                },
            );`
            );
        });
    });
});

import { pathToFileURL } from 'url';
import { join } from 'path';

import type { CdsCompilerFacade } from '@sap/ux-cds-compiler-facade';
import { createCdsCompilerFacadeForRoot, createMetadataCollector } from '@sap/ux-cds-compiler-facade';
import { VocabularyService } from '@sap-ux/odata-vocabularies';
import { Edm, createAttributeNode, createElementNode } from '@sap-ux/odata-annotation-core-types';

import {
    createConvertToCompoundAnnotationChange,
    createDeleteTargetChange,
    createDeleteAnnotationChange,
    createDeleteEmbeddedChange,
    createDeleteRecordChange,
    createDeleteRecordPropertyChange,
    createInsertAnnotationChange,
    createInsertRecordPropertyChange,
    createReplaceNodeChange,
    createUpdatePrimitiveValueChange,
    type CDSDocumentChange,
    createDeletePrimitiveValueChange,
    createDeleteAnnotationGroupChange,
    createDeleteAnnotationGroupItemsChange
} from '../../../src/cds/change';
import { preprocessChanges } from '../../../src/cds/preprocessor';

import { getDocument } from '../../../src/cds/document';
import type { Document } from '../../../src/cds/document';
import { PROJECTS } from '../projects';

const vocabularyService = new VocabularyService(true);

async function getCDSDocument(root: string, text: string): Promise<[CdsCompilerFacade, Document]> {
    const fileName = 'test.cds';
    const filePath = join(root, fileName);
    const fileUri = pathToFileURL(filePath).toString();
    const fileCache = new Map([[fileUri, text]]);

    const facade = await createCdsCompilerFacadeForRoot(root, [filePath], fileCache);
    const metadataElementMap = facade.getMetadata('S');
    const metadataCollector = createMetadataCollector(metadataElementMap, facade);
    return [facade, getDocument('S', vocabularyService, facade, fileCache, { uri: fileUri }, metadataCollector)];
}

async function runTest(
    text: string,
    changes: CDSDocumentChange[],
    expectedChanges: CDSDocumentChange[]
): Promise<void> {
    const [, document] = await getCDSDocument(PROJECTS.V4_CDS_START.root, text);

    expect(preprocessChanges(document.ast, changes)).toStrictEqual(expectedChanges);
}

describe('cds preprocessor', () => {
    describe('preprocessChanges', () => {
        describe('deletion merges and bubbling ', () => {
            test('last property', async () => {
                const fixture = `Service S { entity E {}; };
                annotate S.E with @(
                    UI.HeaderInfo : {
                        Description: {
                            Value : title,
                        },
                    },
                    UI.LineItem: []
                );`;

                await runTest(
                    fixture,
                    [createDeleteRecordPropertyChange('/targets/0/assignments/0/value/properties/0')],
                    [createDeleteAnnotationChange('/targets/0/assignments/0')]
                );
            });
            test('annotation group', async () => {
                const fixture = `Service S { entity E {}; };
                annotate S.E with @(
                    UI : {
                        HeaderInfo : {
                            Description: {
                                Value : title,
                            },
                        },
                        LineItem: []
                    }
                );`;

                await runTest(
                    fixture,
                    [createDeleteAnnotationGroupChange('/targets/0/assignments/0')],
                    [createDeleteTargetChange('/targets/0')]
                );
            });
            test('last property in annotation group', async () => {
                const fixture = `Service S { entity E {}; };
                annotate S.E with @(
                    UI : {
                        HeaderInfo : {
                            Description: {
                                Value : title,
                            },
                        },
                        LineItem: []
                    }
                );`;

                await runTest(
                    fixture,
                    [createDeleteRecordPropertyChange('/targets/0/assignments/0/items/items/0/value/properties/0')],
                    [createDeleteAnnotationChange('/targets/0/assignments/0/items/items/0')]
                );
            });
            test('last annotation in annotation group', async () => {
                const fixture = `Service S { entity E {}; };
                annotate S.E with @(
                    UI : {
                        HeaderInfo : {
                            Description: {
                                Value : title,
                            },
                        }
                    }
                );`;

                await runTest(
                    fixture,
                    [createDeleteRecordPropertyChange('/targets/0/assignments/0/items/items/0/value/properties/0')],
                    [createDeleteTargetChange('/targets/0')]
                );
            });
            test('all annotations in group', async () => {
                const fixture = `Service S { entity E {}; };
                annotate S.E with @(
                    UI : {
                        HeaderInfo : 'a',
                        LineItem: []
                    }
                );`;

                await runTest(
                    fixture,
                    [
                        createDeleteAnnotationChange('/targets/0/assignments/0/items/items/0'),
                        createDeleteAnnotationChange('/targets/0/assignments/0/items/items/1')
                    ],
                    [createDeleteTargetChange('/targets/0')]
                );
            });
            test('all annotations in group + insert', async () => {
                const fixture = `Service S { entity E {}; };
                annotate S.E with @(
                    UI : {
                        HeaderInfo : 'a',
                        LineItem: []
                    }
                );`;

                const changes = [
                    createDeleteAnnotationChange('/targets/0/assignments/0/items/items/0'),
                    createDeleteAnnotationChange('/targets/0/assignments/0/items/items/1'),
                    createInsertAnnotationChange(
                        '/targets/0/assignments/0',
                        createElementNode({
                            name: Edm.Annotation,
                            attributes: {
                                [Edm.Term]: createAttributeNode(Edm.Term, 'UI.Chart'),
                                [Edm.String]: createAttributeNode(Edm.String, 'value')
                            }
                        })
                    )
                ];

                await runTest(fixture, changes, changes);
            });
            test('annotation group items', async () => {
                const fixture = `Service S { entity E {}; };
                annotate S.E with @(
                    UI : {
                        HeaderInfo : 'a',
                        LineItem: []
                    }
                );`;

                await runTest(
                    fixture,
                    [createDeleteAnnotationGroupItemsChange('/targets/0/assignments/0/items')],
                    [createDeleteTargetChange('/targets/0')]
                );
            });
            test('collection element', async () => {
                const fixture = `Service S { entity E {}; };
                annotate S.E with @(
                    UI.LineItem : [
                        {
                            Value: abc,
                            Label: 'xyz'
                        }
                    ]
                );`;

                await runTest(
                    fixture,
                    [
                        createDeleteRecordPropertyChange('/targets/0/assignments/0/value/items/0/properties/0'),
                        createDeleteRecordPropertyChange('/targets/0/assignments/0/value/items/0/properties/1')
                    ],
                    [createDeleteRecordChange('/targets/0/assignments/0/value/items/0')]
                );
            });
            test('consider annotations', async () => {
                const fixture = `Service S { entity E {}; };
                annotate S.E with @(
                    UI.HeaderInfo : {
                        ![@Core.Description] : 'abc',
                        Description: {
                            Value : title,
                        },
                    }
                );`;

                await runTest(
                    fixture,
                    [createDeleteRecordPropertyChange('/targets/0/assignments/0/value/properties/0')],
                    [createDeleteRecordPropertyChange('/targets/0/assignments/0/value/properties/0')]
                );
            });
            test('delete annotations', async () => {
                const fixture = `Service S { entity E {}; };
                annotate S.E with @(
                    UI.HeaderInfo : {
                        ![@Core.Description] : {
                            Value: 'abc',
                        },
                        Description: {
                            Value : title,
                        },
                    }
                );`;

                await runTest(
                    fixture,
                    [
                        createDeleteRecordPropertyChange(
                            '/targets/0/assignments/0/value/properties/0/value/properties/0'
                        ),
                        createDeleteRecordPropertyChange(
                            '/targets/0/assignments/0/value/annotations/0/value/properties/0'
                        )
                    ],
                    [createDeleteTargetChange('/targets/0')]
                );
            });
            test('delete annotations with inserts', async () => {
                const fixture = `Service S { entity E {}; };
                annotate S.E with @(
                    UI.HeaderInfo : {
                        ![@Core.Description] : {
                            Value: 'abc',
                        },
                        Description: {
                            Value : title,
                        },
                    }
                );`;
                const insertPropertyChange = createInsertRecordPropertyChange(
                    '/targets/0/assignments/0/value',
                    createElementNode({
                        name: Edm.PropertyValue,
                        attributes: {
                            [Edm.Property]: createAttributeNode(Edm.Property, 'TypeName'),
                            [Edm.String]: createAttributeNode(Edm.Property, 'value')
                        }
                    })
                );

                await runTest(
                    fixture,
                    [
                        createDeleteRecordPropertyChange(
                            '/targets/0/assignments/0/value/properties/0/value/properties/0'
                        ),
                        createDeleteRecordPropertyChange(
                            '/targets/0/assignments/0/value/annotations/0/value/properties/0'
                        ),
                        insertPropertyChange
                    ],
                    [
                        createDeleteRecordPropertyChange('/targets/0/assignments/0/value/properties/0'),
                        createDeleteEmbeddedChange('/targets/0/assignments/0/value/annotations/0'),
                        insertPropertyChange
                    ]
                );
            });

            test('delete all annotations in target', async () => {
                const fixture = `Service S { entity E {}; };
                annotate S.E with @(
                    UI.LineItem: []
                );`;

                await runTest(
                    fixture,
                    [createDeleteAnnotationChange('/targets/0/assignments/0')],
                    [createDeleteTargetChange('/targets/0')]
                );
            });

            test('delete all annotations in target mixed with insert', async () => {
                const fixture = `Service S { entity E {}; };
                annotate S.E with @(
                    UI.LineItem: []
                );`;
                const insertAnnotation = createInsertAnnotationChange(
                    '/targets/0',
                    createElementNode({
                        name: Edm.Annotation,
                        attributes: {
                            [Edm.Term]: createAttributeNode(Edm.Term, 'Core.Description'),
                            [Edm.String]: createAttributeNode(Edm.String, 'value')
                        }
                    })
                );

                await runTest(
                    fixture,
                    [createDeleteAnnotationChange('/targets/0/assignments/0'), insertAnnotation],
                    [createReplaceNodeChange('/targets/0/assignments/0', insertAnnotation.element)]
                );
            });

            test('multiple annotation deletions to target', async () => {
                const fixture = `Service S { entity E {}; };
                annotate S.E with @(
                    UI.HeaderInfo.TypeNamePlural : 'TypeNamePlural was here on app',
                    UI.HeaderInfo.Description : {
                        Value : title,
                    },
                    UI.HeaderInfo : {
                        Title.Value: title
                    }
                );`;

                await runTest(
                    fixture,
                    [
                        createDeleteAnnotationChange('/targets/0/assignments/0'),
                        createDeleteRecordPropertyChange('/targets/0/assignments/1/value/properties/0'),
                        createDeleteRecordPropertyChange('/targets/0/assignments/2/value/properties/0')
                    ],
                    [createDeleteTargetChange('/targets/0')]
                );
            });
        });

        describe('delete -> replace', () => {
            test('target delete and inserts', async () => {
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
                await runTest(
                    fixture,
                    [
                        createInsertAnnotationChange('/targets/0', createTestNode('one')),
                        createInsertAnnotationChange('/targets/0', createTestNode('two')),
                        createInsertAnnotationChange('/targets/0', createTestNode('three')),
                        createDeleteAnnotationChange('/targets/0/assignments/0')
                    ],
                    [
                        createReplaceNodeChange('/targets/0/assignments/0', createTestNode('one')),
                        createInsertAnnotationChange('/targets/0', createTestNode('two')),
                        createInsertAnnotationChange('/targets/0', createTestNode('three')),
                        createConvertToCompoundAnnotationChange('/targets/0', false)
                    ]
                );
            });
        });

        describe('duplicates', () => {
            test('delete', async () => {
                const fixture = `Service S { entity E {}; };
                annotate S.E with @(
                    UI.HeaderInfo : {
                        Description: {
                            Value : title,
                        },
                    },
                    UI.LineItem: []
                );`;

                await runTest(
                    fixture,
                    [
                        createDeleteAnnotationChange('/targets/0/assignments/1'),
                        createDeleteAnnotationChange('/targets/0/assignments/0'),
                        createDeleteAnnotationChange('/targets/0/assignments/0')
                    ],
                    [createDeleteTargetChange('/targets/0')]
                );
            });
            test('deletes for child elements', async () => {
                const fixture = `Service S { entity E {}; };
                annotate S.E with @(
                    UI.HeaderInfo : {
                        Description: {
                            Value : title,
                        },
                    },
                    UI.LineItem: []
                );`;

                await runTest(
                    fixture,
                    [
                        createDeleteAnnotationChange('/targets/0/assignments/0'),
                        createDeleteRecordPropertyChange('/targets/0/assignments/0/value/properties/0')
                    ],
                    [createDeleteAnnotationChange('/targets/0/assignments/0')]
                );
            });
            test('deletes for child elements reverse order', async () => {
                const fixture = `Service S { entity E {}; };
                annotate S.E with @(
                    UI.HeaderInfo : {
                        Description: {
                            Value : title,
                        },
                    },
                    UI.LineItem: []
                );`;

                await runTest(
                    fixture,
                    [
                        createDeleteRecordPropertyChange('/targets/0/assignments/0/value/properties/0'),
                        createDeleteAnnotationChange('/targets/0/assignments/0')
                    ],
                    [createDeleteAnnotationChange('/targets/0/assignments/0')]
                );
            });
            test('replace', async () => {
                const fixture = `Service S { entity E {}; };
                annotate S.E with @(
                    UI.HeaderInfo : {
                        Description: {
                            Value : title,
                        },
                        TypeName: 'A'
                    }
                );`;

                await runTest(
                    fixture,
                    [
                        createReplaceNodeChange(
                            '/targets/0/assignments/0/value/properties/1/value',
                            createElementNode({ name: Edm.String })
                        ),
                        createReplaceNodeChange(
                            '/targets/0/assignments/0/value/properties/0/value',
                            createElementNode({ name: Edm.Record })
                        ),
                        createReplaceNodeChange(
                            '/targets/0/assignments/0/value/properties/0/value',
                            createElementNode({ name: Edm.Collection })
                        )
                    ],
                    [
                        createReplaceNodeChange(
                            '/targets/0/assignments/0/value/properties/1/value',
                            createElementNode({ name: Edm.String })
                        ),
                        createReplaceNodeChange(
                            '/targets/0/assignments/0/value/properties/0/value',
                            createElementNode({ name: Edm.Collection })
                        )
                    ]
                );
            });
            test('replace for child elements', async () => {
                const fixture = `Service S { entity E {}; };
                annotate S.E with @(
                    UI.HeaderInfo : {
                        Description: {
                            Value : title,
                        },
                        TypeName: 'A'
                    }
                );`;

                await runTest(
                    fixture,
                    [
                        createReplaceNodeChange(
                            '/targets/0/assignments/0/value/properties/0/value',
                            createElementNode({ name: Edm.Record })
                        ),
                        createReplaceNodeChange(
                            '/targets/0/assignments/0/value/properties/0/value/properties/0',
                            createElementNode({ name: Edm.Collection })
                        )
                    ],
                    [
                        createReplaceNodeChange(
                            '/targets/0/assignments/0/value/properties/0/value',
                            createElementNode({ name: Edm.Record })
                        )
                    ]
                );
            });
            test('keep changes from collection with more than 10 entries (comparisons with startsWith)', async () => {
                const items = Array.from({ length: 12 }, (_, i) => i);
                const fixture = `Service S { entity E {}; };
                annotate S.E with @UI.LineItem: [${items.join()}];`;
                const changes = items.map((_, i) =>
                    createDeletePrimitiveValueChange(`/targets/0/assignments/0/value/items/${i}`)
                );
                await runTest(fixture, changes, changes);
            });
            test('update', async () => {
                const fixture = `Service S { entity E {}; };
                annotate S.E with @(
                    UI.HeaderInfo : {
                        Description: {
                            Value : title,
                            Description : 'x',
                        },
                    }
                );`;

                await runTest(
                    fixture,
                    [
                        createUpdatePrimitiveValueChange(
                            '/targets/0/assignments/0/value/properties/0/value/properties/1/value',
                            'y'
                        ),
                        createUpdatePrimitiveValueChange(
                            '/targets/0/assignments/0/value/properties/0/value/properties/0/value',
                            'title1'
                        ),
                        createUpdatePrimitiveValueChange(
                            '/targets/0/assignments/0/value/properties/0/value/properties/0/value',
                            'title2'
                        )
                    ],
                    [
                        createUpdatePrimitiveValueChange(
                            '/targets/0/assignments/0/value/properties/0/value/properties/1/value',
                            'y'
                        ),
                        createUpdatePrimitiveValueChange(
                            '/targets/0/assignments/0/value/properties/0/value/properties/0/value',
                            'title2'
                        )
                    ]
                );
            });
        });
    });
});

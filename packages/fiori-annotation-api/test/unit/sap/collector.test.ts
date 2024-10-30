import { readFile } from 'fs/promises';
import { join } from 'path';

import type { AnnotationFile, Target } from '@sap-ux/odata-annotation-core-types';
import { createElementNode, createTarget, Edm, Location, Range } from '@sap-ux/odata-annotation-core-types';
import type { DocumentCstNode } from '@xml-tools/parser';
import { parse } from '@xml-tools/parser';
import { buildAst } from '@xml-tools/ast';
import { convertDocument } from '@sap-ux/xml-odata-annotation-converter';

import { collectODataAnnotations } from '../../../src/sap/collector';
import { createComplexAnnotation, createComplexRecordProperty, createRecord } from '../../../src/sap/builders';
import { logger } from '../../../src/logger';
import type { ValueWithOrigin } from '../../../src/sap/types';

function buildSnippet(target: string, annotation: string): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:Reference Uri="/incident/$metadata">
        <edmx:Include Namespace="IncidentService" Alias="Service" />
    </edmx:Reference>
    <edmx:DataServices>
        <Schema Namespace="Annotations" xmlns="http://docs.oasis-open.org/odata/ns/edm">
             <Annotations Target="${target}">
${annotation}
             </Annotations>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;
}

function targetLocation(uri: string, targetName: string): ValueWithOrigin<string> {
    return { value: targetName, location: Location.create(uri, Range.create(7, 34, 7, 34 + targetName.length)) };
}

async function getTestData(name: string, target = 'Service.Entity'): Promise<AnnotationFile> {
    const path = join(__dirname, 'fixtures', 'odata', name);
    const fixture = await readFile(path, { encoding: 'utf-8' });
    const snippet = buildSnippet(target, fixture);
    const { cst, tokenVector } = parse(snippet);

    const ast = buildAst(cst as DocumentCstNode, tokenVector);
    return convertDocument('mock://uri', ast);
}

describe('OData annotation collector', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('log warning if no matching handler is found', () => {
        const target = createTarget('Service.Entity');
        target.terms.push(createComplexAnnotation('UI.LineItems', createElementNode({ name: Edm.Annotation })));
        const annotations = collectODataAnnotations('test', [target]);
        expect(logger.warn).toHaveBeenCalledWith('No handler found for UI.LineItems');
        expect(annotations.length).toBe(0);
    });
    describe('UI.LineItem', () => {
        test('empty line item', () => {
            const target = createTarget('Service.Entity');
            target.terms.push(createComplexAnnotation('UI.LineItem', createElementNode({ name: Edm.Annotation })));
            const annotations = collectODataAnnotations('test', [target]);
            expect(logger.warn).toHaveBeenCalledWith('Invalid UI.LineItem structure, missing "Collection" element.');
            expect(annotations.length).toBe(0);
        });

        test('data field with path value', async () => {
            const { uri, targets } = await getTestData(join('ui', 'line-item', 'path.xml'));
            const annotations = collectODataAnnotations(uri, targets);
            expect(logger.warn).toBeCalledTimes(0);
            expect(annotations).toStrictEqual([
                {
                    term: 'UI.LineItem',
                    target: targetLocation(uri, 'Service.Entity'),
                    items: [
                        {
                            type: 'UI.DataField',
                            value: {
                                value: 'path',
                                location: Location.create(uri, Range.create(11, 50, 11, 54))
                            }
                        }
                    ],
                    location: Location.create(uri, Range.create(8, 0, 14, 13))
                }
            ]);
        });

        test('data field with property path value', async () => {
            const { uri, targets } = await getTestData(join('ui', 'line-item', 'property-path.xml'));
            const annotations = collectODataAnnotations(uri, targets);
            expect(logger.warn).toHaveBeenCalledTimes(0);
            expect(annotations).toStrictEqual([
                {
                    term: 'UI.LineItem',
                    target: targetLocation(uri, 'Service.Entity'),
                    items: [
                        {
                            type: 'UI.DataField',
                            value: {
                                value: 'property_path',
                                location: Location.create(uri, Range.create(11, 58, 11, 71))
                            }
                        }
                    ],
                    location: Location.create(uri, Range.create(8, 0, 14, 13))
                }
            ]);
        });

        test('data field with string value', async () => {
            const { uri, targets } = await getTestData(join('ui', 'line-item', 'string.xml'));
            const annotations = collectODataAnnotations(uri, targets);
            expect(logger.warn).toHaveBeenCalledWith('Invalid UI.DataField structure, missing "Value" property.');
            expect(annotations).toStrictEqual([
                {
                    term: 'UI.LineItem',
                    target: targetLocation(uri, 'Service.Entity'),
                    items: [],
                    location: Location.create(uri, Range.create(8, 0, 14, 13))
                }
            ]);
        });

        test('data field with label', async () => {
            const { uri, targets } = await getTestData(join('ui', 'line-item', 'label.xml'));
            const annotations = collectODataAnnotations(uri, targets);
            expect(logger.warn).toBeCalledTimes(0);
            expect(annotations).toStrictEqual([
                {
                    term: 'UI.LineItem',
                    target: targetLocation(uri, 'Service.Entity'),
                    items: [
                        {
                            type: 'UI.DataField',
                            value: {
                                value: 'path',
                                location: Location.create(uri, Range.create(11, 50, 11, 54))
                            },
                            label: {
                                value: 'label',
                                location: Location.create(uri, Range.create(12, 52, 12, 57))
                            }
                        }
                    ],
                    location: Location.create(uri, Range.create(8, 0, 15, 13))
                }
            ]);
        });
    });

    describe('UI.FieldGroup', () => {
        test('no root record', () => {
            const target = createTarget('Service.Entity');
            target.terms.push(createComplexAnnotation('UI.FieldGroup', createElementNode({ name: Edm.Annotation })));
            const annotations = collectODataAnnotations('test', [target]);
            expect(logger.warn).toHaveBeenCalledWith('Invalid UI.FieldGroup structure, missing root "Record" element.');
            expect(annotations.length).toBe(0);
        });

        test('no data property', () => {
            const target = createTarget('Service.Entity');
            target.terms.push(createComplexAnnotation('UI.FieldGroup', createRecord([])));
            const annotations = collectODataAnnotations('test', [target]);
            expect(logger.warn).toHaveBeenCalledWith('Invalid UI.FieldGroup structure, missing "Data" property.');
            expect(annotations.length).toBe(0);
        });

        test('no collection in data property', () => {
            const target = createTarget('Service.Entity');
            target.terms.push(
                createComplexAnnotation(
                    'UI.FieldGroup',
                    createRecord([createComplexRecordProperty('Data', createElementNode({ name: Edm.Annotation }))])
                )
            );
            const annotations = collectODataAnnotations('test', [target]);
            expect(logger.warn).toHaveBeenCalledWith(
                'Invalid UI.FieldGroup structure, missing "Collection" element in "Data" property.'
            );
            expect(annotations.length).toBe(0);
        });

        test('basic', async () => {
            const { uri, targets } = await getTestData(join('ui', 'field-group', 'basic.xml'));
            const annotations = collectODataAnnotations(uri, targets);
            expect(logger.warn).toBeCalledTimes(0);
            expect(annotations).toStrictEqual([
                {
                    term: 'UI.FieldGroup',
                    qualifier: { value: 'GeneratedGroup1', location: Location.create(uri, Range.create(8, 44, 8, 59)) },
                    target: targetLocation(uri, 'Service.Entity'),
                    data: [
                        {
                            type: 'UI.DataField',
                            value: {
                                value: 'identifier',
                                location: Location.create(uri, Range.create(13, 58, 13, 68))
                            }
                        }
                    ],
                    location: Location.create(uri, Range.create(8, 0, 18, 13))
                }
            ]);
        });

        test('data field with label', async () => {
            const { uri, targets } = await getTestData(join('ui', 'field-group', 'field-with-label.xml'));
            const annotations = collectODataAnnotations(uri, targets);
            expect(logger.warn).toBeCalledTimes(0);
            expect(annotations).toStrictEqual([
                {
                    term: 'UI.FieldGroup',
                    qualifier: { value: 'GeneratedGroup1', location: Location.create(uri, Range.create(8, 44, 8, 59)) },
                    target: targetLocation(uri, 'Service.Entity'),
                    data: [
                        {
                            type: 'UI.DataField',
                            value: {
                                value: 'identifier',
                                location: Location.create(uri, Range.create(13, 58, 13, 68))
                            },
                            label: {
                                value: 'label',
                                location: Location.create(uri, Range.create(14, 60, 14, 65))
                            }
                        }
                    ],
                    location: Location.create(uri, Range.create(8, 0, 19, 13))
                }
            ]);
        });

        test('no data field value', async () => {
            const { uri, targets } = await getTestData(join('ui', 'field-group', 'no-data-field-value.xml'));
            const annotations = collectODataAnnotations(uri, targets);
            expect(logger.warn).toHaveBeenCalledWith('Invalid UI.DataField structure, missing "Value" property.');
            expect(annotations).toStrictEqual([
                {
                    term: 'UI.FieldGroup',
                    qualifier: { value: 'GeneratedGroup1', location: Location.create(uri, Range.create(8, 44, 8, 59)) },
                    target: targetLocation(uri, 'Service.Entity'),
                    data: [],
                    location: Location.create(uri, Range.create(8, 0, 17, 13))
                }
            ]);
        });
    });

    describe('UI.Facets', () => {
        test('empty facets', () => {
            const target = createTarget('Service.Entity');
            target.terms.push(createComplexAnnotation('UI.Facets', createElementNode({ name: Edm.Annotation })));
            const annotations = collectODataAnnotations('test', [target]);
            expect(logger.warn).toHaveBeenCalledWith('Invalid UI.Facets structure, missing "Collection" element.');
            expect(annotations.length).toBe(0);
        });
        test('basic', async () => {
            const { uri, targets } = await getTestData(join('ui', 'facets', 'basic.xml'));
            const annotations = collectODataAnnotations(uri, targets);
            expect(logger.warn).toBeCalledTimes(0);
            expect(annotations).toStrictEqual([
                {
                    term: 'UI.Facets',
                    target: targetLocation(uri, 'Service.Entity'),
                    facets: [
                        {
                            type: 'UI.ReferenceFacet',
                            id: {
                                value: 'GeneratedFacet1',
                                location: Location.create(uri, Range.create(11, 49, 11, 64))
                            },
                            label: {
                                value: 'General Information',
                                location: Location.create(uri, Range.create(12, 52, 12, 71))
                            },
                            target: {
                                value: 'GeneratedGroup1',
                                location: Location.create(uri, Range.create(13, 76, 13, 91))
                            }
                        }
                    ],
                    location: Location.create(uri, Range.create(8, 0, 16, 13))
                }
            ]);
        });
        test('no reference facet id', async () => {
            const { uri, targets } = await getTestData(join('ui', 'facets', 'no-id.xml'));
            const annotations = collectODataAnnotations(uri, targets);
            expect(logger.warn).toHaveBeenCalledWith('ID for facet on "Service.Entity" is required!');
            expect(annotations).toStrictEqual([
                {
                    term: 'UI.Facets',
                    target: targetLocation(uri, 'Service.Entity'),
                    facets: [],
                    location: Location.create(uri, Range.create(8, 0, 13, 13))
                }
            ]);
        });
        test('no record type', async () => {
            const { uri, targets } = await getTestData(join('ui', 'facets', 'no-record-type.xml'));
            const annotations = collectODataAnnotations(uri, targets);
            expect(logger.warn).toHaveBeenCalledWith('Facet with type "" is not supported!');
            expect(annotations).toStrictEqual([
                {
                    term: 'UI.Facets',
                    target: targetLocation(uri, 'Service.Entity'),
                    facets: [],
                    location: Location.create(uri, Range.create(8, 0, 13, 13))
                }
            ]);
        });
        test('no target', async () => {
            const { uri, targets } = await getTestData(join('ui', 'facets', 'no-target.xml'));
            const annotations = collectODataAnnotations(uri, targets);
            expect(logger.warn).toHaveBeenCalledWith('Could not find target qualifier for facet "GeneratedFacet1"!');
            expect(annotations).toStrictEqual([
                {
                    term: 'UI.Facets',
                    target: targetLocation(uri, 'Service.Entity'),
                    facets: [],
                    location: Location.create(uri, Range.create(8, 0, 14, 13))
                }
            ]);
        });
    });
});

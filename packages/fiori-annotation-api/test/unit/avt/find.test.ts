import type { AnnotationList } from '@sap-ux/vocabularies-types';
import { findAnnotation } from '../../../src/avt';
import type { AnnotationReference } from '../../../src';

describe('find', () => {
    const reference: AnnotationReference = {
        target: 'IncidentService.Incidents/incidentsInteger',
        term: 'Org.OData.Measures.V1.Unit',
        qualifier: undefined
    };
    test('find annotation => exist', () => {
        const annotationList: AnnotationList[] = [
            {
                target: 'IncidentService.Incidents/incidentsInteger',
                annotations: [
                    {
                        term: 'Org.OData.Measures.V1.Unit',
                        value: {
                            type: 'Path',
                            Path: 'description'
                        }
                    }
                ]
            }
        ];

        const annotation = findAnnotation(annotationList, reference);
        expect(annotation).toMatchInlineSnapshot(`
            Object {
              "term": "Org.OData.Measures.V1.Unit",
              "value": Object {
                "Path": "description",
                "type": "Path",
              },
            }
        `);
    });

    test('multiple annotation with same target => exist', () => {
        const annotationList: AnnotationList[] = [
            {
                target: 'IncidentService.Incidents/incidentsInteger',
                annotations: [
                    {
                        term: 'Org.OData.Measures.V1.Unit',
                        value: {
                            type: 'Path',
                            Path: 'description'
                        }
                    }
                ]
            },
            {
                target: 'IncidentService.Incidents/incidentsInteger',
                annotations: [
                    {
                        term: 'Org.OData.Measures.V1.Unit',
                        qualifier: 'abc',
                        value: {
                            type: 'Path',
                            Path: 'description'
                        }
                    }
                ]
            }
        ];
        const referenceWithQualifier: AnnotationReference = {
            target: 'IncidentService.Incidents/incidentsInteger',
            term: 'Org.OData.Measures.V1.Unit',
            qualifier: 'abc'
        };
        const annotation = findAnnotation(annotationList, referenceWithQualifier);
        expect(annotation).toMatchInlineSnapshot(`
            Object {
              "qualifier": "abc",
              "term": "Org.OData.Measures.V1.Unit",
              "value": Object {
                "Path": "description",
                "type": "Path",
              },
            }
        `);
    });
    test('find annotation => not exist', () => {
        const annotationList: AnnotationList[] = [
            {
                target: 'IncidentService.Incidents',
                annotations: [
                    {
                        term: 'Org.OData.Measures.V1.Unit',
                        value: {
                            type: 'Path',
                            Path: 'description'
                        }
                    }
                ]
            }
        ];

        const annotation = findAnnotation(annotationList, reference);
        expect(annotation).toMatchInlineSnapshot(`undefined`);
    });
});

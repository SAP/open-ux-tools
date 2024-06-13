import { join } from 'path';
import { promises } from 'fs';

import type { AnnotationFile } from '@sap-ux/odata-annotation-core-types';

import { convertPointer, getAstNodesFromPointer } from '../../../src/cds/pointer';
import { getGenericNodeFromPointer } from '../../../src/utils';
import type { CDSDocument } from '../../../src/cds/document';

import { PROJECTS } from '../projects';
import { getCDSDocument } from './utils';

const LOG_ENABLED = false;

async function testRead(text: string): Promise<{ annotationFile: AnnotationFile; ast: CDSDocument }> {
    const [, document] = await getCDSDocument(
        PROJECTS.V4_CDS_START.root,
        text,
        join('app', 'incidents', 'annotations.cds'),
        'IncidentService'
    );

    return { ast: document.ast, annotationFile: document.annotationFile };
}

describe('convertPointerX - Ast Paths', () => {
    let ast: CDSDocument;
    let annotationFile: AnnotationFile;
    function testPointer(input: string, output: string, flattened = false) {
        const { pointer, containsFlattenedNodes } = convertPointer(annotationFile, input, ast);
        if (LOG_ENABLED) {
            const [currentAstNode] = getAstNodesFromPointer(ast, pointer).slice(-1);
            const currentAFNode = getGenericNodeFromPointer(annotationFile, input);
            console.log(currentAFNode);
            console.log(currentAstNode);
        }
        expect(pointer).toStrictEqual(output);
        expect(containsFlattenedNodes).toStrictEqual(flattened);
    }

    async function testPointerWithFixture(text: string, input: string, output: string) {
        const { annotationFile, ast } = await testRead(text);
        const { pointer } = convertPointer(annotationFile, input, ast);
        expect(pointer).toStrictEqual(output);
    }
    beforeAll(async () => {
        const fixturePath = join(__dirname, '..', '..', 'data', 'cds', 'pointer-fixture.cds');
        const fixture = await promises.readFile(fixturePath, { encoding: 'utf-8' });
        const result = await testRead(fixture);
        ast = result.ast;
        annotationFile = result.annotationFile;
    });
    test('Target', () => {
        testPointer('/targets/0', '/targets/0');
    });
    test('Annotation Group Value inside $value', () => {
        testPointer(
            '/targets/0/terms/0/content/0/content/0',
            '/targets/0/assignments/0/items/items/0/value/properties/0/value/items/0'
        );
    });
    test('Annotation Record $Type', () => {
        testPointer(
            '/targets/7/terms/0/content/0/content/1/content/0/content/0/attributes/Type/value',
            '/targets/7/assignments/0/value/properties/1/value/items/0/properties/0/value'
        );
    });

    test('Annotation Group Record value in $value value', () => {
        // points to createdAt in lineItem {Value: createdAt, },
        testPointer(
            '/targets/0/terms/0/content/0/content/1/content/0/content/0/content/0/text',
            '/targets/0/assignments/0/items/items/0/value/properties/0/value/items/1/properties/0/value'
        );
    });
    test('Embedded annotation inside $value record', () => {
        testPointer(
            '/targets/0/terms/0/content/0/content/2/content/1/content/0/content/0/text',
            '/targets/0/assignments/0/items/items/0/value/properties/0/value/items/2/annotations/0/value'
        );
    });
    test('Annotation Group embedded annotations value inside $value', () => {
        testPointer(
            '/targets/0/terms/0/content/1/content/0/content/0/text',
            '/targets/0/assignments/0/items/items/0/value/annotations/0/value'
        );
    });
    test('Annotation Group First Term', () => {
        testPointer('/targets/0/terms/1', '/targets/0/assignments/0/items/items/1');
    });
    test('Annotation Group Terms Attribute Term value', () => {
        testPointer('/targets/0/terms/0/attributes/Term/value', '/targets/0/assignments/0/items/items/0/term');
    });
    test('Annotation Group Terms Attribute Term', () => {
        testPointer('/targets/0/terms/0/attributes/Term', '/targets/0/assignments/0/items/items/0/term');
    });
    test('Annotation Terms Attribute qualifier value', () => {
        testPointer('/targets/2/terms/0/attributes/Qualifier/value', '/targets/2/assignments/0/qualifier');
    });
    test('Annotation Terms Attribute qualifier', () => {
        testPointer('/targets/2/terms/0/attributes/Qualifier', '/targets/2/assignments/0/qualifier');
    });

    test('annotation', () => {
        testPointer('/targets/2/terms/0', '/targets/2/assignments/0');
    });

    test('qualifier', () => {
        testPointer('/targets/2/terms/0/attributes/Qualifier/value', '/targets/2/assignments/0/qualifier');
    });

    describe('value', () => {
        test('collection', () => {
            testPointer('/targets/2/terms/0/content/0', '/targets/2/assignments/0/value');
        });
        test('primitive', () => {
            // IncidentService.IncidentFlow/criticality
            testPointer('/targets/6/terms/0/content/0', '/targets/6/assignments/0/value');
            testPointer('/targets/6/terms/0/content/0/content/0/text', '/targets/6/assignments/0/value');
        });
    });
    describe('record', () => {
        test('property value (element)', () => {
            testPointer(
                '/targets/0/terms/1/content/0/content/0/content/0/content/0/content/2/content/0',
                '/targets/0/assignments/0/items/items/1/value/properties/0/value/items/0/properties/2/value'
            );
        });
        test('property collection value', () => {
            testPointer(
                '/targets/0/terms/1/content/0/content/0/content/0',
                '/targets/0/assignments/0/items/items/1/value/properties/0/value'
            );
        });
        test('property (text node)', () => {
            testPointer(
                '/targets/0/terms/1/content/0/content/0/content/0/content/0/content/2/content/0/content/0',
                '/targets/0/assignments/0/items/items/1/value/properties/0/value/items/0/properties/2/value'
            );
            testPointer(
                '/targets/0/terms/1/content/0/content/0/content/0/content/0/content/2/content/0/content/0/text',
                '/targets/0/assignments/0/items/items/1/value/properties/0/value/items/0/properties/2/value'
            );
        });
        test('property name', () => {
            testPointer(
                '/targets/2/terms/0/content/0/content/0/content/0/attributes/Property/value',
                '/targets/2/assignments/0/value/items/0/properties/0/name'
            );
        });
        test('content', () => {
            testPointer('/targets/2/terms/0/content/0/content/0', '/targets/2/assignments/0/value/items/0');
        });
    });
    describe('embedded annotation', () => {
        test('basic', () => {
            testPointer(
                '/targets/2/terms/0/content/0/content/0/content/2',
                '/targets/2/assignments/0/value/items/0/annotations/0'
            );
        });
        test('after value', async () => {
            await testPointerWithFixture(
                `using IncidentService as service from '../../srv/incidentservice';
    annotate IncidentService.Incidents with @UI.LineItem: { $value: [], @UI.Hidden};`,
                '/targets/0/terms/0/content/1',
                '/targets/0/assignments/0/value/annotations/0'
            );
        });
        test('record property value', () => {
            testPointer(
                '/targets/2/terms/0/content/0/content/0/content/3/content/0/content/0/content/0/content/0/text',
                '/targets/2/assignments/0/value/items/0/annotations/1/value/properties/1/value'
            );
        });
        test('record property name', () => {
            testPointer(
                '/targets/2/terms/0/content/0/content/0/content/3/content/0/content/0/attributes/Property/value',
                '/targets/2/assignments/0/value/items/0/annotations/1/value/properties/1/name'
            );
        });
    });
    describe('flattened annotations', () => {
        test('record', () => {
            testPointer('/targets/8/terms/0/content/0', '/targets/8/assignments/0', true);
        });
        test('record property', () => {
            testPointer('/targets/8/terms/0/content/0/content/0/content/0', '/targets/8/assignments/0/value', true);
        });
        test('name of flattened record property in annotation', () => {
            testPointer(
                '/targets/8/terms/0/content/0/content/0/attributes/Property/value',
                '/targets/8/assignments/0/term/segments/2',
                true
            );
        });
        test('flattened record in group', () => {
            testPointer('/targets/8/terms/1/content/0', '/targets/8/assignments/1/items/items/0', true);
        });
        test('property in flattened record in group', () => {
            // TODO: check if there is a better way to handle this
            // there is nothing to point to in the CDS annotation AST, we do not have a node for the property itself
            // we only have node for property name
            testPointer('/targets/8/terms/1/content/0/content/0', '/targets/8/assignments/1/items/items/0', true);
        });
        test('value of flattened record property', () => {
            testPointer(
                '/targets/8/terms/2/content/0/content/0/content/0/content/0/content/0',
                '/targets/8/assignments/1/items/items/1/value/properties/0/value',
                true
            );
            testPointer(
                '/targets/8/terms/2/content/0/content/0/content/0/content/0/content/0/content/0',
                '/targets/8/assignments/1/items/items/1/value/properties/0/value',
                true
            );
        });
        test('name of flattened record property', () => {
            testPointer(
                '/targets/8/terms/2/content/0/content/0/content/0/content/0/attributes/Property/value',
                '/targets/8/assignments/1/items/items/1/value/properties/0/name/segments/1',
                true
            );
        });
    });
});

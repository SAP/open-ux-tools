import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Position, Range } from '@sap-ux/odata-annotation-core-types';
import type { AnnotationFile } from '@sap-ux/odata-annotation-core-types';

import type { FindPathResult } from '../../src';
import { findPathToPosition, getPositionData } from '../../src';

function findNodeByPosition(annotationFile: AnnotationFile, position: Position, forCompletion = false): FindPathResult {
    const result = findPathToPosition(annotationFile, position, forCompletion);
    if (result) {
        return getPositionData(annotationFile, result.path);
    }
    return {
        found: false,
        path: '',
        remainingString: '',
        startString: ''
    };
}

const loadTestData = (testName: string) => {
    const folder = join(__dirname, '..', 'data', testName);
    const annoFile = JSON.parse(readFileSync(join(folder, 'annotations.json')).toString()) as AnnotationFile;

    const cursorPosition = JSON.parse(readFileSync(join(folder, 'cursorPosition.json')).toString()) as Position;
    return { annoFile, cursorPosition };
};

const findNodeByPositionTest = (testName: string, forCompletion = false) => {
    const { annoFile, cursorPosition } = loadTestData(testName);
    return findNodeByPosition(annoFile, cursorPosition, forCompletion);
};

const findPathToPositionTest = (testName: string, forCompletion = false) => {
    const { annoFile, cursorPosition } = loadTestData(testName);
    return findPathToPosition(annoFile, cursorPosition, forCompletion);
};

describe('findPathToPosition', () => {
    describe('reference', () => {
        it('reference namespace name', () => {
            const result = findNodeByPositionTest('reference-namespace-name');
            expect(result).toMatchSnapshot();
        });
        it('reference alias', () => {
            const result = findNodeByPositionTest('reference-alias');
            expect(result).toMatchSnapshot();
        });
    });

    describe('target', () => {
        it('target name', () => {
            const result = findNodeByPositionTest('target-name-position');
            expect(result).toMatchSnapshot();
        });

        it('target content', () => {
            const result = findNodeByPositionTest('target-content-position');
            expect(result).toMatchSnapshot();
        });
        it('annotation element name', () => {
            const result = findNodeByPositionTest('annotatations-element-name');
            expect(result).toMatchSnapshot();
        });
    });

    describe('element', () => {
        it('name', () => {
            const result = findNodeByPositionTest('element-name');
            expect(result).toMatchSnapshot();
        });
        it('attribute name', () => {
            const result = findNodeByPositionTest('attribute-name');
            expect(result).toMatchSnapshot();
        });
        it('attribute value', () => {
            const result = findNodeByPositionTest('attribute-value');
            expect(result).toMatchSnapshot();
        });
        it('empty attribute value', () => {
            const result = findNodeByPositionTest('empty-attribute-value');
            expect(result).toMatchSnapshot();
        });
        it('attribute area', () => {
            const result = findNodeByPositionTest('attribute-area');
            expect(result).toMatchSnapshot();
        });
        it('text node value', () => {
            const result = findNodeByPositionTest('text-node-value');
            expect(result).toMatchSnapshot();
        });
        it('element content', () => {
            const result = findNodeByPositionTest('element-content');
            expect(result).toMatchSnapshot();
        });
        it('empty element content', () => {
            const result = findNodeByPositionTest('empty-element-content');
            expect(result).toMatchSnapshot();
        });
        it('element content before annotation', () => {
            const result = findNodeByPositionTest('element-content-before-annotation');
            expect(result).toMatchSnapshot();
        });
        it('element content before annotation for completion', () => {
            const result = findNodeByPositionTest('element-content-before-annotation-for-completion', true);
            expect(result).toMatchSnapshot();
        });
        it('empty element name', () => {
            const result = findNodeByPositionTest('empty-element-name', true);
            expect(result).toMatchSnapshot();
        });
        it('after syntax error', () => {
            const result = findNodeByPositionTest('after-syntax-error', true);
            expect(result).toMatchSnapshot();
        });
        it('unclosed element name', () => {
            const result = findPathToPositionTest('unclosed-element-name', true);
            expect(result).toMatchSnapshot();
        });
        it('content after unclosed element', () => {
            const result = findPathToPositionTest('content-after-unclosed-element', true);
            expect(result).toMatchSnapshot();
        });
        it('element content with no name range', () => {
            const file: AnnotationFile = {
                type: 'annotation-file',
                uri: 'file.cds',
                range: Range.create(0, 0, 2, 2),
                references: [],
                targets: [
                    {
                        type: 'target',
                        name: 'Target1',
                        range: Range.create(0, 0, 2, 2),
                        termsRange: Range.create(1, 1, 2, 2),
                        terms: [
                            {
                                type: 'element',
                                name: '',
                                attributes: {},
                                range: Range.create(1, 1, 2, 2),
                                contentRange: Range.create(1, 1, 2, 2),
                                content: [
                                    {
                                        type: 'text',
                                        text: 'test',
                                        range: Range.create(1, 1, 1, 5)
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };
            const position = Position.create(1, 1);
            const result = findNodeByPosition(file, position, false);
            expect(result).toMatchSnapshot();
        });
    });

    describe('namespace', () => {
        it('schema content', () => {
            const result = findNodeByPositionTest('schema-content');
            expect(result).toMatchSnapshot();
        });
    });
});

describe('getPositionData', () => {
    let annotationFile: AnnotationFile;
    beforeAll(() => {
        ({ annoFile: annotationFile } = loadTestData('get-position-data'));
    });
    describe('basic', () => {
        test('root', () => {
            const positionPointer = '/';
            const result = getPositionData(annotationFile, positionPointer);
            expect(result).toMatchSnapshot();
        });
        test('empty path', () => {
            const positionPointer = '';
            const result = getPositionData(annotationFile, positionPointer);
            expect(result).toMatchSnapshot();
        });
        test('non terminal $', () => {
            const positionPointer = 'targets/$1/name/$20';
            const result = getPositionData(annotationFile, positionPointer);
            expect(result).toStrictEqual({
                found: false,
                path: "$['targets']['$1']",
                startString: '',
                remainingString: ''
            });
        });
    });
    describe('references', () => {
        test('name', () => {
            const positionPointer = 'references/0/name/$28';
            const result = getPositionData(annotationFile, positionPointer);
            expect(result).toMatchSnapshot();
        });
        test('alias', () => {
            const positionPointer = 'references/0/alias/$8';
            const result = getPositionData(annotationFile, positionPointer);
            expect(result).toMatchSnapshot();
        });
    });
    describe('targets', () => {
        test('name', () => {
            const positionPointer = 'targets/1/name/$20';
            const result = getPositionData(annotationFile, positionPointer);
            expect(result).toMatchSnapshot();
        });
        test('content', () => {
            const positionPointer = 'targets/0/terms';
            const result = getPositionData(annotationFile, positionPointer);
            expect(result).toMatchSnapshot();
        });
        test('annotation element name', () => {
            const positionPointer = 'targets/0/';
            const result = getPositionData(annotationFile, positionPointer);
            expect(result).toMatchSnapshot();
        });
    });
    describe('elements', () => {
        test('name', () => {
            const positionPointer = 'targets/1/terms/0/content/1/content/1/name/$2';
            const result = getPositionData(annotationFile, positionPointer);
            expect(result).toMatchSnapshot();
        });
        test('attribute name', () => {
            const positionPointer = 'targets/1/terms/0/content/1/content/1/content/3/attributes/Path/name/$3';
            const result = getPositionData(annotationFile, positionPointer);
            expect(result).toMatchSnapshot();
        });
        test('attribute value', () => {
            const positionPointer = 'targets/1/terms/0/content/1/content/1/content/3/attributes/Path/value/$1';
            const result = getPositionData(annotationFile, positionPointer);
            expect(result).toMatchSnapshot();
        });
        test('attribute area', () => {
            const positionPointer = 'targets/0/terms/0/attributes/$0';
            const result = getPositionData(annotationFile, positionPointer);
            expect(result).toMatchSnapshot();
        });
        test('text node value', () => {
            const positionPointer = 'targets/2/terms/0/content/1/content/1/content/5/content/1/content/0/text/$4';
            const result = getPositionData(annotationFile, positionPointer);
            expect(result).toMatchSnapshot();
        });
        test('element content', () => {
            const positionPointer = 'targets/1/terms/0/content/1/content/1/content/0/text/$0';
            const result = getPositionData(annotationFile, positionPointer);
            expect(result).toMatchSnapshot();
        });
        test('empty element content', () => {
            const { annoFile } = loadTestData('empty-element-content');
            const positionPointer = 'targets/0/terms/0/content/1/content/$0';
            const result = getPositionData(annoFile, positionPointer);
            expect(result).toMatchSnapshot();
        });
        test('empty element name', () => {
            const { annoFile } = loadTestData('empty-element-name');
            const positionPointer = 'targets/0/terms/0/content/1/name';
            const result = getPositionData(annoFile, positionPointer);
            expect(result).toMatchSnapshot();
        });
    });
    describe('namespace', () => {
        test('schema content', () => {
            const positionPointer = 'namespace/targets';
            const result = getPositionData(annotationFile, positionPointer);
            expect(result).toMatchSnapshot();
        });
    });
});

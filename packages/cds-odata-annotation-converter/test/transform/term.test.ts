import { VocabularyService } from '@sap-ux/odata-vocabularies';
import type { TestCaseName } from '../setup';
import { getAst, getDiagnostics, getPaths, getTerm } from '../setup';
import { Position, Range } from '@sap-ux/text-document-utils';
import { initI18n } from '../../src/i18n';
import type { Assignment } from '@sap-ux/cds-annotation-parser';
import { parse } from '@sap-ux/cds-annotation-parser';
import type { Element, TextNode } from '@sap-ux/odata-annotation-core';
import { convertAnnotation as toTerms } from '../../src/transforms/annotation/convert';

declare const expect: jest.Expect;

const vocabularyService = new VocabularyService(true);

const testConversion = (testCase: TestCaseName): void => {
    test('conversion', async () => {
        await initI18n();
        const ast = await getAst(testCase);
        const expectedTerm = await getTerm(testCase);
        const expectedDiagnostics = await getDiagnostics(testCase);
        const expectedPaths = await getPaths(testCase);
        const { terms, diagnostics, pathSet } = toTerms(ast as Assignment, { vocabularyService });
        expect(terms).toStrictEqual(expectedTerm);
        expect(diagnostics).toStrictEqual(expectedDiagnostics);
        // Assuming pathSet is a Set<string> or undefined
        const actualPaths = pathSet ? [...pathSet.values()] : [];
        expect(actualPaths).toStrictEqual(expectedPaths);
    });
};

describe('ast to generic format', () => {
    describe('group', () => {
        testConversion('group');
        describe('pointer', () => {
            test('term name', async () => {
                const ast = await getAst('group');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(1, 4)
                });
                expect(pointer).toStrictEqual('/0/attributes/Term/value');
                expect(nodeRange).toEqual(Range.create(1, 4, 1, 9));
            });
            test('enum value start', async () => {
                const ast = await getAst('group');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(1, 35)
                });
                expect(pointer).toStrictEqual('/0/content/0/content/0/content/0/content/0');
                expect(nodeRange).toEqual(Range.create(1, 33, 1, 40));
            });
            test('enum value end', async () => {
                const ast = await getAst('group');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(1, 40)
                });
                expect(pointer).toStrictEqual('/0/content/0/content/0/content/0/content/0');
                expect(nodeRange).toEqual(Range.create(1, 33, 1, 40));
            });
            test('empty value', async () => {
                const ast = await getAst('group');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(23, 25)
                });
                expect(pointer).toStrictEqual('/3/content/0/content/0/$0');
                expect(nodeRange).toEqual(Range.create(23, 24, 23, 25));
            });
        });
    });
    describe('top-level-line-item', () => {
        testConversion('top-level-line-item');
        describe('pointer', () => {
            test('term name', async () => {
                const ast = await getAst('top-level-line-item');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(0, 0)
                });
                expect(pointer).toStrictEqual('/0/attributes/Term/value');
                expect(nodeRange).toEqual(Range.create(0, 0, 0, 11));
            });
            test('qualifier', async () => {
                const ast = await getAst('top-level-line-item');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(0, 14)
                });
                expect(pointer).toStrictEqual('/0/attributes/Qualifier/value');
                expect(nodeRange).toEqual(Range.create(0, 14, 0, 15));
            });
            test('collection content', async () => {
                const ast = await getAst('top-level-line-item');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(0, 19)
                });
                expect(pointer).toStrictEqual('/0/content/0/$0');
                expect(nodeRange).toEqual(Range.create(0, 19, 16, 0));
            });
            test('record content', async () => {
                const ast = await getAst('top-level-line-item');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(1, 5)
                });
                expect(pointer).toStrictEqual('/0/content/0/content/0/$0');
                expect(nodeRange).toEqual(Range.create(1, 5, 4, 4));
            });
            test('record type start', async () => {
                const ast = await getAst('top-level-line-item');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(2, 23)
                });
                expect(pointer).toStrictEqual('/0/content/0/content/0/attributes/Type/value');
                expect(nodeRange).toEqual(Range.create(2, 23, 2, 35));
            });
            test('record type end', async () => {
                const ast = await getAst('top-level-line-item');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(2, 35)
                });
                expect(pointer).toStrictEqual('/0/content/0/content/0/attributes/Type/value');
                expect(nodeRange).toEqual(Range.create(2, 23, 2, 35));
            });
            test('empty record type', async () => {
                const ast = await getAst('top-level-line-item');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(9, 23)
                });
                expect(pointer).toStrictEqual('/0/content/0/content/2/attributes/Type/value');
                expect(nodeRange).toEqual(Range.create(9, 23, 9, 23));
            });
            test('record property name start', async () => {
                const ast = await getAst('top-level-line-item');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(3, 8)
                });
                expect(pointer).toStrictEqual('/0/content/0/content/0/content/0/attributes/Property/value');
                expect(nodeRange).toEqual(Range.create(3, 8, 3, 19));
            });
            test('record property name end', async () => {
                const ast = await getAst('top-level-line-item');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(3, 19)
                });
                expect(pointer).toStrictEqual('/0/content/0/content/0/content/0/attributes/Property/value');
                expect(nodeRange).toEqual(Range.create(3, 8, 3, 19));
            });
            test('path property value start', async () => {
                const ast = await getAst('top-level-line-item');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(3, 22)
                });
                expect(pointer).toStrictEqual('/0/content/0/content/0/content/0/content/0/content/0/text/$0');
                expect(nodeRange).toEqual(Range.create(3, 22, 3, 33));
            });
            test('path property value end', async () => {
                const ast = await getAst('top-level-line-item');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(3, 33)
                });
                expect(pointer).toStrictEqual('/0/content/0/content/0/content/0/content/0/content/0/text/$11');
                expect(nodeRange).toEqual(Range.create(3, 22, 3, 33));
            });
            test('second property value', async () => {
                const ast = await getAst('top-level-line-item');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(6, 20)
                });
                expect(pointer).toStrictEqual('/0/content/0/content/1/content/0/content/0/content/0/text/$4');
                expect(nodeRange).toEqual(Range.create(6, 16, 6, 26));
            });
        });
    });
    describe('flatten annotation - HeaderInfo', () => {
        testConversion('flatten-headerInfo');

        describe('pointer', () => {
            describe('HeaderInfo', () => {
                test('Add property TypeName', async () => {
                    const ast = await getAst('flatten-headerInfo');
                    const { pointer, nodeRange } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(1, 15)
                    });
                    expect(pointer).toStrictEqual('/0/content/0/content/0/attributes/Property/value');
                    expect(nodeRange).toEqual(Range.create(1, 15, 1, 23));
                });
                test('Assigning value to TypeName', async () => {
                    const ast = await getAst('flatten-headerInfo');
                    const { pointer, nodeRange } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(1, 26)
                    });
                    expect(pointer).toStrictEqual('/0/content/0/content/0/content/0/content/0/text/$0');
                    expect(nodeRange).toEqual(Range.create(1, 26, 1, 36));
                });
                test('flat - Chart.AxisScaling.AutoScaleBehavior.ZeroAlwaysVisible', async () => {
                    const ast = await getAst('flatten-headerInfo');
                    const { pointer, nodeRange } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(8, 40)
                    });
                    expect(pointer).toStrictEqual(
                        '/4/content/0/content/0/content/0/content/0/content/0/content/0/attributes/Property/value'
                    );
                    expect(nodeRange).toEqual(Range.create(8, 40, 8, 57));
                });
                test('flatten under structure- Chart.AxisScaling.AutoScaleBehavior.ZeroAlwaysVisible', async () => {
                    const ast = await getAst('flatten-headerInfo');
                    const { pointer, nodeRange } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(13, 38)
                    });
                    expect(pointer).toStrictEqual(
                        '/6/content/0/content/1/content/0/content/0/content/0/content/0/attributes/Property/value'
                    );
                    expect(nodeRange).toEqual(Range.create(13, 38, 13, 55));
                });
                test('Assigning empty value to TypeImageUrl', async () => {
                    const ast = await getAst('flatten-headerInfo');
                    const { pointer, nodeRange } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(15, 29)
                    });
                    expect(pointer).toStrictEqual('/7/content/0/content/0/$0');
                    expect(nodeRange).toEqual(Range.create(15, 28, 16, 0));
                });
            });
        });
    });
    describe('flatten embedded annotation - Common.Text', () => {
        testConversion('flatten-embedded-annotation');
        describe('pointer', () => {
            describe('@UI.TextArrangement', () => {
                test('Inside embedded term name', async () => {
                    const ast = await getAst('flatten-embedded-annotation');
                    const { pointer, nodeRange } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(0, 20)
                    });
                    expect(pointer).toStrictEqual('/0/content/0/attributes/Term/value');
                    expect(nodeRange).toEqual(Range.create(0, 12, 0, 31));
                });
                test('Inside embedded term value', async () => {
                    const ast = await getAst('flatten-embedded-annotation');
                    const { pointer, nodeRange } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(0, 37)
                    });
                    expect(pointer).toStrictEqual('/0/content/0/content/0/content/0');
                    expect(nodeRange).toEqual(Range.create(0, 34, 0, 43));
                });
            });
        });
    });
    describe('chart', () => {
        testConversion('chart');
        describe('pointer', () => {
            describe('boolean', () => {
                test('true', async () => {
                    const ast = await getAst('chart');
                    const { pointer, nodeRange } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(8, 14)
                    });
                    expect(pointer).toStrictEqual('/1/content/0/content/0/text');
                    expect(nodeRange).toEqual(Range.create(8, 12, 8, 16));
                });
                test('false', async () => {
                    const ast = await getAst('chart');
                    const { pointer, nodeRange } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(9, 25)
                    });
                    expect(pointer).toStrictEqual('/2/content/0/content/0/text');
                    expect(nodeRange).toEqual(Range.create(9, 20, 9, 25));
                });
            });
            describe('term', () => {
                test('without value', async () => {
                    const ast = await getAst('chart');
                    const { pointer, nodeRange } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(11, 7)
                    });
                    expect(pointer).toStrictEqual('/4/attributes/Term/value');
                    expect(nodeRange).toEqual({ end: { character: 9, line: 11 }, start: { character: 4, line: 11 } });
                });
                test('empty value', async () => {
                    const ast = await getAst('chart');
                    const { pointer, nodeRange } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(10, 18)
                    });
                    expect(pointer).toStrictEqual('/3/$0');
                    expect(nodeRange).toEqual(Range.create(10, 17, 10, 18));
                });
            });
        });
    });
    describe('paths', () => {
        testConversion('paths');
        describe('pointer', () => {
            describe('string', () => {
                test('2nd segment', async () => {
                    const ast = await getAst('paths');
                    const { pointer, nodeRange } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(12, 41)
                    });
                    expect(pointer).toStrictEqual('/0/content/0/content/2/content/0/content/0/content/0/text/$19');
                    expect(nodeRange).toEqual(Range.create(12, 22, 12, 41));
                });
            });
            describe('escaped identifier', () => {
                test('2nd segment', async () => {
                    const ast = await getAst('paths');
                    const { pointer, nodeRange } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(28, 42)
                    });
                    expect(pointer).toStrictEqual('/0/content/0/content/6/content/0/content/0/content/0/text/$19');
                    expect(nodeRange).toEqual(Range.create(28, 42, 28, 42));
                });
            });
        });
    });
    describe('numbers', () => {
        testConversion('numbers');
        describe('pointer', () => {
            test('in int value', async () => {
                const ast = await getAst('numbers');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(3, 19)
                });
                expect(pointer).toStrictEqual('/0/content/0/content/0/content/0/content/0/content/0/text/$0');
                expect(nodeRange).toEqual(Range.create(3, 19, 3, 20));
            });
        });
    });
    describe('bracket-matching', () => {
        testConversion('bracket-matching');
    });
    describe('top-level-empty-value', () => {
        testConversion('top-level-empty-value');
        describe('pointer', () => {
            test('empty value', async () => {
                const ast = await getAst('top-level-empty-value');
                const { pointer } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(0, 21)
                });
                expect(pointer).toStrictEqual('/0/$0');
            });
        });
    });
    describe('record', () => {
        testConversion('record');
        describe('pointer', () => {
            test('empty value', async () => {
                const ast = await getAst('record');
                const { pointer } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(3, 12)
                });
                expect(pointer).toStrictEqual('/0/content/0/content/1/$0');
            });
        });
    });
    describe('enum', () => {
        testConversion('enum');
        describe('pointer', () => {
            describe('enum', () => {
                test('first enum', async () => {
                    const ast = await getAst('enum');
                    const { pointer, nodeRange } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(6, 25)
                    });
                    expect(pointer).toStrictEqual(
                        '/0/content/0/content/0/content/0/content/0/content/0/content/0/content/0/text/$61'
                    );
                    expect(nodeRange).toEqual(Range.create(6, 25, 6, 29));
                });
                test('second enum start', async () => {
                    const ast = await getAst('enum');
                    const { pointer, nodeRange } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(6, 32)
                    });
                    expect(pointer).toStrictEqual(
                        '/0/content/0/content/0/content/0/content/0/content/0/content/0/content/0/text/$127'
                    );
                    expect(nodeRange).toEqual(Range.create(6, 32, 6, 41));
                });
                test('in second enum start', async () => {
                    const ast = await getAst('enum');
                    const { pointer, nodeRange } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(6, 33)
                    });
                    expect(pointer).toStrictEqual(
                        '/0/content/0/content/0/content/0/content/0/content/0/content/0/content/0/text/$127'
                    );
                    expect(nodeRange).toEqual(Range.create(6, 32, 6, 41));
                });
                test('after second enum', async () => {
                    const ast = await getAst('enum');
                    const { pointer, nodeRange } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(6, 42)
                    });
                    expect(pointer).toStrictEqual(
                        '/0/content/0/content/0/content/0/content/0/content/0/content/0/content/0/text'
                    );
                    expect(nodeRange).toEqual(Range.create(6, 24, 6, 42));
                });
                test('empty enum flags', async () => {
                    const ast = await getAst('enum');
                    const { pointer, nodeRange } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(15, 24)
                    });
                    expect(pointer).toStrictEqual(
                        '/1/content/0/content/0/content/0/content/0/content/0/content/0/content/0/text'
                    );
                    expect(nodeRange).toEqual(Range.create(15, 24, 15, 24));
                });
            });
        });
    });

    describe('keywords', () => {
        test('null', () => {
            const ast = parse(`a: null`);
            const { terms } = toTerms(ast as Assignment, { vocabularyService });
            const valueNode = terms[0].content[0] as Element;
            expect(valueNode.name).toStrictEqual('Null');
        });
        test('NULL', () => {
            const ast = parse(`a: NULL`);
            const { terms } = toTerms(ast as Assignment, { vocabularyService });
            const valueNode = terms[0].content[0] as Element;
            expect(valueNode.name).toStrictEqual('Null');
        });
    });

    describe('record-annotation', () => {
        testConversion('record-annotation');
        describe('pointer', () => {
            test('$Type property name', async () => {
                const ast = await getAst('record-annotation');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(2, 10)
                });
                expect(pointer).toStrictEqual('/0/content/0/attributes/Type/name');
                expect(nodeRange).toEqual(Range.create(2, 8, 2, 13));
            });
            test('first record-annotation', async () => {
                const ast = await getAst('record-annotation');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(4, 24)
                });
                expect(pointer).toStrictEqual('/0/content/0/content/1/content/0/content/0/text');
                expect(nodeRange).toEqual(Range.create(4, 24, 4, 28));
            });
            test('second record-annotation', async () => {
                const ast = await getAst('record-annotation');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(5, 31)
                });
                expect(pointer).toStrictEqual('/0/content/0/content/2/$0');
                expect(nodeRange).toEqual(Range.create(5, 30, 5, 31));
            });
            test('third record-annotation with qualifier', async () => {
                const ast = await getAst('record-annotation');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(6, 30)
                });
                expect(pointer).toStrictEqual('/0/content/0/content/3/content/0/content/0/text');
                expect(nodeRange).toEqual(Range.create(6, 29, 6, 33));
            });
        });
    });

    describe('property-annotation', () => {
        testConversion('property-annotation');
        describe('pointer', () => {
            describe('property-annotation', () => {
                test('first property-annotation', async () => {
                    const ast = await getAst('property-annotation');
                    const { pointer, nodeRange } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(6, 0)
                    });
                    expect(pointer).toStrictEqual('/0/content/0/content/2/$0');
                    expect(nodeRange).toEqual(Range.create(5, 24, 11, 9));
                });

                test('second property-annotation', async () => {
                    const ast = await getAst('property-annotation');
                    const { pointer, nodeRange } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(12, 25)
                    });
                    expect(pointer).toStrictEqual('/0/content/0/content/3');
                    expect(nodeRange).toBeUndefined();
                });

                test('before property value', async () => {
                    const ast = await getAst('property-annotation');
                    const { pointer, nodeRange } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(4, 25)
                    });
                    expect(pointer).toStrictEqual('/0/content/0/content/1');
                    expect(nodeRange).toBeUndefined();
                });
            });
        });
    });

    describe('nested-record-type', () => {
        testConversion('nested-record-type');
    });

    describe('property-annotation-value-case-issue', () => {
        testConversion('property-annotation-value-case-issue');
    });

    describe('value containers', () => {
        describe('conversion', () => {
            test('number value', () => {
                const ast = parse(`UI.RecommendationState : { $value: 1 }`);
                const { terms } = toTerms(ast as Assignment, { vocabularyService });
                const valueNode = terms[0].content[0] as Element;
                expect(valueNode.name).toStrictEqual('Int');
                const textNode = valueNode.content[0] as TextNode;
                expect(textNode.text).toStrictEqual('1');
            });
            test('without specifying value', () => {
                const ast = parse(`UI.RecommendationState : { }`);
                const { terms } = toTerms(ast as Assignment, { vocabularyService });
                expect(terms[0].content.length).toStrictEqual(0);
            });
            test('annotations without specifying value', () => {
                const ast = parse(`UI.RecommendationState : { ![@Core.Description] : '' }`);
                const { terms } = toTerms(ast as Assignment, { vocabularyService });
                const annotationNode = terms[0].content[0] as Element;
                expect(annotationNode.name).toStrictEqual('Annotation');
                expect(annotationNode.attributes.Term.value).toStrictEqual('Core.Description');
            });
            test('annotations with value', () => {
                const ast = parse(`UI.RecommendationState : { $value: 1, ![@Core.Description] : '' }`);
                const { terms } = toTerms(ast as Assignment, { vocabularyService });
                const valueNode = terms[0].content[0] as Element;
                expect(valueNode.name).toStrictEqual('Int');
                const textNode = valueNode.content[0] as TextNode;
                expect(textNode.text).toStrictEqual('1');
                const annotationNode = terms[0].content[1] as Element;
                expect(annotationNode.name).toStrictEqual('Annotation');
                expect(annotationNode.attributes.Term.value).toStrictEqual('Core.Description');
            });
            test('annotation with empty value', () => {
                const ast = parse(`UI.RecommendationState : { ![] : , $value: 1}`);
                const { terms } = toTerms(ast as Assignment, { vocabularyService });
                expect(terms[0].content.length).toStrictEqual(2);
            });
            test('annotation with no term name', () => {
                const ast = parse(`UI.RecommendationState : { ![] : false, $value: 1}`);
                const { terms } = toTerms(ast as Assignment, { vocabularyService });
                expect(terms[0].content.length).toStrictEqual(2);
            });
        });
        describe('pointer', () => {
            test('inside value', () => {
                const ast = parse(`
UI.RecommendationState : { $value: 1 }`);
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(1, 35)
                });
                expect(pointer).toStrictEqual('/0/content/0/content/0/text/$0');
                expect(nodeRange).toEqual(Range.create(1, 35, 1, 36));
            });
            test('without specifying value', () => {
                const ast = parse(`
UI.RecommendationState : { }`);
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(1, 26)
                });
                expect(pointer).toStrictEqual('/0/$0');
                expect(nodeRange).toEqual(Range.create(1, 24, 1, 28));
            });
            test('term name', () => {
                const ast = parse(`
UI.RecommendationState : { ![@UI.Hidden] : false }`);
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(1, 31)
                });

                expect(pointer).toStrictEqual('/0/content/0/attributes/Term/value');
                expect(nodeRange).toEqual(Range.create(1, 27, 1, 40));
            });
            test('empty term name', () => {
                const ast = parse(`
UI.RecommendationState : { ![@] : false }`);
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(1, 30)
                });
                expect(pointer).toStrictEqual('/0/content/0/attributes/Term/value');
                expect(nodeRange).toEqual(Range.create(1, 27, 1, 31));
            });
            test('empty delimited name', () => {
                const ast = parse(`
UI.RecommendationState : { ![] : false }`);
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(1, 29)
                });
                expect(pointer).toStrictEqual('/0/content/0/attributes/Term/value');
                expect(nodeRange).toEqual(Range.create(1, 27, 1, 30));
            });
            test('in complex annotation value', () => {
                const ast = parse(`
UI.RecommendationState : { $value: 1, ![@Core.LongDescription] : {  } }`);
                const { pointer } = toTerms(ast as Assignment, { vocabularyService, position: Position.create(1, 67) });
                expect(pointer).toStrictEqual('/0/content/1/$0');
            });
            test('first of two annotations', () => {
                const ast = parse(`
UI.RecommendationState : { ![@Core.LongDescription] : {  }, $value: 1 }`);
                const { pointer } = toTerms(ast as Assignment, { vocabularyService, position: Position.create(1, 56) });
                expect(pointer).toStrictEqual('/0/content/1/$0');
            });
            test('second of two annotations', () => {
                const ast = parse(`
UI.RecommendationState : { ![@Core.LongDescription] : {  }, $value: 1, ![@Core.LongDescription] #b: {  }, }`);
                const { pointer } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(1, 102)
                });
                expect(pointer).toStrictEqual('/0/content/2/$0');
            });
            test('mixed annotation value', () => {
                const ast = parse(`
UI.RecommendationState : { ![]: , ![@Core.LongDescription] : {  }, $value: 1, ![@Core.LongDescription] #b: {  }, }`);
                const { pointer } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(1, 109)
                });
                expect(pointer).toStrictEqual('/0/content/3/$0');
            });
            test('empty term name', () => {
                const ast = parse(`
UI.RecommendationState : { ![]: , $value: 1, ![@Core.LongDescription] #b: {  }, }`);
                const { pointer } = toTerms(ast as Assignment, { vocabularyService, position: Position.create(1, 29) });
                expect(pointer).toStrictEqual('/0/content/1/attributes/Term/value');
            });
            test('empty $value', () => {
                const ast = parse(`
UI.LineItem : { $value: , ![@UI.Importance]: #aaa }`);
                const { pointer } = toTerms(ast as Assignment, { vocabularyService, position: Position.create(1, 24) });
                expect(pointer).toStrictEqual('/0/$0');
            });
            test('$value - record property in collection', () => {
                const ast = parse(`
UI.LineItem : { $value: [{$Type : 'UI.DataField', Value : 'test', Label : 'test'}]}`);
                const { pointer } = toTerms(ast as Assignment, { vocabularyService, position: Position.create(1, 66) });
                expect(pointer).toStrictEqual('/0/content/0/content/0/content/1/attributes/Property/value');
            });
            test('$value - record property without collection', () => {
                const ast = parse(`
UI.Badge : { $value: { $Type : 'UI.Badge', ImageUrl : 'test' }}`);
                const { pointer } = toTerms(ast as Assignment, { vocabularyService, position: Position.create(1, 43) });
                expect(pointer).toStrictEqual('/0/content/0/content/0/attributes/Property/value');
            });
            test('before [] brackets', () => {
                const ast = parse(`
UI.LineItem : { $value: []}`);
                const { pointer } = toTerms(ast as Assignment, { vocabularyService, position: Position.create(1, 24) });
                expect(pointer).toStrictEqual('/0/$0');
            });
        });
    });

    describe('open type property', () => {
        testConversion('open-type-property');
        describe('pointer', () => {
            describe('dynamic property value pointer', () => {
                test('term name', async () => {
                    const ast = await getAst('open-type-property');
                    const { pointer, nodeRange } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(7, 30)
                    });
                    expect(pointer).toStrictEqual(
                        '/0/content/0/content/1/content/0/content/0/content/0/attributes/Type/value'
                    );
                    expect(nodeRange).toEqual(Range.create(7, 29, 7, 41));
                });
            });
        });
    });

    describe('annotation-container', () => {
        testConversion('annotation-container');
        describe('pointer', () => {
            test('empty-value in collection', async () => {
                const ast = await getAst('annotation-container');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(2, 26)
                });
                expect(pointer).toStrictEqual('/0/content/0/$0');
                expect(nodeRange).toEqual(Range.create(2, 26, 2, 27));
            });
            test('empty-value in annotation', async () => {
                const ast = await getAst('annotation-container');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(5, 16)
                });
                expect(pointer).toStrictEqual('/1/$0');
                expect(nodeRange).toEqual(Range.create(5, 15, 6, 4));
            });
            test('empty-value in property value', async () => {
                const ast = await getAst('annotation-container');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(9, 20)
                });
                expect(pointer).toStrictEqual('/2/content/0/content/0/$0');
                expect(nodeRange).toEqual(Range.create(9, 19, 10, 8));
            });
        });
    });
    describe('apply', () => {
        testConversion('apply');
        describe('pointer', () => {
            describe('nested  elements', () => {
                test('Apply element name', async () => {
                    const ast = await getAst('apply');
                    const { pointer } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(7, 25)
                    });
                    expect(pointer).toStrictEqual('/0/content/0/content/1/content/0/name');
                });
                test('Function attribute name', async () => {
                    const ast = await getAst('apply');
                    const { pointer } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(8, 25)
                    });
                    expect(pointer).toStrictEqual('/0/content/0/content/1/content/0/attributes/Function/name');
                });
                test('Path element name', async () => {
                    const ast = await getAst('apply');
                    const { pointer } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(7, 36)
                    });
                    expect(pointer).toStrictEqual('/0/content/0/content/1/content/0/content/0/name');
                });
                test('before element name', async () => {
                    const ast = await getAst('apply');
                    const { pointer } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(6, 39)
                    });
                    expect(pointer).toStrictEqual('/0/content/0/content/1/$0');
                });
                test('after element name', async () => {
                    const ast = await getAst('apply');
                    const { pointer } = toTerms(ast as Assignment, {
                        vocabularyService,
                        position: Position.create(11, 11)
                    });
                    expect(pointer).toStrictEqual('/0/content/0/content/1/attributes');
                });
            });
            test('Apply element name', async () => {
                const ast = await getAst('apply');
                const { pointer } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(3, 13)
                });
                expect(pointer).toStrictEqual('/0/content/0/name');
            });
            test('Function attribute name', async () => {
                const ast = await getAst('apply');
                const { pointer } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(13, 13)
                });
                expect(pointer).toStrictEqual('/0/content/0/attributes/Function/name');
            });

            test('Function attribute value', async () => {
                const ast = await getAst('apply');
                const { pointer } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(13, 25)
                });
                expect(pointer).toStrictEqual('/0/content/0/attributes/Function/value');
            });
            test('Function attribute empty value', async () => {
                const ast = await getAst('apply');
                const { pointer } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(23, 24)
                });
                expect(pointer).toStrictEqual('/1/content/0/attributes/Function/value');
            });
            test('before first parameter', async () => {
                const ast = await getAst('apply');
                const { pointer } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(4, 16)
                });
                expect(pointer).toStrictEqual('/0/content/0/$0');
            });
            test('in first parameter', async () => {
                const ast = await getAst('apply');
                const { pointer } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(4, 18)
                });
                expect(pointer).toStrictEqual('/0/content/0/content/0/content/0/text/$1');
            });
            test('in Path element name', async () => {
                const ast = await getAst('apply');
                const { pointer } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(21, 18)
                });
                expect(pointer).toStrictEqual('/1/content/0/content/2/name');
            });
            test('in Path element value', async () => {
                const ast = await getAst('apply');
                const { pointer } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(21, 29)
                });
                expect(pointer).toStrictEqual('/1/content/0/content/2/content/0/text/$3');
            });
        });
    });

    describe('json', () => {
        testConversion('json');
        describe('pointer', () => {
            test('empty value', async () => {
                const ast = await getAst('json');
                const { pointer } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(2, 21)
                });
                expect(pointer).toStrictEqual('/0/$0');
            });
            test('empty container', async () => {
                const ast = await getAst('json');
                const { pointer } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(5, 23)
                });
                expect(pointer).toStrictEqual('/1/$0');
            });
            test('empty element content as array', async () => {
                const ast = await getAst('json');
                const { pointer } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(8, 32)
                });
                expect(pointer).toStrictEqual('/2/content/0/$0');
            });
            test('before element name', async () => {
                const ast = await getAst('json');
                const { pointer } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(8, 22)
                });
                expect(pointer).toStrictEqual('/2/$0');
            });
            test('after first parameter', async () => {
                const ast = await getAst('json');
                const { pointer } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(11, 37)
                });
                expect(pointer).toStrictEqual('/3/content/0/$1');
            });
            test('attribute content', async () => {
                const ast = await getAst('json');
                const { pointer } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(11, 40)
                });
                expect(pointer).toStrictEqual('/3/content/0/attributes');
            });
            test('attribute content single element container', async () => {
                const ast = await getAst('json');
                const { pointer } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(20, 35)
                });
                expect(pointer).toStrictEqual('/6/content/0/attributes');
            });
        });
    });

    describe('SideEffects TargetProperties', () => {
        testConversion('side-effects-target-properties');
        describe('pointer', () => {
            test('term name', async () => {
                const ast = await getAst('side-effects-target-properties');
                //console.log(ast);
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(4, 13)
                });
                expect(pointer).toStrictEqual('/0/content/0/content/0/content/0/content/0/content/0/text/$0');
                expect(nodeRange).toEqual(Range.create(4, 13, 4, 23));
            });
        });
    });

    describe('flattened property segment', () => {
        testConversion('flattened-property-segment');
        describe('pointer', () => {
            test('after . in property name', async () => {
                const ast = await getAst('flattened-property-segment');
                const { pointer, nodeRange } = toTerms(ast as Assignment, {
                    vocabularyService,
                    position: Position.create(1, 16)
                });

                expect(pointer).toStrictEqual('/0/content/0/content/0/content/0/content/0/attributes/Property/value');
                expect(nodeRange).toEqual(Range.create(1, 16, 1, 16));
            });
        });
    });

    describe('record', () => {
        describe('conversion', () => {
            test('$type typo', () => {
                const ast = parse(`a : { $type: 'abc' }`);
                const { terms } = toTerms(ast as Assignment, { vocabularyService });
                const valueNode = terms[0].content[0] as Element;
                expect(valueNode.name).toStrictEqual('Record');
                expect(valueNode.attributes).toStrictEqual({});
            });
        });
    });

    describe('array spread operator', () => {
        testConversion('array-spread-operator');
    });

    describe('multi line string', () => {
        testConversion('multi-line-string');
    });
    describe('timestamp', () => {
        testConversion('timestamp');
    });
    describe('navigation-path', () => {
        testConversion('navigation-path');
    });
    describe('side-effects-flat', () => {
        testConversion('side-effects-flat');
    });
    describe('expression', () => {
        testConversion('expression');
    });
});

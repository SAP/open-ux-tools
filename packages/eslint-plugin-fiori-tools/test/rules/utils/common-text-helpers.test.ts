import { parseCommonTextAnnotationKey } from '../../../src/rules/utils/common-text-helpers';

describe('parseCommonTextAnnotationKey', () => {
    const relevantEntityTypes = new Map<string, string[]>([
        ['Service.Entity', ['MainPage']],
        ['Service.Other', ['OtherPage', 'SecondPage']]
    ]);

    describe('when the annotation key does not contain /@', () => {
        it('should return undefined', () => {
            // given
            const annotationKey = 'Service.Entity/property/Common.Text';
            // when
            const result = parseCommonTextAnnotationKey(annotationKey, relevantEntityTypes);
            // then
            expect(result).toBeUndefined();
        });
    });

    describe('when the term is not Common.Text', () => {
        it('should return undefined for a different term', () => {
            // given
            const annotationKey = 'Service.Entity/property/@Common.Label';
            // when
            const result = parseCommonTextAnnotationKey(annotationKey, relevantEntityTypes);
            // then
            expect(result).toBeUndefined();
        });

        it('should return undefined for UI.TextArrangement', () => {
            // given
            const annotationKey = 'Service.Entity/@com.sap.vocabularies.UI.v1.TextArrangement';
            // when
            const result = parseCommonTextAnnotationKey(annotationKey, relevantEntityTypes);
            // then
            expect(result).toBeUndefined();
        });
    });

    describe('when the target path has no / (entity-type level, not property level)', () => {
        it('should return undefined', () => {
            // given
            const annotationKey = 'Service.Entity/@Common.Text';
            // when
            const result = parseCommonTextAnnotationKey(annotationKey, relevantEntityTypes);
            // then
            expect(result).toBeUndefined();
        });
    });

    describe('when the entity type is not in relevantEntityTypes', () => {
        it('should return undefined', () => {
            // given
            const annotationKey = 'Service.Unknown/property/@Common.Text';
            // when
            const result = parseCommonTextAnnotationKey(annotationKey, relevantEntityTypes);
            // then
            expect(result).toBeUndefined();
        });
    });

    describe('when the annotation key is a valid property-level Common.Text for a known entity type', () => {
        it('should return the parsed targetPath, entityTypeName and pageNames', () => {
            // given
            const annotationKey = 'Service.Entity/property/@Common.Text';
            // when
            const result = parseCommonTextAnnotationKey(annotationKey, relevantEntityTypes);
            // then
            expect(result).toEqual({
                targetPath: 'Service.Entity/property',
                entityTypeName: 'Service.Entity',
                pageNames: ['MainPage']
            });
        });

        it('should return all page names when the entity type appears on multiple pages', () => {
            // given
            const annotationKey = 'Service.Other/prop/@Common.Text';
            // when
            const result = parseCommonTextAnnotationKey(annotationKey, relevantEntityTypes);
            // then
            expect(result).toEqual({
                targetPath: 'Service.Other/prop',
                entityTypeName: 'Service.Other',
                pageNames: ['OtherPage', 'SecondPage']
            });
        });
    });
});

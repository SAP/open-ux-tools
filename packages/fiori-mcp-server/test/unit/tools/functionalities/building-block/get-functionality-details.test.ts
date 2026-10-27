import { describe, expect, it } from '@jest/globals';
import {
    BuildingBlockType,
    MIN_UI5_VERSION_RICH_TEXT_EDITOR,
    MIN_UI5_VERSION_PAGE_BUILDING_BLOCK,
    MIN_UI5_VERSION_PAGE_BUILDING_BLOCK_FULL_LAYOUT
} from '@sap-ux/fe-fpm-writer';
import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI.js';
import { ADD_BUILDING_BLOCK_FUNCTIONALITY } from '../../../../../src/tools/functionalities/building-block/get-functionality-details.js';
import {
    AGGREGATION_PARENT_MACRO,
    ANNOTATION_SHELL_TERMS,
    BB_TYPE_MIN_UI5_VERSION,
    toDisplayName
} from '../../../../../src/tools/functionalities/building-block/utils.js';

/**
 * Guards BB_TYPE_DOCS_NOTE and ADD_BUILDING_BLOCK_FUNCTIONALITY.description against drift
 * from the actual constants they describe. If a new BB type, annotation shell type, or
 * version-gated type is added without updating the description, these tests fail at CI time.
 */
describe('ADD_BUILDING_BLOCK_FUNCTIONALITY description drift guard', () => {
    const description = ADD_BUILDING_BLOCK_FUNCTIONALITY.description;

    it('mentions every aggregation child type as a PascalCase display name', () => {
        for (const childType of Object.keys(AGGREGATION_PARENT_MACRO)) {
            expect(description).toContain(toDisplayName(childType));
        }
    });

    it('mentions every parent macro name from AGGREGATION_PARENT_MACRO', () => {
        const uniqueParentMacros = [...new Set(Object.values(AGGREGATION_PARENT_MACRO))];
        for (const parent of uniqueParentMacros) {
            expect(description).toContain(parent);
        }
    });

    it('mentions every annotation shell type as a PascalCase display name', () => {
        for (const bbType of Object.keys(ANNOTATION_SHELL_TERMS)) {
            expect(description).toContain(toDisplayName(bbType));
        }
    });

    it('mentions the annotation shell terms using their fully qualified OData names', () => {
        expect(description).toContain(UIAnnotationTerms.LineItem);
        expect(description).toContain(UIAnnotationTerms.SelectionFields);
        expect(description).toContain(UIAnnotationTerms.FieldGroup);
    });

    it('mentions the correct minimum UI5 version for every version-gated type', () => {
        for (const [type, requirement] of Object.entries(BB_TYPE_MIN_UI5_VERSION)) {
            expect(description).toContain(toDisplayName(type));
            expect(description).toContain(requirement.minVersion);
            if (requirement.fullLayoutVersion) {
                expect(description).toContain(requirement.fullLayoutVersion);
            }
        }
    });

    it('mentions the RichTextEditor version from the constant, not a hardcoded string', () => {
        expect(description).toContain(MIN_UI5_VERSION_RICH_TEXT_EDITOR);
    });

    it('mentions the Page building block version thresholds', () => {
        expect(description).toContain(MIN_UI5_VERSION_PAGE_BUILDING_BLOCK);
        expect(description).toContain(MIN_UI5_VERSION_PAGE_BUILDING_BLOCK_FULL_LAYOUT);
    });
});

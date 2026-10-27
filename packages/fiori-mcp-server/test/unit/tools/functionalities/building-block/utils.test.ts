import { describe, expect, it } from '@jest/globals';
import {
    entitySetFromContextPath,
    entitySetFromMetaPath,
    qualifierFromMetaPath,
    AGGREGATION_PARENT_MACRO
} from '../../../../../src/tools/functionalities/building-block/utils.js';
import { BuildingBlockType } from '@sap-ux/fe-fpm-writer';

describe('entitySetFromContextPath', () => {
    it('extracts entity set from simple /Entity path', () => {
        expect(entitySetFromContextPath('/Products')).toBe('Products');
    });

    it('extracts entity set from /Container/Entity path', () => {
        expect(entitySetFromContextPath('/Container/Products')).toBe('Products');
    });

    it('returns last segment for any depth', () => {
        expect(entitySetFromContextPath('/a/b/c')).toBe('c');
    });
});

describe('qualifierFromMetaPath', () => {
    it('returns qualifier after # in metaPath', () => {
        expect(qualifierFromMetaPath('@com.sap.vocabularies.UI.v1.LineItem#myQualifier')).toBe('myQualifier');
    });

    it('returns empty string when no qualifier in metaPath', () => {
        expect(qualifierFromMetaPath('@com.sap.vocabularies.UI.v1.LineItem')).toBe('');
    });

    it('returns empty string when metaPath is undefined', () => {
        expect(qualifierFromMetaPath(undefined)).toBe('');
    });
});

describe('entitySetFromMetaPath', () => {
    it('extracts entity from relative nav path: to_Booking/@term#qualifier', () => {
        expect(entitySetFromMetaPath('to_Booking/@com.sap.vocabularies.UI.v1.LineItem#tableMacro')).toBe('to_Booking');
    });

    it('extracts entity from absolute path: /Countries/@term#qualifier', () => {
        expect(entitySetFromMetaPath('/Countries/@com.sap.vocabularies.UI.v1.LineItem#tableMacro')).toBe('Countries');
    });

    it('returns undefined when metaPath starts with @ (no entity prefix)', () => {
        expect(entitySetFromMetaPath('@com.sap.vocabularies.UI.v1.FieldGroup#formMacro')).toBeUndefined();
    });

    it('returns undefined when metaPath is undefined', () => {
        expect(entitySetFromMetaPath(undefined)).toBeUndefined();
    });
});

describe('AGGREGATION_PARENT_MACRO', () => {
    it('maps CustomColumn to Table', () => {
        expect(AGGREGATION_PARENT_MACRO[BuildingBlockType.CustomColumn]).toBe('Table');
    });

    it('maps Action to Table', () => {
        expect(AGGREGATION_PARENT_MACRO[BuildingBlockType.Action]).toBe('Table');
    });

    it('maps CustomFilterField to FilterBar', () => {
        expect(AGGREGATION_PARENT_MACRO[BuildingBlockType.CustomFilterField]).toBe('FilterBar');
    });

    it('maps CustomFormField to Form', () => {
        expect(AGGREGATION_PARENT_MACRO[BuildingBlockType.CustomFormField]).toBe('Form');
    });

    it('maps RichTextEditorButtonGroups to RichTextEditorWithMetadata', () => {
        expect(AGGREGATION_PARENT_MACRO[BuildingBlockType.RichTextEditorButtonGroups]).toBe(
            'RichTextEditorWithMetadata'
        );
    });
});

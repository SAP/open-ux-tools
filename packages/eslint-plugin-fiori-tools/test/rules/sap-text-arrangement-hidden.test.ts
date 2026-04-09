import { RuleTester } from 'eslint';
import textArrangementHiddenRule from '../../src/rules/sap-text-arrangement-hidden';
import { meta, languages } from '../../src/index';
import { TEXT_ARRANGEMENT_HIDDEN } from '../../src/language/diagnostics';
import { getAnnotationsAsXmlCode, setup, V4_ANNOTATIONS, V4_ANNOTATIONS_PATH } from '../test-helper';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-text-arrangement-hidden';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

// Annotation blocks used by tests

const TEXT_ARRANGEMENT_WITH_HIDDEN_TEXT_PROPERTY = `
    <Annotations Target="IncidentService.Incidents/category_code">
        <Annotation Term="Common.Text" Path="category/name">
            <Annotation Term="UI.TextArrangement" EnumMember="UI.TextArrangementType/TextFirst"/>
        </Annotation>
    </Annotations>
    <Annotations Target="IncidentService.Category/name">
        <Annotation Term="UI.Hidden"/>
    </Annotations>`;

const TEXT_ARRANGEMENT_WITH_EXPLICITLY_HIDDEN_TEXT_PROPERTY = `
    <Annotations Target="IncidentService.Incidents/category_code">
        <Annotation Term="Common.Text" Path="category/name">
            <Annotation Term="UI.TextArrangement" EnumMember="UI.TextArrangementType/TextFirst"/>
        </Annotation>
    </Annotations>
    <Annotations Target="IncidentService.Category/name">
        <Annotation Term="UI.Hidden" Bool="true"/>
    </Annotations>`;

const TEXT_ARRANGEMENT_WITH_NOT_HIDDEN_TEXT_PROPERTY = `
    <Annotations Target="IncidentService.Incidents/category_code">
        <Annotation Term="Common.Text" Path="category/name">
            <Annotation Term="UI.TextArrangement" EnumMember="UI.TextArrangementType/TextFirst"/>
        </Annotation>
    </Annotations>
    <Annotations Target="IncidentService.Category/name">
        <Annotation Term="UI.Hidden" Bool="false"/>
    </Annotations>`;

const TEXT_ARRANGEMENT_WITH_DYNAMIC_HIDDEN = `
    <Annotations Target="IncidentService.Incidents/category_code">
        <Annotation Term="Common.Text" Path="category/name">
            <Annotation Term="UI.TextArrangement" EnumMember="UI.TextArrangementType/TextFirst"/>
        </Annotation>
    </Annotations>
    <Annotations Target="IncidentService.Category/name">
        <Annotation Term="UI.Hidden" Path="IsHidden"/>
    </Annotations>`;

const COMMON_TEXT_WITHOUT_TEXT_ARRANGEMENT = `
    <Annotations Target="IncidentService.Incidents/category_code">
        <Annotation Term="Common.Text" Path="category/name"/>
    </Annotations>`;

const TEXT_ARRANGEMENT_WITHOUT_HIDDEN = `
    <Annotations Target="IncidentService.Incidents/category_code">
        <Annotation Term="Common.Text" Path="category/name">
            <Annotation Term="UI.TextArrangement" EnumMember="UI.TextArrangementType/TextFirst"/>
        </Annotation>
    </Annotations>`;

// Common.Text without TextArrangement - should not be flagged
// Uses Incidents/description as the hidden target, which is not referenced
// by any existing UI.TextArrangement+Common.Text in the test metadata
const COMMON_TEXT_ONLY_WITH_HIDDEN = `
    <Annotations Target="IncidentService.Incidents/title">
        <Annotation Term="Common.Text" Path="description"/>
    </Annotations>
    <Annotations Target="IncidentService.Incidents/description">
        <Annotation Term="UI.Hidden"/>
    </Annotations>`;

// UI.TextArrangement applied at entity-type level triggers check for all Common.Text properties
// on that entity type (fallback when no inline TextArrangement is present in Common.Text)
const TEXT_ARRANGEMENT_ENTITY_TYPE_LEVEL_WITH_HIDDEN = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.TextArrangement" EnumMember="UI.TextArrangementType/TextFirst"/>
    </Annotations>
    <Annotations Target="IncidentService.Incidents/title">
        <Annotation Term="Common.Text" Path="description"/>
    </Annotations>
    <Annotations Target="IncidentService.Incidents/description">
        <Annotation Term="UI.Hidden"/>
    </Annotations>`;

const TEXT_ARRANGEMENT_ENTITY_TYPE_LEVEL_WITHOUT_HIDDEN = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.TextArrangement" EnumMember="UI.TextArrangementType/TextFirst"/>
    </Annotations>
    <Annotations Target="IncidentService.Incidents/title">
        <Annotation Term="Common.Text" Path="description"/>
    </Annotations>`;

// Priority entity set is not on any page in the manifest — should never be flagged
// even though the pattern (inline TA + hidden text property) would otherwise be invalid
const TEXT_ARRANGEMENT_ENTITY_TYPE_NOT_ON_PAGE = `
    <Annotations Target="IncidentService.Priority/code">
        <Annotation Term="Common.Text" Path="name">
            <Annotation Term="UI.TextArrangement" EnumMember="UI.TextArrangementType/TextFirst"/>
        </Annotation>
    </Annotations>
    <Annotations Target="IncidentService.Priority/name">
        <Annotation Term="UI.Hidden"/>
    </Annotations>`;

ruleTester.run(TEST_NAME, textArrangementHiddenRule, {
    valid: [
        createValidTest(
            {
                name: 'no text arrangement annotation',
                filename: V4_ANNOTATIONS_PATH,
                code: V4_ANNOTATIONS
            },
            []
        ),
        createValidTest(
            {
                name: 'text arrangement with text property not hidden',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, TEXT_ARRANGEMENT_WITHOUT_HIDDEN)
            },
            []
        ),
        createValidTest(
            {
                name: 'Common.Text without inline TextArrangement - not flagged',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, COMMON_TEXT_WITHOUT_TEXT_ARRANGEMENT)
            },
            []
        ),
        createValidTest(
            {
                name: 'text property hidden explicitly set to false',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, TEXT_ARRANGEMENT_WITH_NOT_HIDDEN_TEXT_PROPERTY)
            },
            []
        ),
        createValidTest(
            {
                name: 'Common.Text without TextArrangement - hidden text property is not flagged',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, COMMON_TEXT_ONLY_WITH_HIDDEN)
            },
            []
        ),
        createValidTest(
            {
                name: 'entity-type level TextArrangement with text property not hidden',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, TEXT_ARRANGEMENT_ENTITY_TYPE_LEVEL_WITHOUT_HIDDEN)
            },
            []
        ),
        createValidTest(
            {
                name: 'entity type not used on any page - not flagged',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, TEXT_ARRANGEMENT_ENTITY_TYPE_NOT_ON_PAGE)
            },
            []
        )
    ],

    invalid: [
        createInvalidTest(
            {
                name: 'text property hidden via dynamic path expression',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, TEXT_ARRANGEMENT_WITH_DYNAMIC_HIDDEN),
                errors: [{ messageId: TEXT_ARRANGEMENT_HIDDEN }]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'text property referenced via Common.Text is hidden (default true)',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, TEXT_ARRANGEMENT_WITH_HIDDEN_TEXT_PROPERTY),
                errors: [
                    {
                        messageId: TEXT_ARRANGEMENT_HIDDEN
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'text property referenced via Common.Text is hidden (Bool=true)',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, TEXT_ARRANGEMENT_WITH_EXPLICITLY_HIDDEN_TEXT_PROPERTY),
                errors: [
                    {
                        messageId: TEXT_ARRANGEMENT_HIDDEN
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'entity-type level TextArrangement with hidden text property',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, TEXT_ARRANGEMENT_ENTITY_TYPE_LEVEL_WITH_HIDDEN),
                errors: [
                    {
                        messageId: TEXT_ARRANGEMENT_HIDDEN
                    }
                ]
            },
            []
        )
    ]
});

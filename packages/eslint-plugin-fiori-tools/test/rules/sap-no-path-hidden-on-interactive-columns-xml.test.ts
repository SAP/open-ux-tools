import { RuleTester } from 'eslint';
import noPathHiddenOnInteractiveColumnsRule from '../../src/rules/sap-no-path-hidden-on-interactive-columns.js';
import { meta, languages } from '../../src/index.js';
import {
    getAnnotationsAsXmlCode,
    setup,
    V4_ANNOTATIONS,
    V4_ANNOTATIONS_PATH,
    V2_ANNOTATIONS,
    V2_ANNOTATIONS_PATH
} from '../test-helper.js';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-no-path-hidden-on-interactive-columns';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

/**
 * Injects an Org.OData.Capabilities.V1 reference into an annotation XML string
 * so the `Capabilities` alias resolves during indexing.
 */
function addCapabilitiesRef(annotations: string): string {
    return annotations.replace(
        '<edmx:DataServices>',
        '<edmx:Reference Uri="https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Capabilities.V1.xml">' +
            '<edmx:Include Namespace="Org.OData.Capabilities.V1" Alias="Capabilities"/>' +
            '</edmx:Reference>\n    <edmx:DataServices>'
    );
}

const V4_ANNOTATIONS_WITH_CAPS = addCapabilitiesRef(V4_ANNOTATIONS);
const V2_ANNOTATIONS_WITH_CAPS = addCapabilitiesRef(V2_ANNOTATIONS);

// ── V4 snippets ──────────────────────────────────────────────────────────────

const V4_LINE_ITEM_STATIC_HIDDEN = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataField">
                    <PropertyValue Property="Value" Path="title"/>
                    <Annotation Term="UI.Hidden" Bool="true"/>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

const V4_LINE_ITEM_DYNAMIC_HIDDEN_VIOLATION = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataField">
                    <PropertyValue Property="Value" Path="title"/>
                    <Annotation Term="UI.Hidden" Path="isHidden"/>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

const V4_LINE_ITEM_DYNAMIC_HIDDEN_BOTH_RESTRICTED = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="Capabilities.SortRestrictions">
            <Record>
                <PropertyValue Property="NonSortableProperties">
                    <Collection>
                        <PropertyPath>title</PropertyPath>
                    </Collection>
                </PropertyValue>
            </Record>
        </Annotation>
        <Annotation Term="Capabilities.FilterRestrictions">
            <Record>
                <PropertyValue Property="NonFilterableProperties">
                    <Collection>
                        <PropertyPath>title</PropertyPath>
                    </Collection>
                </PropertyValue>
            </Record>
        </Annotation>
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataField">
                    <PropertyValue Property="Value" Path="title"/>
                    <Annotation Term="UI.Hidden" Path="isHidden"/>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

const V4_LINE_ITEM_DYNAMIC_HIDDEN_SORT_ONLY_RESTRICTED = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="Capabilities.SortRestrictions">
            <Record>
                <PropertyValue Property="NonSortableProperties">
                    <Collection>
                        <PropertyPath>title</PropertyPath>
                    </Collection>
                </PropertyValue>
            </Record>
        </Annotation>
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataField">
                    <PropertyValue Property="Value" Path="title"/>
                    <Annotation Term="UI.Hidden" Path="isHidden"/>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

const V4_LINE_ITEM_QUALIFIED_DYNAMIC_HIDDEN = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.LineItem" Qualifier="altTable">
            <Collection>
                <Record Type="UI.DataField">
                    <PropertyValue Property="Value" Path="description"/>
                    <Annotation Term="UI.Hidden" Path="isHidden"/>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

// ── V2 snippets ──────────────────────────────────────────────────────────────

const V2_LINE_ITEM_DYNAMIC_HIDDEN_VIOLATION = `
    <Annotations Target="TECHED_ALP_SOA_SRV.Z_SEPMRA_SO_SALESORDERANALYSISType">
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataField">
                    <PropertyValue Property="Value" Path="DeliveryCalendarYear"/>
                    <Annotation Term="UI.Hidden" Path="HideColumn"/>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

const V2_LINE_ITEM_STATIC_HIDDEN = `
    <Annotations Target="TECHED_ALP_SOA_SRV.Z_SEPMRA_SO_SALESORDERANALYSISType">
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataField">
                    <PropertyValue Property="Value" Path="DeliveryCalendarYear"/>
                    <Annotation Term="UI.Hidden" Bool="true"/>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

// ─────────────────────────────────────────────────────────────────────────────

ruleTester.run(TEST_NAME, noPathHiddenOnInteractiveColumnsRule, {
    valid: [
        createValidTest(
            {
                name: 'non XML file - json',
                filename: 'some-other-file.json',
                code: '{}'
            },
            []
        ),
        createValidTest(
            {
                name: 'V4: no UI.Hidden annotation',
                filename: V4_ANNOTATIONS_PATH,
                code: V4_ANNOTATIONS
            },
            []
        ),
        createValidTest(
            {
                name: 'V4: static UI.Hidden Bool=true on column',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_LINE_ITEM_STATIC_HIDDEN)
            },
            []
        ),
        createValidTest(
            {
                name: 'V4: dynamic UI.Hidden but column restricted for both sort and filter',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS_WITH_CAPS, V4_LINE_ITEM_DYNAMIC_HIDDEN_BOTH_RESTRICTED)
            },
            []
        ),
        createValidTest(
            {
                name: 'V2: no UI.Hidden annotation',
                filename: V2_ANNOTATIONS_PATH,
                code: V2_ANNOTATIONS
            },
            []
        ),
        createValidTest(
            {
                name: 'V2: static UI.Hidden Bool=true on column',
                filename: V2_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V2_ANNOTATIONS, V2_LINE_ITEM_STATIC_HIDDEN)
            },
            []
        )
    ],

    invalid: [
        createInvalidTest(
            {
                name: 'V4: dynamic UI.Hidden on interactive column (no capabilities)',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_LINE_ITEM_DYNAMIC_HIDDEN_VIOLATION),
                errors: [
                    {
                        message:
                            'UI.Hidden with a path-based value must not be used on a sortable or filterable column. Use a static UI.Hidden or restrict sorting and filtering via Capabilities annotations.'
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V4: dynamic UI.Hidden on column restricted for sort only (still filterable)',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(
                    V4_ANNOTATIONS_WITH_CAPS,
                    V4_LINE_ITEM_DYNAMIC_HIDDEN_SORT_ONLY_RESTRICTED
                ),
                errors: [
                    {
                        message:
                            'UI.Hidden with a path-based value must not be used on a sortable or filterable column. Use a static UI.Hidden or restrict sorting and filtering via Capabilities annotations.'
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V4: qualified UI.LineItem with dynamic UI.Hidden on interactive column',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_LINE_ITEM_QUALIFIED_DYNAMIC_HIDDEN),
                errors: [
                    {
                        message:
                            'UI.Hidden with a path-based value must not be used on a sortable or filterable column. Use a static UI.Hidden or restrict sorting and filtering via Capabilities annotations.'
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V2: dynamic UI.Hidden on interactive column (no capabilities)',
                filename: V2_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V2_ANNOTATIONS, V2_LINE_ITEM_DYNAMIC_HIDDEN_VIOLATION),
                errors: [
                    {
                        message:
                            'UI.Hidden with a path-based value must not be used on a sortable or filterable column. Use a static UI.Hidden or restrict sorting and filtering via Capabilities annotations.'
                    }
                ]
            },
            []
        )
    ]
});

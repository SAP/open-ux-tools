import { RuleTester } from 'eslint';
import fieldGroupInTableTypeRestrictionRule from '../../src/rules/sap-field-group-in-table-type-restriction.js';
import { meta, languages } from '../../src/index.js';
import {
    getAnnotationsAsXmlCode,
    getManifestAsCode,
    setup,
    V2_ANNOTATIONS,
    V2_ANNOTATIONS_PATH,
    V2_MANIFEST,
    V2_MANIFEST_PATH,
    V4_ANNOTATIONS,
    V4_ANNOTATIONS_PATH,
    V4_MANIFEST,
    V4_MANIFEST_PATH
} from '../test-helper.js';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-field-group-in-table-type-restriction';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

// IncidentService.Incidents LineItem with DataFieldForAnnotation targeting FieldGroup
const V4_INCIDENTS_LINEITEM_WITH_FIELDGROUP = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataFieldForAnnotation">
                    <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#IncidentData"/>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

// IncidentService.Incidents LineItem with only regular DataFields — no FieldGroup
const V4_INCIDENTS_LINEITEM_NO_FIELDGROUP = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataField">
                    <PropertyValue Property="Value" Path="title"/>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

// IncidentService.Incidents LineItem with DataFieldForAnnotation NOT targeting FieldGroup
const V4_INCIDENTS_LINEITEM_WITH_OTHER_ANNOTATION = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataFieldForAnnotation">
                    <PropertyValue Property="Target" AnnotationPath="@UI.Chart#SomeChart"/>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

// V2 LineItem with DataFieldForAnnotation targeting FieldGroup
const V2_LINEITEM_WITH_FIELDGROUP = `
    <Annotations Target="TECHED_ALP_SOA_SRV.Z_SEPMRA_SO_SALESORDERANALYSISType">
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataFieldForAnnotation">
                    <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#SalesData"/>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;

// IncidentService.Incidents LineItem with two DataFieldForAnnotation entries targeting FieldGroup
const V4_INCIDENTS_LINEITEM_WITH_TWO_FIELDGROUPS = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.LineItem">
            <Collection>
                <Record Type="UI.DataFieldForAnnotation">
                    <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#GroupA"/>
                </Record>
                <Record Type="UI.DataFieldForAnnotation">
                    <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#GroupB"/>
                </Record>
            </Collection>
        </Annotation>
    </Annotations>`;
const V4_MANIFEST_WITH_GRID_TABLE = getManifestAsCode(V4_MANIFEST, [
    {
        path: [
            'sap.ui5',
            'routing',
            'targets',
            'IncidentsList',
            'options',
            'settings',
            'controlConfiguration',
            '@com.sap.vocabularies.UI.v1.LineItem',
            'tableSettings',
            'type'
        ],
        value: 'GridTable'
    }
]);

// V4 manifest: switch IncidentsList to AnalyticalTable
const V4_MANIFEST_WITH_ANALYTICAL_TABLE = getManifestAsCode(V4_MANIFEST, [
    {
        path: [
            'sap.ui5',
            'routing',
            'targets',
            'IncidentsList',
            'options',
            'settings',
            'controlConfiguration',
            '@com.sap.vocabularies.UI.v1.LineItem',
            'tableSettings',
            'type'
        ],
        value: 'AnalyticalTable'
    }
]);

// V2 manifest: set GridTable on AnalyticalListPage
const V2_MANIFEST_WITH_GRID_TABLE = getManifestAsCode(V2_MANIFEST, [
    {
        path: [
            'sap.ui.generic.app',
            'pages',
            'AnalyticalListPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
            'component',
            'settings',
            'tableSettings',
            'type'
        ],
        value: 'GridTable'
    }
]);

ruleTester.run(TEST_NAME, fieldGroupInTableTypeRestrictionRule, {
    valid: [
        createValidTest(
            {
                name: 'V4: no annotation',
                filename: V4_ANNOTATIONS_PATH,
                code: V4_ANNOTATIONS
            },
            []
        ),
        createValidTest(
            {
                name: 'V4: DataFieldForAnnotation targeting FieldGroup in ResponsiveTable (default)',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_INCIDENTS_LINEITEM_WITH_FIELDGROUP)
            },
            []
        ),
        createValidTest(
            {
                name: 'V4: GridTable with only DataField entries — no FieldGroup reference',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_INCIDENTS_LINEITEM_NO_FIELDGROUP)
            },
            [{ filename: V4_MANIFEST_PATH, code: V4_MANIFEST_WITH_GRID_TABLE }]
        ),
        createValidTest(
            {
                name: 'V4: GridTable with DataFieldForAnnotation targeting non-FieldGroup annotation',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_INCIDENTS_LINEITEM_WITH_OTHER_ANNOTATION)
            },
            [{ filename: V4_MANIFEST_PATH, code: V4_MANIFEST_WITH_GRID_TABLE }]
        ),
        createValidTest(
            {
                name: 'V2: no annotation',
                filename: V2_ANNOTATIONS_PATH,
                code: V2_ANNOTATIONS
            },
            []
        ),
        createValidTest(
            {
                name: 'V2: DataFieldForAnnotation targeting FieldGroup without configured table type',
                filename: V2_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V2_ANNOTATIONS, V2_LINEITEM_WITH_FIELDGROUP)
            },
            []
        )
    ],
    invalid: [
        createInvalidTest(
            {
                name: 'V4: DataFieldForAnnotation targeting FieldGroup in GridTable',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_INCIDENTS_LINEITEM_WITH_FIELDGROUP),
                errors: [{ messageId: TEST_NAME }]
            },
            [{ filename: V4_MANIFEST_PATH, code: V4_MANIFEST_WITH_GRID_TABLE }]
        ),
        createInvalidTest(
            {
                name: 'V4: DataFieldForAnnotation targeting FieldGroup in AnalyticalTable',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_INCIDENTS_LINEITEM_WITH_TWO_FIELDGROUPS),
                errors: [{ messageId: TEST_NAME }, { messageId: TEST_NAME }]
            },
            [{ filename: V4_MANIFEST_PATH, code: V4_MANIFEST_WITH_ANALYTICAL_TABLE }]
        ),
        createInvalidTest(
            {
                name: 'V2: DataFieldForAnnotation targeting FieldGroup in GridTable',
                filename: V2_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V2_ANNOTATIONS, V2_LINEITEM_WITH_FIELDGROUP),
                errors: [{ messageId: TEST_NAME }]
            },
            [{ filename: V2_MANIFEST_PATH, code: V2_MANIFEST_WITH_GRID_TABLE }]
        )
    ]
});

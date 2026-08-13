# Annotation Rule — Fast Path

## Read all of these in parallel (one turn):

1. `packages/eslint-plugin-fiori-tools/src/language/diagnostics.ts`
2. `packages/eslint-plugin-fiori-tools/src/rules/sap-no-data-field-intent-based-navigation.ts`
3. `packages/eslint-plugin-fiori-tools/src/project-context/linker/annotations.ts` — provides `getRecordType`, `elementsWithName`
4. `packages/eslint-plugin-fiori-tools/src/project-context/parser/service.ts` — `buildAnnotationIndexKey` shows annotation index key format: `"target/@fullyQualifiedTerm"`
5. `packages/eslint-plugin-fiori-tools/src/rules/index.ts`
6. `packages/eslint-plugin-fiori-tools/src/index.ts`
7. `packages/eslint-plugin-fiori-tools/test/test-helper.ts`
8. `packages/eslint-plugin-fiori-tools/test/rules/sap-no-data-field-intent-based-navigation-xml.test.ts`

For rules with nested AST walks, also read `src/rules/sap-no-single-facet-in-collection.ts`.

## Pre-flight checklist (read before writing `check()`):

- ✅ **Go through application pages first** — use `linkedModel.apps` to iterate over apps, then `app.pages`
- ✅ Use `index.apps[appKey]` (not `linkedModel.apps`) to get the `parsedApp` for `getIndexedServiceForMainService` — `linkedModel.apps` provides page structure but not the parsed service
- ✅ **Object pages vs list-report pages have different table structures:**
  - `list-report-page` → tables are in `page.lookup['table'] ?? []`
  - `object-page` → tables are nested in sections: iterate `page.sections`, filter for `type === 'table-section'`, then take `section.children.find(c => c.type === 'table')`. `page.lookup['table']` is empty for object pages.
  - Always branch on `page.type`. Never use `page.lookup['table']` unconditionally for all page types.
- ✅ `reportedParent` = the `<Annotation>` element (visitor entry point); `reference.value` = the inner element to report on
- ✅ The visitor key `'target>element[name="Annotation"]'` matches `<Annotation ...>` nodes; `lookup` must contain the **parent** `Annotation` element, not the reported child
- ✅ Use `page.targetName` for `pageNames`; if the same annotation is reused across pages, merge into the existing problem entry (see `sap-no-data-field-intent-based-navigation.ts` for the dedup pattern)
- ✅ **Iterate all qualifiers** — use `Object.values(annotationMap)` not `annotationMap['undefined']`, so qualified annotations (e.g. `UI.Facets#MyQualifier`) are also checked

## Annotation access path — choose by term

| Annotation term | Access path | Example rule |
|---|---|---|
| Terms surfaced in the linked model (e.g. `UI.LineItem`, `UI.FieldGroup`) | `page.lookup['table']`, `page.lookup['field-group']`, etc. — the linker pre-resolved these | `sap-no-data-field-intent-based-navigation.ts` |
| Terms **not** surfaced in the linked model (e.g. `UI.Facets`, `UI.HeaderFacets`) | `page.entity?.structuredType` → `buildAnnotationIndexKey(entityType, MY_TERM)` → look up in `parsedService.index.annotations` | `sap-no-single-facet-in-collection.ts` |

**When to use `page.lookup`:** The linker only resolves annotations that map to a known control (tables, field groups, header sections). If your term has a lookup key, use it — the annotation reference is available via `item.annotation.annotation`. Note: for `'table'`, list-report pages expose tables via `page.lookup['table']` but object pages expose them via `page.sections` (see template above).

**When to use `buildAnnotationIndexKey`:** For terms like `UI.Facets` that the linker processes internally (to derive tables/sections) but does not expose in `page.lookup`. Derive the entity type from `page.entity?.structuredType` and look up directly from the service index.

## Required diagnostic fields:

```typescript
export interface MyRuleDiagnostic {
    type: typeof MY_RULE;
    pageNames: string[];
    annotation: {
        reference: AnnotationReference;      // .value = the element to report on
        reportedParent: Element;             // the <Annotation> node — visitor entry point
    };
}
```

## Rule template — via `page.lookup` (terms surfaced in linked model):

```typescript
// packages/eslint-plugin-fiori-tools/src/rules/sap-[rule-name].ts
import type { AliasInformation, Element } from '@sap-ux/odata-annotation-core';
import { Edm, elementsWithName } from '@sap-ux/odata-annotation-core';
import { createFioriRule } from '../language/rule-factory.js';
import type { FioriRuleDefinition } from '../types.js';
import type { MyRuleDiagnostic } from '../language/diagnostics.js';
import { MY_RULE } from '../language/diagnostics.js';
import { FioriAnnotationSourceCode } from '../language/annotations/source-code.js';
import { getRecordType } from '../project-context/linker/annotations.js';
import type { TableNode } from '../project-context/linker/annotations.js';
import type { FeV4ObjectPage, FeV4ListReport } from '../project-context/linker/fe-v4.js';
import type { FeV2ListReport, FeV2ObjectPage } from '../project-context/linker/fe-v2.js';
import { type ParsedService } from '../project-context/parser/index.js';

// Extract per-table logic into a helper so it can be called from both page branches.
function processTableItem(
    item: { annotation?: TableNode },
    targetName: string,
    parsedService: ParsedService,
    problems: MyRuleDiagnostic[]
): void {
    if (!item.annotation) {
        return;
    }
    const aliasInfo = parsedService.artifacts.aliasInfo[item.annotation.annotation.top.uri];

    // ... walk item.annotation.annotation.top.value to find violating elements ...
    const violatingElements: Element[] = []; // replace with real logic

    for (const violatingElement of violatingElements) {
        const existingIndex = problems.findIndex(
            (p) => p.annotation.reference.value === violatingElement
        );
        if (existingIndex > -1) {
            problems[existingIndex] = {
                ...problems[existingIndex],
                pageNames: [...problems[existingIndex].pageNames, targetName]
            };
        } else {
            problems.push({
                type: MY_RULE,
                pageNames: [targetName],
                annotation: {
                    reference: {
                        uri: item.annotation.annotation.top.uri,
                        value: violatingElement
                    },
                    reportedParent: item.annotation.annotation.top.value  // ← the <Annotation> node
                }
            });
        }
    }
}

function checkAnnotationsInPage(
    page: FeV4ObjectPage | FeV4ListReport | FeV2ListReport | FeV2ObjectPage,
    parsedService: ParsedService,
    problems: MyRuleDiagnostic[]
): void {
    if (page.type === 'list-report-page') {
        // List-report: tables are directly in page.lookup['table']
        for (const item of page.lookup['table'] ?? []) {
            processTableItem(item, page.targetName, parsedService, problems);
        }
    } else {
        // Object-page: tables are nested inside table sections — page.lookup['table'] is empty here
        for (const section of page.sections) {
            if (section.type !== 'table-section') {
                continue;
            }
            const item = section.children.find((c) => c.type === 'table');
            if (item) {
                processTableItem(item, page.targetName, parsedService, problems);
            }
        }
    }
}
```

## Rule template — via `buildAnnotationIndexKey` (terms not in `page.lookup`):

Use this when the annotation term (e.g. `UI.Facets`) is processed internally by the linker but not exposed in `page.lookup`. Access the entity type from `page.entity?.structuredType` and query the service index directly.

```typescript
import { buildAnnotationIndexKey, type ParsedService } from '../project-context/parser/index.js';

const MY_TERM = 'com.sap.vocabularies.UI.v1.MyTerm';

function checkAnnotationsInPage(
    page: FeV4ObjectPage | FeV4ListReport | FeV2ListReport | FeV2ObjectPage,
    parsedService: ParsedService,
    problems: MyRuleDiagnostic[]
): void {
    const entityType = page.entity?.structuredType;
    if (!entityType) {
        return;
    }

    const annotationKey = buildAnnotationIndexKey(entityType, MY_TERM);
    const annotationMap = parsedService.index.annotations[annotationKey];
    if (!annotationMap) {
        return;
    }

    // ✅ Iterate Object.values to cover both unqualified and qualified annotations
    for (const annotation of Object.values(annotationMap)) {
        const aliasInfo = parsedService.artifacts.aliasInfo[annotation.top.uri];
        const [collection] = elementsWithName(Edm.Collection, annotation.top.value);
        if (!collection) {
            continue;
        }

        // ... walk collection to find violating elements ...
        const violatingElements: Element[] = []; // replace with real logic

        for (const violatingElement of violatingElements) {
            const existingIndex = problems.findIndex(
                (p) => p.annotation.reference.value === violatingElement
            );
            if (existingIndex > -1) {
                problems[existingIndex] = {
                    ...problems[existingIndex],
                    pageNames: [...problems[existingIndex].pageNames, page.targetName]
                };
            } else {
                problems.push({
                    type: MY_RULE,
                    pageNames: [page.targetName],
                    annotation: {
                        reference: {
                            uri: annotation.top.uri,
                            value: violatingElement
                        },
                        reportedParent: annotation.top.value  // ← the <Annotation> node
                    }
                });
            }
        }
    }
}
```

Both templates share the same `check()` body and `createAnnotations()`:

```typescript
    check(context) {
        if (!(context.sourceCode instanceof FioriAnnotationSourceCode)) {
            return [];
        }
        const problems: MyRuleDiagnostic[] = [];

        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
            const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
            if (!parsedService) {
                continue;
            }
            for (const page of app.pages) {
                checkAnnotationsInPage(page, parsedService, problems);
            }
        }

        return problems;
    },

    createAnnotations(context, validationResult) {
        if (validationResult.length === 0) {
            return {};
        }
        const lookup = new Set<Element>();
        for (const diagnostic of validationResult) {
            lookup.add(diagnostic.annotation.reportedParent);
        }
        return {
            ['target>element[name="Annotation"]'](node: Element): void {
                if (!lookup.has(node)) {
                    return;
                }
                validationResult
                    .filter((r) => r.annotation.reportedParent === node)
                    .forEach((r) => {
                        context.report({
                            node: r.annotation.reference.value,
                            messageId: MY_RULE
                        });
                    });
            }
        };
    }
```

## Test template:

**Coverage checklist — ensure tests exist for:**
- ✅ No annotation present (valid)
- ✅ Valid annotation
- ✅ Violation (unqualified annotation)
- ✅ Violation with a **qualifier** (e.g. `Qualifier="MyQualifier"` in XML, `@UI.Term #MyQualifier` in CDS) — required since `Object.values(annotationMap)` covers both
- ✅ V2 and V4 variants where the rule applies to both
- ✅ CAP/CDS suite mirrors the XML suite (same valid/invalid cases)
```typescript
// packages/eslint-plugin-fiori-tools/test/rules/sap-[rule-name].test.ts
import { RuleTester } from 'eslint';
import myRule from '../../src/rules/sap-[rule-name].js';
import { meta, languages } from '../../src/index.js';
import {
    getAnnotationsAsXmlCode,
    setup,
    V4_ANNOTATIONS, V4_ANNOTATIONS_PATH,
    V2_ANNOTATIONS, V2_ANNOTATIONS_PATH
} from '../test-helper.js';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-[rule-name]';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

// V4 entity: IncidentService.Incidents
// V2 entity: TECHED_ALP_SOA_SRV.Z_SEPMRA_SO_SALESORDERANALYSISType

const V4_VIOLATION = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.MyTerm">
            <!-- violating content -->
        </Annotation>
    </Annotations>`;

const V4_VALID = `
    <Annotations Target="IncidentService.Incidents">
        <Annotation Term="UI.MyTerm">
            <!-- valid content -->
        </Annotation>
    </Annotations>`;

ruleTester.run(TEST_NAME, myRule, {
    valid: [
        createValidTest({ name: 'V4: no annotation', filename: V4_ANNOTATIONS_PATH, code: V4_ANNOTATIONS }, []),
        createValidTest({ name: 'V4: valid annotation', filename: V4_ANNOTATIONS_PATH, code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_VALID) }, []),
        createValidTest({ name: 'V2: no annotation', filename: V2_ANNOTATIONS_PATH, code: V2_ANNOTATIONS }, [])
    ],
    invalid: [
        createInvalidTest(
            { name: 'V4: violation', filename: V4_ANNOTATIONS_PATH, code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_VIOLATION) },
            [],
            { errors: [{ messageId: TEST_NAME }] }
        )
    ]
});
```

## CDS vs XML: reading annotation values

In XML, annotation values are stored as **attributes**. In CDS, they are stored as **child elements** containing a text node. This affects every value type — `Path`, `String`, `AnnotationPath`, etc.

| Value type | XML | CDS |
|---|---|---|
| Path | `<Annotation Term="UI.SomeTerm" Path="myProp"/>` | `![@UI.SomeTerm]: myProp` → child `<Path>myProp</Path>` |
| String | `<PropertyValue Property="Label" String="My Label"/>` | `Label: 'My Label'` → child `<String>My Label</String>` |
| PropertyValue path | `<PropertyValue Property="Value" Path="title"/>` | `Value: title` → child `<Path>title</Path>` |

**Always use this helper when reading any value** that could be either an attribute or a child element:

```typescript
import { Edm, elementsWithName, getElementAttributeValue } from '@sap-ux/odata-annotation-core';
import type { Element } from '@sap-ux/odata-annotation-core';

function getAttrOrChildText(element: Element, valueName: string): string {
    const fromAttr = getElementAttributeValue(element, valueName);
    if (fromAttr) {
        return fromAttr;
    }
    const [childEl] = elementsWithName(valueName, element);
    const textNode = childEl?.content?.find((c) => c.type === 'text');
    return textNode?.type === 'text' && textNode.text ? textNode.text : '';
}
```

Examples:
```typescript
// Read a Path value from an Annotation or PropertyValue element
const pathValue = getAttrOrChildText(ann, Edm.Path);

// Read a String value from a PropertyValue element
const labelValue = getAttrOrChildText(propValueEl, Edm.String);

// Read an AnnotationPath value
const annotationPath = getAttrOrChildText(propValueEl, Edm.AnnotationPath);
```

Replace any bare `getElementAttributeValue(el, Edm.Path)` / `getElementAttributeValue(el, Edm.String)` call with `getAttrOrChildText` so the rule works for both XML and CDS files.

---

## CDS annotations tests:

**Imports — use CAP variants instead of XML variants:**

```typescript
import {
    CAP_ANNOTATIONS, CAP_ANNOTATIONS_PATH, CAP_APP_PATH,
    setup
} from '../test-helper.js';
```

**Key differences from the XML template:**

| | XML | CDS |
|---|---|---|
| `setup()` | `setup(TEST_NAME)` | `setup(\"${TEST_NAME} - CDS\", CAP_APP_PATH)` — second arg triggers `npmInstall` and mocks `process.cwd()` to `CAP_PROJECT_PATH` |
| `filename` | `V4_ANNOTATIONS_PATH` | `CAP_ANNOTATIONS_PATH` — the `.cds` extension is what selects the CDS parser |
| Code construction | `getAnnotationsAsXmlCode(V4_ANNOTATIONS, snippet)` | `CAP_ANNOTATIONS + cdsSnippet` — plain concatenation, no helper |
| Non-CDS file guard | not needed | add a valid case with `filename: 'other.json'` to confirm the rule skips non-CDS files |
| Enum values | `EnumMember="UI.ImportanceType/High"` | `#High` |
| Record types | `Type="UI.DataField"` attribute on `<Record>` | `$Type: 'UI.DataField'` property |
| Qualified annotation | `Qualifier="MyQualifier"` attribute | `#MyQualifier` after the term: `UI.LineItem #MyQualifier` |

⚠️ **CDS annotation merging** — appending two `annotate service.X with @(UI.SameTerm: [...])` blocks for the same entity and term causes CDS to merge them (the second overwrites the first). Use a single `annotate` block with multiple entries instead of concatenating separate blocks for the same term.

## Debug checklist (if tests show 0 errors when violations expected):

- **CDS rule fires for XML but not CDS (or vice versa)?** XML stores annotation values as attributes; CDS stores them as child elements containing a text node. Use `getAttrOrChildText(el, valueName)` (see "CDS vs XML: reading annotation values" above) instead of bare `getElementAttributeValue(el, Edm.Path)` / `getElementAttributeValue(el, Edm.String)` calls.
- Is `linkedModel.apps` used for page iteration (not `index.apps` directly)?
- Is `index.apps[appKey]` used to fetch `parsedApp` for `getIndexedServiceForMainService`?
- **Object page tables not found?** `page.lookup['table']` is empty for object pages — tables live in `page.sections` as `table-section` children. Always branch on `page.type` (see template above).
- **If using `page.lookup`:** is the correct key used (`'table'`, `'field-group'`, etc.)? Does the annotation term actually appear in the linked model lookup?
- **If using `buildAnnotationIndexKey`:** is `page.entity?.structuredType` non-null? Is the key format correct (`entityType/@fullyQualifiedTerm`)?
- Are **all qualifiers** covered? Use `Object.values(annotationMap)` — `annotationMap['undefined']` misses qualified annotations
- Is there a test case with a qualified annotation (e.g. `Qualifier="MyQualifier"`)? Add one if missing.
- Is `page.lookup['table']` used directly (not via a double-cast to both LR and OP types)? The double-cast pattern processes each table twice.
- Is `parsedService` actually defined? (add a temporary `console.log` to verify)

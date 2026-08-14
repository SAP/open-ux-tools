# Annotation Rule — Fast Path

## Read in parallel (one turn):

1. `packages/eslint-plugin-fiori-tools/src/language/diagnostics.ts`
2. `packages/eslint-plugin-fiori-tools/src/rules/sap-no-data-field-intent-based-navigation.ts`
3. `packages/eslint-plugin-fiori-tools/src/project-context/linker/annotations.ts` — `getRecordType`, `elementsWithName`
4. `packages/eslint-plugin-fiori-tools/src/project-context/parser/service.ts` — `buildAnnotationIndexKey` (key format: `"target/@fullyQualifiedTerm"`)
5. `packages/eslint-plugin-fiori-tools/src/rules/index.ts`
6. `packages/eslint-plugin-fiori-tools/src/index.ts`
7. `packages/eslint-plugin-fiori-tools/test/test-helper.ts`
8. `packages/eslint-plugin-fiori-tools/test/rules/sap-no-data-field-intent-based-navigation-xml.test.ts`

For rules with nested AST walks: also read `src/rules/sap-no-single-facet-in-collection.ts`.

## Pre-flight checklist:

- ✅ **Only check page-referenced annotations** — annotations not referenced from any app page must produce no diagnostic
- ✅ `pageNames` = only pages that reference the specific annotation; merge if the same `IndexedAnnotation` is reused across pages
- ✅ Iterate `linkedModel.apps` for pages; use `index.apps[appKey]` to get `parsedApp` for `getIndexedServiceForMainService`
- ✅ **Page type matters for tables:** `list-report-page` → `page.lookup['table'] ?? []`; `object-page` → iterate `page.sections`, filter `type === 'table-section'`, then `section.children.find(c => c.type === 'table')`. Always branch on `page.type`
- ✅ `reportedParent` = the `<Annotation>` element; `reference.value` = the inner element to report on
- ✅ Visitor key `'target>element[name="Annotation"]'` matches `<Annotation ...>` nodes; `lookup` must contain the parent `Annotation` element
- ✅ Use `page.targetName` for `pageNames`
- ✅ **Iterate all qualifiers** — use `Object.values(annotationMap)`, not `annotationMap['undefined']`

## Annotation access path — choose by term

| Annotation term | Access path | Example rule |
|---|---|---|
| Terms in linked model (`UI.LineItem`, `UI.FieldGroup`) | `page.lookup['table']`, `page.lookup['field-group']`, etc. | `sap-no-data-field-intent-based-navigation.ts` |
| Terms **not** in `page.lookup` (`UI.Facets`, `UI.HeaderFacets`) | `page.entity?.structuredType` → `buildAnnotationIndexKey` → `parsedService.index.annotations` | `sap-no-single-facet-in-collection.ts` |
| Secondary annotations linked **from** page nodes (`UI.Chart` via `DataFieldForAnnotation` or `ReferenceFacet`) | `buildAnnotationPageMap(sourceCode, 'chart')` — builds `Map<IndexedAnnotation, string[]>` from `page.lookup[lookupKey]` | `sap-micro-chart-requires-navigation-entity.ts` |

## Required diagnostic interface:

```typescript
export interface MyRuleDiagnostic {
    type: typeof MY_RULE;
    pageNames: string[];
    annotation: {
        reference: AnnotationReference;   // .value = element to report
        reportedParent: Element;          // the <Annotation> node
    };
}
```

## Template A — page-annotation-map (secondary lookup key, e.g. `'chart'`):

```typescript
import type { IndexedAnnotation } from '../project-context/parser/index.js';
import { FioriAnnotationSourceCode } from '../language/annotations/source-code.js';

function buildAnnotationPageMap(
    sourceCode: FioriAnnotationSourceCode,
    lookupKey: string
): Map<IndexedAnnotation, string[]> {
    const map = new Map<IndexedAnnotation, string[]>();
    for (const appKey of Object.keys(sourceCode.projectContext.linkedModel.apps)) {
        const linkedApp = sourceCode.projectContext.linkedModel.apps[appKey];
        for (const page of linkedApp.pages) {
            const items = (
                page as { lookup?: Record<string, { annotation?: { annotation?: IndexedAnnotation } }[]> }
            ).lookup?.[lookupKey];
            if (!items) continue;
            for (const item of items) {
                const indexedAnnotation = item.annotation?.annotation;
                if (!indexedAnnotation) continue;
                const names = map.get(indexedAnnotation) ?? [];
                if (!names.includes(page.targetName)) names.push(page.targetName);
                map.set(indexedAnnotation, names);
            }
        }
    }
    return map;
}

// In check():
check(context) {
    if (!(context.sourceCode instanceof FioriAnnotationSourceCode)) return [];
    const problems: MyRuleDiagnostic[] = [];
    const annotationPageMap = buildAnnotationPageMap(context.sourceCode, 'chart');
    for (const [annotation, pageNames] of annotationPageMap) {
        checkAnnotation(annotation, pageNames, problems);
    }
    return problems;
}
```

> **Test fixture:** The test snippet must include a reference from a page annotation to the annotation under test (a `UI.Facets` `ReferenceFacet` or `UI.LineItem` `DataFieldForAnnotation`). Without it the linker never populates the lookup key → 0 errors even for invalid content. Never add a fallback that scans all entity annotations.

## Template B — via `page.lookup` (terms in linked model):

```typescript
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

function processTableItem(
    item: { annotation?: TableNode },
    targetName: string,
    parsedService: ParsedService,
    problems: MyRuleDiagnostic[]
): void {
    if (!item.annotation) return;
    const aliasInfo = parsedService.artifacts.aliasInfo[item.annotation.annotation.top.uri];
    const violatingElements: Element[] = []; // replace with real logic

    for (const violatingElement of violatingElements) {
        const existingIndex = problems.findIndex((p) => p.annotation.reference.value === violatingElement);
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
                    reference: { uri: item.annotation.annotation.top.uri, value: violatingElement },
                    reportedParent: item.annotation.annotation.top.value
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
        for (const item of page.lookup['table'] ?? []) {
            processTableItem(item, page.targetName, parsedService, problems);
        }
    } else {
        // Object-page: page.lookup['table'] is empty; tables are nested in table-section children
        for (const section of page.sections) {
            if (section.type !== 'table-section') continue;
            const item = section.children.find((c) => c.type === 'table');
            if (item) processTableItem(item, page.targetName, parsedService, problems);
        }
    }
}
```

## Template C — via `buildAnnotationIndexKey` (terms not in `page.lookup`):

```typescript
import { buildAnnotationIndexKey, type ParsedService } from '../project-context/parser/index.js';

const MY_TERM = 'com.sap.vocabularies.UI.v1.MyTerm';

function checkAnnotationsInPage(
    page: FeV4ObjectPage | FeV4ListReport | FeV2ListReport | FeV2ObjectPage,
    parsedService: ParsedService,
    problems: MyRuleDiagnostic[]
): void {
    const entityType = page.entity?.structuredType;
    if (!entityType) return;

    const annotationMap = parsedService.index.annotations[buildAnnotationIndexKey(entityType, MY_TERM)];
    if (!annotationMap) return;

    for (const annotation of Object.values(annotationMap)) {
        const aliasInfo = parsedService.artifacts.aliasInfo[annotation.top.uri];
        const [collection] = elementsWithName(Edm.Collection, annotation.top.value);
        if (!collection) continue;

        const violatingElements: Element[] = []; // replace with real logic

        for (const violatingElement of violatingElements) {
            const existingIndex = problems.findIndex((p) => p.annotation.reference.value === violatingElement);
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
                        reference: { uri: annotation.top.uri, value: violatingElement },
                        reportedParent: annotation.top.value
                    }
                });
            }
        }
    }
}
```

## Shared `check()` and `createAnnotations()` (all templates B and C):

```typescript
check(context) {
    if (!(context.sourceCode instanceof FioriAnnotationSourceCode)) return [];
    const problems: MyRuleDiagnostic[] = [];
    for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
        const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
        const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
        if (!parsedService) continue;
        for (const page of app.pages) {
            checkAnnotationsInPage(page, parsedService, problems);
        }
    }
    return problems;
},

createAnnotations(context, validationResult) {
    if (validationResult.length === 0) return {};
    const lookup = new Set<Element>(validationResult.map((r) => r.annotation.reportedParent));
    return {
        ['target>element[name="Annotation"]'](node: Element): void {
            if (!lookup.has(node)) return;
            validationResult
                .filter((r) => r.annotation.reportedParent === node)
                .forEach((r) => context.report({ node: r.annotation.reference.value, messageId: MY_RULE }));
        }
    };
}
```

## CDS vs XML: reading annotation values

XML stores values as **attributes**; CDS stores them as **child elements** with a text node. Always use this helper:

```typescript
import { Edm, elementsWithName, getElementAttributeValue } from '@sap-ux/odata-annotation-core';
import type { Element } from '@sap-ux/odata-annotation-core';

function getAttrOrChildText(element: Element, valueName: string): string {
    const fromAttr = getElementAttributeValue(element, valueName);
    if (fromAttr) return fromAttr;
    const [childEl] = elementsWithName(valueName, element);
    const textNode = childEl?.content?.find((c) => c.type === 'text');
    return textNode?.type === 'text' && textNode.text ? textNode.text : '';
}

// Usage:
const pathValue = getAttrOrChildText(ann, Edm.Path);
const labelValue = getAttrOrChildText(propValueEl, Edm.String);
```

Replace any bare `getElementAttributeValue(el, Edm.Path/String)` call with `getAttrOrChildText`.

## Test template (XML):

**Coverage checklist:** no annotation, valid annotation, violation, qualified violation (`Qualifier="MyQualifier"`), V2 and V4 variants.

```typescript
import { RuleTester } from 'eslint';
import myRule from '../../src/rules/sap-[rule-name].js';
import { meta, languages } from '../../src/index.js';
import {
    getAnnotationsAsXmlCode, setup,
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

## CDS test differences:

| | XML | CDS |
|---|---|---|
| `setup()` | `setup(TEST_NAME)` | `setup("${TEST_NAME} - CDS", CAP_APP_PATH)` |
| `filename` | `V4_ANNOTATIONS_PATH` | `CAP_ANNOTATIONS_PATH` (`.cds` selects CDS parser) |
| Code construction | `getAnnotationsAsXmlCode(V4_ANNOTATIONS, snippet)` | `CAP_ANNOTATIONS + cdsSnippet` |
| Non-CDS guard | not needed | add valid case with `filename: 'other.json'` |
| Enum values | `EnumMember="UI.ImportanceType/High"` | `#High` |
| Record types | `Type="UI.DataField"` on `<Record>` | `$Type: 'UI.DataField'` |
| Qualified annotation | `Qualifier="MyQualifier"` attribute | `#MyQualifier` after term |

⚠️ **CDS merging:** Two `annotate service.X with @(UI.SameTerm: [...])` blocks for the same entity/term are merged by CDS (second overwrites first). Use a single `annotate` block with multiple entries.

**CDS imports:**
```typescript
import { CAP_ANNOTATIONS, CAP_ANNOTATIONS_PATH, CAP_APP_PATH, setup } from '../test-helper.js';
```

## Debug checklist (0 errors when violations expected):

- **Page-annotation-map:** annotation must be referenced from a page-facing annotation (`UI.Facets ReferenceFacet` or `UI.LineItem DataFieldForAnnotation`); without it `lookup[key]` is empty
- **CDS fires for XML but not CDS (or vice versa):** use `getAttrOrChildText` instead of bare `getElementAttributeValue`
- **Object-page tables not found:** `page.lookup['table']` is empty for object pages — branch on `page.type`
- **`linkedModel.apps` vs `index.apps`:** use `linkedModel.apps` for page iteration; `index.apps[appKey]` for `parsedApp`
- **All qualifiers covered?** `Object.values(annotationMap)` — `annotationMap['undefined']` misses qualified ones
- **`page.lookup` key correct?** (`'table'`, `'field-group'`, etc.) — does the term appear in the linked model?
- **`buildAnnotationIndexKey`:** is `page.entity?.structuredType` non-null? Is key format correct?
- **Double-cast pattern?** Using `page.lookup['table']` via double-cast processes each table twice — use template B instead

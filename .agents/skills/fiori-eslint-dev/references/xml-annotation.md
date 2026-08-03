# XML Annotation Rule — Fast Path

## Read all of these in parallel (one turn):

1. `packages/eslint-plugin-fiori-tools/src/language/diagnostics.ts`
2. `packages/eslint-plugin-fiori-tools/src/rules/sap-no-data-field-intent-based-navigation.ts`
3. `packages/eslint-plugin-fiori-tools/src/project-context/linker/annotations.ts` — provides `getRecordType`, `elementsWithName`
4. `packages/eslint-plugin-fiori-tools/src/project-context/parser/service.ts` — lines 50-57 show annotation index key format: `"target/@fullyQualifiedTerm"`
5. `packages/eslint-plugin-fiori-tools/src/rules/index.ts`
6. `packages/eslint-plugin-fiori-tools/src/index.ts`
7. `packages/eslint-plugin-fiori-tools/test/test-helper.ts`
8. `packages/eslint-plugin-fiori-tools/test/rules/sap-no-data-field-intent-based-navigation-xml.test.ts`

For rules with nested AST walks, also read `src/rules/sap-no-single-facet-in-collection.ts`.

## Pre-flight checklist (read before writing `check()`):

- ✅ Annotation index keys use `/@term` format: `key.endsWith('/@com.sap.vocabularies.UI.v1.Facets')` — **NOT** `'/com.sap.vocabularies.UI.v1.Facets'`
- ✅ **Use `context.sourceCode.projectContext.index.apps`** — never `linkedModel.apps`. The linked model silently excludes apps where the linker couldn't resolve pages (e.g. unresolvable annotation targets), causing `check()` to return nothing with no error
- ✅ `reportedParent` = the `<Annotation>` element (visitor entry point); `reference.value` = the inner element to report on
- ✅ The visitor key `'target>element[name="Annotation"]'` matches `<Annotation ...>` nodes; `lookup` must contain the **parent** `Annotation` element, not the reported child

## Required diagnostic fields:

```typescript
export interface MyRuleDiagnostic {
    type: typeof MY_RULE;
    pageNames: string[];
    annotation: {
        file: string;
        annotationPath: string;
        reference: AnnotationReference;      // .value = the element to report on
        reportedParent: Element;             // the <Annotation> node — visitor entry point
    };
}
```

## Rule template:

```typescript
// packages/eslint-plugin-fiori-tools/src/rules/sap-[rule-name].ts
import type { AliasInformation, Element } from '@sap-ux/odata-annotation-core';
import { Edm, elementsWithName } from '@sap-ux/odata-annotation-core';
import { createFioriRule } from '../language/rule-factory.js';
import type { FioriRuleDefinition } from '../types.js';
import type { MyRuleDiagnostic } from '../language/diagnostics.js';
import { MY_RULE } from '../language/diagnostics.js';
import { getRecordType } from '../project-context/linker/annotations.js';

const MY_TERM = 'com.sap.vocabularies.UI.v1.MyTerm'; // fully qualified

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: MY_RULE,
    meta: {
        type: 'problem',
        docs: {
            recommended: true,
            description: 'Short description.',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-[rule-name].md'
        },
        messages: { [MY_RULE]: 'Error message explaining the violation.' },
        schema: []
    },

    check(context) {
        const problems: MyRuleDiagnostic[] = [];

        // ✅ Always use index.apps — linkedModel.apps silently excludes apps with unresolvable annotations
        for (const [, parsedApp] of Object.entries(context.sourceCode.projectContext.index.apps)) {
            const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
            if (!parsedService) {
                continue;
            }

            for (const [key, annotationMap] of Object.entries(parsedService.index.annotations)) {
                // ✅ Key format is "target/@fullyQualifiedTerm" — note the /@ prefix
                if (!key.endsWith(`/@${MY_TERM}`)) {
                    continue;
                }
                const annotation = annotationMap['undefined']; // 'undefined' = no qualifier
                if (!annotation) {
                    continue;
                }

                const aliasInfo = parsedService.artifacts.aliasInfo[annotation.top.uri];
                // ... walk the AST, find violations ...

                // When pushing a problem:
                problems.push({
                    type: MY_RULE,
                    pageNames: [],
                    annotation: {
                        file: annotation.top.uri,
                        annotationPath: `@${MY_TERM}`,
                        reference: { uri: annotation.top.uri, value: violatingElement },
                        reportedParent: annotation.top.value  // ← the <Annotation> node
                    }
                });
            }
        }
        return problems;
    },

    createAnnotations(context, validationResult) {
        if (validationResult.length === 0) {
            return {};
        }
        // lookup by reportedParent (<Annotation> node) — this is what the visitor matches
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
                            node: r.annotation.reference.value as Element,  // ← the actual violating node
                            messageId: MY_RULE
                        });
                    });
            }
        };
    }
});

export default rule;
```

## Test template:

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

## Debug checklist (if tests show 0 errors when violations expected):

- Is `index.apps` used instead of `linkedModel.apps`?
- Is the annotation key using `/@term` format?
- Is `reportedParent` set correctly on the diagnostic?
- Is `parsedService` actually defined? (add a temporary `console.log` to verify)

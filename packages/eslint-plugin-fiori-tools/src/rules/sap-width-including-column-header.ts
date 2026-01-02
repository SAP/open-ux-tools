import type { Element } from '@sap-ux/odata-annotation-core';
import { Edm, elementsWithName, elements } from '@sap-ux/odata-annotation-core';
import type { MemberNode } from '@humanwhocodes/momoa';

import { createFioriRule } from '../language/rule-factory';
import type { FioriRuleDefinition } from '../types';
import type { WidthIncludingColumnHeaderDiagnostic } from '../language/diagnostics';
import { WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE } from '../language/diagnostics';
import { getRecordType } from '../project-context/linker/annotations';
import { createJsonHandler } from '../utils/manifest';

export type RequireWidthIncludingColumnHeaderOptions = {
    form: string;
};

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description:
                'By default, the column width is calculated based on the type of the content. You can include the column header in the width calculation by setting this property to true',
            url: 'https://ui5.sap.com/#/topic/c0f6592a592e47f9bb6d09900de47412'
        },
        messages: {
            ['width-including-column-header-manifest']:
                'Small tables (< 6 columns) should use widthIncludingColumnHeader: true for better column width calculation. Add it to the control configuration for "{{table}}" table.',
            ['width-including-column-header']:
                'Small tables (< 6 columns) should use widthIncludingColumnHeader: true for better column width calculation.'
        }
    },
    check(context) {
        const problems: WidthIncludingColumnHeaderDiagnostic[] = [];

        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            if (app.type !== 'fe-v4') {
                continue;
            }
            for (const page of app.pages) {
                const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
                const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
                if (!parsedService) {
                    continue;
                }

                for (const table of page.lookup['table'] ?? []) {
                    if (!table.annotation) {
                        // annotations are required for this rule
                        continue;
                    }
                    const aliasInfo = parsedService.artifacts.aliasInfo[table.annotation.annotation.top.uri];

                    const [collection] = elementsWithName(Edm.Collection, table.annotation.annotation.top.value);
                    if (!collection) {
                        continue;
                    }

                    const records = elements((element) => {
                        if (element.name !== Edm.Record) {
                            return false;
                        }

                        return getRecordType(aliasInfo, element) === 'com.sap.vocabularies.UI.v1.DataField';
                    }, collection);

                    if (
                        records.length < 6 &&
                        records.length > 0 &&
                        table.configuration.widthIncludingColumnHeader.valueInFile !== true
                    ) {
                        problems.push({
                            type: WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE,
                            manifest: {
                                uri: parsedApp.manifest.manifestUri,
                                object: parsedApp.manifestObject,
                                requiredPropertyPath: table.configuration.widthIncludingColumnHeader.configurationPath,
                                optionalPropertyPath: []
                            },
                            annotation: {
                                file: table.annotation.annotation.source,
                                annotationPath: table.annotation.annotationPath,
                                reference: table.annotation.annotation.top
                            }
                        });
                    }
                }
            }
        }

        return problems;
    },
    createJson: createJsonHandler(
        (context, diagnostic) =>
            function report(node: MemberNode): void {
                context.report({
                    node,
                    messageId: 'width-including-column-header-manifest',
                    data: {
                        table: diagnostic.annotation.annotationPath
                    }
                });
            }
    ),
    createAnnotations(context, validationResult) {
        if (validationResult.length === 0) {
            return {};
        }

        const lookup = new Set<Element>();
        for (const diagnostic of validationResult) {
            lookup.add(diagnostic.annotation?.reference?.value);
        }
        return {
            ['target>element[name="Annotation"]'](node: Element) {
                if (!lookup.has(node)) {
                    return;
                }

                context.report({
                    node: node,
                    messageId: 'width-including-column-header'
                });
            }
        };
    }
});

export default rule;

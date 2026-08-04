import type { Element } from '@sap-ux/odata-annotation-core';
import { Edm, elementsWithName, elements, getElementAttributeValue, ELEMENT_TYPE } from '@sap-ux/odata-annotation-core';
import { createFioriRule } from '../language/rule-factory.js';
import type { FioriRuleDefinition } from '../types.js';
import type { FieldGroupInTableTypeRestriction } from '../language/diagnostics.js';
import { FIELD_GROUP_IN_TABLE_TYPE_RESTRICTION } from '../language/diagnostics.js';
import { getRecordType } from '../project-context/linker/annotations.js';
import type { FeV4ObjectPage, FeV4ListReport, Table as FeV4Table } from '../project-context/linker/fe-v4.js';
import type { FeV2ListReport, FeV2ObjectPage, Table as FeV2Table } from '../project-context/linker/fe-v2.js';
import type { ParsedService } from '../project-context/parser/index.js';

const DATA_FIELD_FOR_ANNOTATION = 'com.sap.vocabularies.UI.v1.DataFieldForAnnotation';
const UNSUPPORTED_TABLE_TYPES = new Set(['GridTable', 'AnalyticalTable', 'TreeTable']);

/**
 * Checks if a DataFieldForAnnotation record's Target annotation path references a FieldGroup.
 *
 * @param record - The DataFieldForAnnotation record element
 * @returns true if the Target annotation path contains "FieldGroup"
 */
function targetIsFieldGroup(record: Element): boolean {
    const propertyValues = elementsWithName(Edm.PropertyValue, record);
    const targetProp = propertyValues.find((pv) => getElementAttributeValue(pv, Edm.Property) === 'Target');
    if (!targetProp) {
        return false;
    }

    // Target as XML attribute: <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#..."/>
    const annotationPath = getElementAttributeValue(targetProp, Edm.AnnotationPath);
    if (annotationPath) {
        return annotationPath.includes('FieldGroup');
    }

    // Target as child element: <AnnotationPath>@UI.FieldGroup#...</AnnotationPath>
    const annotationPathChild = targetProp.content.find(
        (c) => c.type === ELEMENT_TYPE && (c as Element).name === Edm.AnnotationPath
    ) as Element | undefined;
    const childText = annotationPathChild?.content?.find((c) => c.type === 'text')?.text;
    return !!childText && childText.includes('FieldGroup');
}

/**
 * Collects FieldGroup violations from a table whose type is unsupported.
 *
 * @param table - The linked table with type configuration
 * @param parsedService - Parsed OData service
 * @param pageName - Page target name for reporting
 * @param problems - Accumulator for found violations
 */
function checkTableForFieldGroupViolations(
    table: FeV4Table | FeV2Table,
    parsedService: ParsedService,
    pageName: string,
    problems: FieldGroupInTableTypeRestriction[]
): void {
    const tableType = table.configuration.tableType.valueInFile;
    if (!tableType || !UNSUPPORTED_TABLE_TYPES.has(tableType)) {
        return;
    }
    if (!table.annotation) {
        return;
    }

    const lineItem = table.annotation.annotation;
    const aliasInfo = parsedService.artifacts.aliasInfo[lineItem.top.uri];
    if (!aliasInfo) {
        return;
    }

    const [collection] = elementsWithName(Edm.Collection, lineItem.top.value);
    if (!collection) {
        return;
    }

    const dataFieldForAnnotationRecords = elements((el) => {
        if (el.name !== Edm.Record) {
            return false;
        }
        return getRecordType(aliasInfo, el) === DATA_FIELD_FOR_ANNOTATION;
    }, collection);

    for (const record of dataFieldForAnnotationRecords) {
        if (!targetIsFieldGroup(record)) {
            continue;
        }

        const existingIndex = problems.findIndex((p) => p.annotation.reference.value === record);
        if (existingIndex > -1) {
            problems[existingIndex] = {
                ...problems[existingIndex],
                pageNames: [...problems[existingIndex].pageNames, pageName]
            };
        } else {
            problems.push({
                type: FIELD_GROUP_IN_TABLE_TYPE_RESTRICTION,
                pageNames: [pageName],
                tableType,
                annotation: {
                    file: lineItem.top.uri,
                    annotationPath: table.annotation.annotationPath,
                    reference: { uri: lineItem.top.uri, value: record },
                    reportedParent: lineItem.top.value
                }
            });
        }
    }
}

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: FIELD_GROUP_IN_TABLE_TYPE_RESTRICTION,
    meta: {
        type: 'problem',
        docs: {
            recommended: true,
            description:
                'UI.FieldGroup annotation is not supported in GridTable, AnalyticalTable, or TreeTable. Use ResponsiveTable instead.',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-field-group-in-table-type-restriction.md'
        },
        messages: {
            [FIELD_GROUP_IN_TABLE_TYPE_RESTRICTION]:
                'UI.FieldGroup is not supported in {{tableType}}. Change the table type to ResponsiveTable or use individual UI.DataField entries instead.'
        },
        schema: []
    },

    check(context) {
        const problems: FieldGroupInTableTypeRestriction[] = [];

        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
            const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
            if (!parsedService) {
                continue;
            }

            for (const page of app.pages) {
                const pageAsLR = page as FeV4ListReport | FeV2ListReport;
                const pageAsOP = page as FeV4ObjectPage | FeV2ObjectPage;

                const tables = [...(pageAsLR.lookup?.['table'] ?? []), ...(pageAsOP.lookup?.['table'] ?? [])] as (
                    FeV4Table | FeV2Table
                )[];

                for (const table of tables) {
                    checkTableForFieldGroupViolations(table, parsedService, page.targetName, problems);
                }
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
                            node: r.annotation.reference.value as Element,
                            messageId: FIELD_GROUP_IN_TABLE_TYPE_RESTRICTION,
                            data: { tableType: r.tableType }
                        });
                    });
            }
        };
    }
});

export default rule;

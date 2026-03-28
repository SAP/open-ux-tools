import type { Element, AliasInformation } from '@sap-ux/odata-annotation-core';
import { Edm, elementsWithName, elements } from '@sap-ux/odata-annotation-core';
import { createFioriRule } from '../language/rule-factory';
import type { FioriRuleDefinition } from '../types';
import type { NoDataFieldIntentBasedNavigation } from '../language/diagnostics';
import { NO_DATA_FIELD_INTENT_BASED_NAVIGATION } from '../language/diagnostics';
import { getRecordType } from '../project-context/linker/annotations';
import type { FeV4ObjectPage, FeV4ListReport, Table as FeV4Table, FieldGroup } from '../project-context/linker/fe-v4';
import type { FeV2ListReport, FeV2ObjectPage, Table as FeV2Table } from '../project-context/linker/fe-v2';
import { type ParsedService } from '../project-context/parser';

/**
 * Collects DataFieldForIntentBasedNavigation and DataFieldWithIntentBasedNavigation used in a page
 *
 * @param tableOrFieldGroup - Page table or FieldGroup annotation to check for DataFields
 * @param aliasInfo - Alias information for resolving qualified names
 * @returns Array of data field with/for intent based navigation
 */
function getIntentBasedNavDataFields(
    tableOrFieldGroup: FeV2Table | FeV4Table | FieldGroup,
    aliasInfo: AliasInformation
): Element[] {
    if (!tableOrFieldGroup.annotation) {
        return [];
    }

    let collection: Element | undefined;
    if (tableOrFieldGroup.type == 'table') {
        [collection] = elementsWithName(Edm.Collection, tableOrFieldGroup.annotation.annotation.top.value);
    } else {
        const [record] = elementsWithName(Edm.Record, tableOrFieldGroup.annotation.annotation.top.value);
        const [propertyValue] = elements(
            (el) => el.name === Edm.PropertyValue && el.attributes[Edm.Property]?.value === 'Data',
            record
        );
        [collection] = elementsWithName(Edm.Collection, propertyValue);
    }
    if (!collection) {
        return [];
    }

    const records = elements((element) => {
        if (element.name !== Edm.Record) {
            return false;
        }
        const recordType = getRecordType(aliasInfo, element);
        return (
            recordType === 'com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation' ||
            recordType === 'com.sap.vocabularies.UI.v1.DataFieldWithIntentBasedNavigation'
        );
    }, collection);

    return records;
}

/**
 * Checks if DataFieldForIntentBasedNavigation or DataFieldWithIntentBasedNavigation are used in the table of FieldGroup annotation.
 * Adds to problems for every DataField annotation used.
 *
 * @param page - Application page V2 or V4
 * @param parsedService - Parsed annotation service
 * @param problems - Array of found rule violations
 */
function checkTablesAndFieldGroupsInPage(
    page: FeV4ObjectPage | FeV4ListReport | FeV2ListReport | FeV2ObjectPage,
    parsedService: ParsedService,
    problems: NoDataFieldIntentBasedNavigation[]
): void {
    for (const tableOrFieldGroup of [...(page.lookup['table'] ?? []), ...(page.lookup['field-group'] ?? [])]) {
        if (!tableOrFieldGroup.annotation) {
            continue;
        }
        const aliasInfo = parsedService.artifacts.aliasInfo[tableOrFieldGroup.annotation.annotation.top.uri];

        const itentBasedNavigationDataFields = getIntentBasedNavDataFields(tableOrFieldGroup, aliasInfo);
        itentBasedNavigationDataFields.forEach((dataField) => {
            if (!tableOrFieldGroup.annotation) {
                return;
            }
            const alreadyReportedDFIndex = problems.findIndex(
                (problem) => problem.annotation.reference.value === dataField
            );
            if (alreadyReportedDFIndex > -1) {
                // If DataField was already reported, add the page to page name array for the existing issue.
                // This way the issue is reported once, but the reference for all pages using the same table or field group is saved.
                problems[alreadyReportedDFIndex] = {
                    ...problems[alreadyReportedDFIndex],
                    pageNames: [...problems[alreadyReportedDFIndex].pageNames, page.targetName]
                };
            } else {
                problems.push({
                    type: NO_DATA_FIELD_INTENT_BASED_NAVIGATION,
                    pageNames: [page.targetName],
                    annotation: {
                        file: tableOrFieldGroup.annotation.annotation.top.uri,
                        annotationPath: tableOrFieldGroup.annotation.annotationPath,
                        reference: {
                            uri: tableOrFieldGroup.annotation.annotation.top.uri,
                            value: dataField
                        },
                        recordType: getRecordType(aliasInfo, dataField) ?? '',
                        reportedParent: tableOrFieldGroup.annotation.annotation.top.value
                    }
                });
            }
        });
    }
}

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: NO_DATA_FIELD_INTENT_BASED_NAVIGATION,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description:
                'UI.DataFieldForIntentBasedNavigation and UI.DataFieldWithIntentBasedNavigation must not be used.',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-no-data-field-intent-based-navigation.md'
        },
        messages: {
            ['no-data-field-for-intent-based-navigation']:
                'DataFieldForIntentBasedNavigation annotation must not be used. Please use a semantic link navigation instead.',
            ['no-data-field-with-intent-based-navigation']:
                'DataFieldWithIntentBasedNavigation annotation must not be used. Please use a semantic link navigation instead.'
        }
    },
    check(context) {
        const problems: NoDataFieldIntentBasedNavigation[] = [];

        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            for (const page of app.pages) {
                const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
                const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
                if (!parsedService) {
                    continue;
                }
                checkTablesAndFieldGroupsInPage(page, parsedService, problems);
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
            lookup.add(diagnostic.annotation?.reportedParent);
        }
        return {
            ['target>element[name="Annotation"]'](node: Element): void {
                // check table or header section parent node
                if (!lookup.has(node)) {
                    return;
                }
                validationResult
                    .filter((result) => result.annotation.reportedParent === node)
                    .forEach((result) => {
                        const dfNode = result.annotation.reference.value;
                        context.report({
                            node: dfNode,
                            messageId:
                                result.annotation.recordType ===
                                'com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation'
                                    ? 'no-data-field-for-intent-based-navigation'
                                    : 'no-data-field-with-intent-based-navigation'
                        });
                    });
            }
        };
    }
});

export default rule;

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
 * @param tableOrFieldGroup - page table or FieldGroup annotation to check for DataFields
 * @param aliasInfo - Alias information for resolving qualified names
 * @returns array of data fild with/for intent based navigation
 */
function getIntentBasedNavDataFields(
    tableOrFieldGroup: FeV2Table | FeV4Table | FieldGroup,
    aliasInfo: AliasInformation
): Element[] {
    if (!tableOrFieldGroup.annotation) {
        return [];
    }

    let collection: Element;
    if (tableOrFieldGroup.type == 'table') {
        [collection] = elementsWithName(Edm.Collection, tableOrFieldGroup.annotation.annotation.top.value);
    } else {
        const [record] = elementsWithName(Edm.Record, tableOrFieldGroup.annotation.annotation.top.value);
        const [propertyValue] = elementsWithName(Edm.PropertyValue, record);
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
 *
 * @param page
 * @param parsedService
 * @param problems
 */
function checkTablesAndFieldGroupsInPage(
    page: FeV4ObjectPage | FeV4ListReport | FeV2ListReport | FeV2ObjectPage,
    parsedService: ParsedService,
    problems: NoDataFieldIntentBasedNavigation[]
): void {
    for (const tableOrFieldGroup of [...(page.lookup['table'] ?? []), ...(page.lookup['fieldGroup'] ?? [])]) {
        if (!tableOrFieldGroup.annotation) {
            continue;
        }
        const aliasInfo = parsedService.artifacts.aliasInfo[tableOrFieldGroup.annotation.annotation.top.uri];

        const itentBasedNavigationDataFields = getIntentBasedNavDataFields(tableOrFieldGroup, aliasInfo);
        itentBasedNavigationDataFields.forEach((dataField) => {
            if (!tableOrFieldGroup.annotation) {
                return;
            }
            problems.push({
                type: NO_DATA_FIELD_INTENT_BASED_NAVIGATION,
                pageName: page.targetName,
                annotation: {
                    file: tableOrFieldGroup.annotation.annotation.top.uri,
                    annotationPath: tableOrFieldGroup.annotation.annotationPath,
                    reference: {
                        uri: tableOrFieldGroup.annotation.annotation.top.uri,
                        value: dataField
                    },
                    reportedParent: tableOrFieldGroup.annotation.annotation.top.value
                }
            });
        });
    }
}

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: NO_DATA_FIELD_INTENT_BASED_NAVIGATION,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description: '',
            url: ''
        },
        messages: {
            ['no-data-field-intent-based-navigation']:
                'DataFieldForIntentBasedNavigation annotation as well as the DataFieldWithIntentBasedNavigation should not be used. Please use a semantic link navigation instead.'
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
        const dfLookup = new Set<Element>();
        for (const diagnostic of validationResult) {
            lookup.add(diagnostic.annotation?.reportedParent);
        }
        return {
            ['target>element[name="Annotation"]'](node: Element): void {
                // check table/fieldGroup parent node
                if (!lookup.has(node)) {
                    return;
                }
                validationResult
                    .filter((result) => result.annotation.reportedParent === node)
                    .forEach((result) => {
                        const dfNode = result.annotation.reference.value;
                        // check if df node was not already reported
                        if (result.annotation.reportedParent === node && !dfLookup.has(dfNode)) {
                            context.report({
                                node: dfNode, // report DataField node
                                messageId: 'no-data-field-intent-based-navigation'
                            });
                            dfLookup.add(result.annotation.reference.value);
                        }
                    });
            }
        };
    }
});

export default rule;

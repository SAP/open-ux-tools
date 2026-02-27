import type { Element, AliasInformation } from '@sap-ux/odata-annotation-core';
import { Edm, elementsWithName, elements } from '@sap-ux/odata-annotation-core';
import { createFioriRule } from '../language/rule-factory';
import type { FioriRuleDefinition } from '../types';
import type { NoDataFieldIntentBasedNavigation } from '../language/diagnostics';
import { NO_DATA_FIELD_INTENT_BASED_NAVIGATION } from '../language/diagnostics';
import { getRecordType } from '../project-context/linker/annotations';
import type { FeV4ObjectPage, FeV4ListReport, Table } from '../project-context/linker/fe-v4';
import { type ParsedApp, type ParsedService } from '../project-context/parser';
import type { MemberNode } from '@humanwhocodes/momoa';

/**
 *
 * @param table
 * @param aliasInfo
 * @returns
 */
function getWithIntentBasedNavDataFields(table: Table, aliasInfo: AliasInformation): Element[] {
    if (!table.annotation) {
        return [];
    }

    const [collection] = elementsWithName(Edm.Collection, table.annotation.annotation.top.value);
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
 * @param parsedApp
 * @param parsedService
 * @param problems
 */
function checkTablesInPage(
    page: FeV4ObjectPage | FeV4ListReport,
    parsedApp: ParsedApp,
    parsedService: ParsedService,
    problems: NoDataFieldIntentBasedNavigation[]
): void {
    for (const table of page.lookup['table'] ?? []) {
        if (!table.annotation) {
            continue;
        }
        const aliasInfo = parsedService.artifacts.aliasInfo[table.annotation.annotation.top.uri];

        const itentBasedNavigationDataFields = getWithIntentBasedNavDataFields(table, aliasInfo);
        if (itentBasedNavigationDataFields.length) {
            problems.push({
                type: NO_DATA_FIELD_INTENT_BASED_NAVIGATION,
                pageName: page.targetName,
                manifest: {
                    uri: parsedApp.manifest.manifestUri,
                    object: parsedApp.manifestObject,
                    propertyPath: table.path ?? []
                },
                annotation: {
                    file: table.annotation.annotation.top.uri,
                    annotationPath: table.annotation.annotationPath,
                    reference: table.annotation.annotation.top,
                    reportedElements: itentBasedNavigationDataFields
                }
            });
        }
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
            ['no-data-field-intent-based-navigation-manifest']: 'test manifest warning.',
            ['no-data-field-intent-based-navigation']: 'test annotations warning.'
        },
        fixable: 'code'
    },
    check(context) {
        const problems: NoDataFieldIntentBasedNavigation[] = [];

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

                checkTablesInPage(page, parsedApp, parsedService, problems);
            }
        }

        return problems;
    },
    createJsonVisitorHandler: (context) =>
        function report(node: MemberNode): void {
            context.report({
                node,
                messageId: 'no-data-field-intent-based-navigation-manifest'
            });
        },
    createAnnotations(context, validationResult) {
        if (validationResult.length === 0) {
            return {};
        }

        let diagnosticElements = {};
        const lookup = new Set<Element | { reportedElements: Element[] }>();
        for (const diagnostic of validationResult) {
            lookup.add(diagnostic.annotation?.reference?.value);
            diagnosticElements = {
                ...diagnosticElements,
                [diagnostic.annotation.file]: diagnostic.annotation.reportedElements
            };
        }
        return {
            ['target>element[name="Annotation"]'](node: Element): void {
                // check table node
                if (!lookup.has(node)) {
                    return;
                }
                const issue = validationResult.find((result) => result.annotation.reference.value.range === node.range);
                if (!issue) {
                    return;
                }
                const nodesForFile = diagnosticElements[
                    issue.annotation.file as keyof typeof diagnosticElements
                ] as Element[];
                nodesForFile.forEach((nodeForFile) =>
                    context.report({
                        node: nodeForFile,
                        messageId: 'no-data-field-intent-based-navigation'
                    })
                );
            }
        };
    }
});

export default rule;

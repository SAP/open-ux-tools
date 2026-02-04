import type { FioriRuleDefinition } from '../types';
import {
    TABLE_PERSONALIZATION_COLUMN,
    TABLE_PERSONALIZATION_FILTER,
    TABLE_PERSONALIZATION_SORT,
    TABLE_PERSONALIZATION,
    type TablePersonalization
} from '../language/diagnostics';
import { createFioriRule } from '../language/rule-factory';
import type { MemberNode } from '@humanwhocodes/momoa';
import { createJsonFixer } from '../language/rule-fixer';

type MessageIds =
    | typeof TABLE_PERSONALIZATION
    | typeof TABLE_PERSONALIZATION_COLUMN
    | typeof TABLE_PERSONALIZATION_FILTER
    | typeof TABLE_PERSONALIZATION_SORT;

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: TABLE_PERSONALIZATION,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description: '',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-table-personalization.md'
        },
        messages: {
            [TABLE_PERSONALIZATION]:
                'Table personalization should be enabled. Currently every table personalization setting is disabled.',
            [TABLE_PERSONALIZATION_COLUMN]: 'Adding or removing table columns should be enabled.',
            [TABLE_PERSONALIZATION_FILTER]: 'Table data filtering should be enabled.',
            [TABLE_PERSONALIZATION_SORT]: 'Table data sorting should be enabled.'
        },
        fixable: 'code'
    },

    check(context) {
        const problems: TablePersonalization[] = [];

        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            if (app.type !== 'fe-v4') {
                continue;
            }
            const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
            const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
            if (!parsedService) {
                continue;
            }

            for (const page of app.pages) {
                for (const table of page.lookup['table'] ?? []) {
                    // Check if boolean value
                    if (table.configuration.personalization.valueInFile === true) {
                        // Every table personalization setting is enabled
                        continue;
                    }
                    if (table.configuration.personalization.valueInFile === false) {
                        // Every table personalization setting is disabled
                        problems.push({
                            type: TABLE_PERSONALIZATION,
                            pageName: page.targetName,
                            manifest: {
                                uri: parsedApp.manifest.manifestUri,
                                object: parsedApp.manifestObject,
                                propertyPath: table.configuration.personalization.configurationPath // not a property in Page Editor
                            }
                        });
                    } else {
                        // check object properties
                        if (table.configuration.personalizationColumn.valueInFile === false) {
                            problems.push({
                                type: TABLE_PERSONALIZATION,
                                pageName: page.targetName,
                                property: 'column',
                                manifest: {
                                    uri: parsedApp.manifest.manifestUri,
                                    object: parsedApp.manifestObject,
                                    propertyPath: table.configuration.personalizationColumn.configurationPath
                                }
                            });
                        }
                        if (table.configuration.personalizationFilter.valueInFile === false) {
                            problems.push({
                                type: TABLE_PERSONALIZATION,
                                pageName: page.targetName,
                                property: 'filter',
                                manifest: {
                                    uri: parsedApp.manifest.manifestUri,
                                    object: parsedApp.manifestObject,
                                    propertyPath: table.configuration.personalizationFilter.configurationPath
                                }
                            });
                        }
                        if (table.configuration.personalizationSort.valueInFile === false) {
                            problems.push({
                                type: TABLE_PERSONALIZATION,
                                pageName: page.targetName,
                                property: 'sort',
                                manifest: {
                                    uri: parsedApp.manifest.manifestUri,
                                    object: parsedApp.manifestObject,
                                    propertyPath: table.configuration.personalizationSort.configurationPath
                                }
                            });
                        }
                    }
                }
            }
        }
        return problems;
    },
    createJsonVisitorHandler: (context, diagnostic, deepestPathResult) => {
        let messageId: MessageIds = TABLE_PERSONALIZATION;
        if (diagnostic.property === 'column') {
            messageId = TABLE_PERSONALIZATION_COLUMN;
        } else if (diagnostic.property === 'filter') {
            messageId = TABLE_PERSONALIZATION_FILTER;
        } else if (diagnostic.property === 'sort') {
            messageId = TABLE_PERSONALIZATION_SORT;
        }
        return function report(node: MemberNode): void {
            context.report({
                node,
                messageId,
                fix: createJsonFixer({
                    context,
                    deepestPathResult,
                    node,
                    operation: 'delete'
                })
            });
        };
    }
});

export default rule;

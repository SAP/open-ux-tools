import type { FioriRuleDefinition } from '../types';
import {
    type PersonalizationProperty,
    TABLE_PERSONALIZATION,
    type TablePersonalization
} from '../language/diagnostics';
import { createFioriRule } from '../language/rule-factory';
import type { MemberNode } from '@humanwhocodes/momoa';
import { createJsonFixer } from '../language/rule-fixer';
import type { FeV4PageType, Table } from '../project-context/linker/fe-v4';
import type { ParsedApp } from '../project-context/parser';
import { isLowerThanMinimalUi5Version } from '../utils/version';
import type { MinUI5Version } from '../project-context/parser/types';

enum PersonalizationProperties {
    column = 'column',
    filter = 'filter',
    group = 'group',
    sort = 'sort'
}

const TABLE_PERSONALIZATION_COLUMN = 'sap-table-personalization-column';
const TABLE_PERSONALIZATION_FILTER = 'sap-table-personalization-filter';
const TABLE_PERSONALIZATION_SORT = 'sap-table-personalization-sort';
const TABLE_PERSONALIZATION_GROUP = 'sap-table-personalization-group';

type MessageId =
    | typeof TABLE_PERSONALIZATION
    | typeof TABLE_PERSONALIZATION_COLUMN
    | typeof TABLE_PERSONALIZATION_FILTER
    | typeof TABLE_PERSONALIZATION_SORT
    | typeof TABLE_PERSONALIZATION_GROUP;

enum MessageIdByProperty {
    column = TABLE_PERSONALIZATION_COLUMN,
    filter = TABLE_PERSONALIZATION_FILTER,
    sort = TABLE_PERSONALIZATION_SORT,
    group = TABLE_PERSONALIZATION_GROUP
}

const checkPersonalizationValue = (
    table: Table,
    page: FeV4PageType,
    parsedApp: ParsedApp,
    minUI5Version: MinUI5Version | undefined
): TablePersonalization[] => {
    const problems: TablePersonalization[] = [];

    const personalization = table.configuration.personalization.valueInFile;
    // Check if boolean value
    if (personalization === true || personalization === undefined) {
        // Every table personalization setting is enabled
        return [];
    }
    if (personalization === false) {
        // Every table personalization setting is disabled
        problems.push({
            type: TABLE_PERSONALIZATION,
            pageName: page.targetName,
            manifest: {
                uri: parsedApp.manifest.manifestUri,
                object: parsedApp.manifestObject,
                propertyPath: table.configuration.personalization.configurationPath
            }
        });
    } else {
        // Check personalization object properties
        const tableType = table.configuration.tableType.valueInFile;
        for (const key in PersonalizationProperties) {
            const property = key as PersonalizationProperty;
            if (personalization[property] === false) {
                if (property === 'group') {
                    const checkGroupForAnalyticalTable =
                        tableType === 'AnalyticalTable' &&
                        minUI5Version &&
                        !isLowerThanMinimalUi5Version(minUI5Version, { major: 1, minor: 108 });
                    const checkGroupForResponsiveTable =
                        tableType === 'ResponsiveTable' &&
                        minUI5Version &&
                        !isLowerThanMinimalUi5Version(minUI5Version, { major: 1, minor: 120 });
                    if (checkGroupForAnalyticalTable || checkGroupForResponsiveTable) {
                        problems.push({
                            type: TABLE_PERSONALIZATION,
                            pageName: page.targetName,
                            property,
                            manifest: {
                                uri: parsedApp.manifest.manifestUri,
                                object: parsedApp.manifestObject,
                                propertyPath: [...table.configuration.personalization.configurationPath, property]
                            }
                        });
                    }
                } else {
                    problems.push({
                        type: TABLE_PERSONALIZATION,
                        pageName: page.targetName,
                        property,
                        manifest: {
                            uri: parsedApp.manifest.manifestUri,
                            object: parsedApp.manifestObject,
                            propertyPath: [...table.configuration.personalization.configurationPath, property]
                        }
                    });
                }
            }
        }
    }
    return problems;
};

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: TABLE_PERSONALIZATION,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description:
                'You can use table personalization to modify the settings of a table. By default, the table personalization provides options for adding or removing columns, filtering, sorting, and grouping.',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-table-personalization.md'
        },
        messages: {
            [TABLE_PERSONALIZATION]:
                'Table personalization should be enabled. Currently every table personalization setting is disabled.',
            [TABLE_PERSONALIZATION_COLUMN]: 'Adding or removing table columns should be enabled.',
            [TABLE_PERSONALIZATION_FILTER]: 'Table data filtering should be enabled.',
            [TABLE_PERSONALIZATION_SORT]: 'Table data sorting should be enabled.',
            [TABLE_PERSONALIZATION_GROUP]:
                'Table data grouping should be enabled for analytical and responsive type tables.'
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
                    const tableProblems = checkPersonalizationValue(
                        table,
                        page,
                        parsedApp,
                        parsedApp.manifest.minUI5Version
                    );
                    problems.push(...tableProblems);
                }
            }
        }
        return problems;
    },
    createJsonVisitorHandler: (context, diagnostic, deepestPathResult) => {
        let messageId: MessageId = TABLE_PERSONALIZATION;
        if (diagnostic.property) {
            messageId = MessageIdByProperty[diagnostic.property];
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

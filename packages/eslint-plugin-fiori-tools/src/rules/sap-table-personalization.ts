import type { FioriRuleDefinition } from '../types';
import {
    type PersonalizationMessageId,
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

const PersonalizationProperties = ['column', 'filter', 'group', 'sort'];

const TABLE_PERSONALIZATION_COLUMN = 'sap-table-personalization-column';
const TABLE_PERSONALIZATION_FILTER = 'sap-table-personalization-filter';
const TABLE_PERSONALIZATION_SORT = 'sap-table-personalization-sort';
const TABLE_PERSONALIZATION_GROUP = 'sap-table-personalization-group';

const MessageIdByProperty: {
    [key: string]: PersonalizationMessageId;
} = {
    ['']: TABLE_PERSONALIZATION,
    column: TABLE_PERSONALIZATION_COLUMN,
    filter: TABLE_PERSONALIZATION_FILTER,
    sort: TABLE_PERSONALIZATION_SORT,
    group: TABLE_PERSONALIZATION_GROUP
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
                    const tableProblems = checkPersonalizationValue(table, page, parsedApp);
                    problems.push(...tableProblems);
                }
            }
        }
        return problems;
    },
    createJsonVisitorHandler: (context, diagnostic, deepestPathResult) => {
        return function report(node: MemberNode): void {
            diagnostic.manifest.loc = node.loc;
            return context.report({
                node,
                messageId: MessageIdByProperty[diagnostic.property ?? ''],
                fix: createJsonFixer({
                    context,
                    deepestPathResult,
                    node,
                    operation: 'update',
                    value: true,
                    fixParent: !!diagnostic.property
                })
            });
        };
    }
});

/**
 *
 * @param table
 * @param parsedApp
 * @param pageName
 * @returns
 */
function checkGroupProperty(table: Table, parsedApp: ParsedApp, pageName: string): TablePersonalization[] {
    const minUI5Version = parsedApp.manifest.minUI5Version;
    const tableType = table.configuration.tableType.valueInFile;
    const checkGroupForAnalyticalTable =
        tableType === 'AnalyticalTable' &&
        minUI5Version &&
        !isLowerThanMinimalUi5Version(minUI5Version, { major: 1, minor: 108 });
    const checkGroupForResponsiveTable =
        tableType === 'ResponsiveTable' &&
        minUI5Version &&
        !isLowerThanMinimalUi5Version(minUI5Version, { major: 1, minor: 120 });
    if (checkGroupForAnalyticalTable || checkGroupForResponsiveTable) {
        return [
            {
                type: TABLE_PERSONALIZATION,
                pageName,
                property: 'group',
                messageId: MessageIdByProperty['group'],
                manifest: {
                    uri: parsedApp.manifest.manifestUri,
                    object: parsedApp.manifestObject,
                    propertyPath: [...table.configuration.personalization.configurationPath, 'group']
                }
            }
        ];
    }
    return [];
}

/**
 *
 * @param table
 * @param page
 * @param parsedApp
 * @returns
 */
function checkPersonalizationValue(table: Table, page: FeV4PageType, parsedApp: ParsedApp): TablePersonalization[] {
    const problems: TablePersonalization[] = [];

    const personalization = table.configuration.personalization.valueInFile;
    // Check if boolean value
    if (personalization === true || personalization === undefined) {
        // Every table personalization setting is enabled
        return [];
    }
    if (personalization === false || Object.keys(personalization).length === 0) {
        // Every table personalization setting is disabled
        problems.push({
            type: TABLE_PERSONALIZATION,
            pageName: page.targetName,
            messageId: MessageIdByProperty[''],
            manifest: {
                uri: parsedApp.manifest.manifestUri,
                object: parsedApp.manifestObject,
                propertyPath: table.configuration.personalization.configurationPath
            }
        });
    } else {
        // Check personalization object properties
        for (const key of PersonalizationProperties) {
            const property = key as PersonalizationProperty;
            if (personalization[property] === false) {
                if (property === 'group') {
                    problems.push(...checkGroupProperty(table, parsedApp, page.targetName));
                } else {
                    problems.push({
                        type: TABLE_PERSONALIZATION,
                        pageName: page.targetName,
                        property,
                        messageId: MessageIdByProperty[property],
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
}

export default rule;

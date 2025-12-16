import { RuleVisitor } from '@eslint/core';
import { Edm, elementsWithName, Element } from '@sap-ux/odata-annotation-core';
import { MemberNode } from '@humanwhocodes/momoa';

import { createMixedRule } from '../language/rule-factory';
import type { FioriRuleDefinition } from '../types';
import {
    REQUIRE_WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE,
    RequireWidthIncludingColumnHeaderDiagnostic
} from '../language/diagnostics';

export type RequireWidthIncludingColumnHeaderOptions = {
    form: string;
};

const rule: FioriRuleDefinition = createMixedRule({
    ruleId: 'sap-require-width-including-column-header',
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description:
                'By default, the column width is calculated based on the type of the content. You can include the column header in the width calculation by setting this property to true',
            url: 'https://ui5.sap.com/#/topic/c0f6592a592e47f9bb6d09900de47412'
        },
        messages: {
            ['require-width-including-column-header']:
                'Small tables (< 6 columns) should use widthIncludingColumnHeader: true for better column width calculation.'
        },
        fixable: 'code'
    },
    check(context) {
        const problems: RequireWidthIncludingColumnHeaderDiagnostic[] = [];

        for (const [, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            if (app.type !== 'fe-v4') {
                continue;
            }
            for (const page of app.pages) {
                for (const table of page.tables) {
                    const [collection] = elementsWithName(Edm.Collection, table.annotation.top);
                    if (!collection) {
                        continue;
                    }
                    const records = elementsWithName(Edm.Record, collection);
                    if (records.length < 6 && records.length > 0 && table.widthIncludingColumnHeader !== true) {
                        const path = [
                            'sap.ui5',
                            'routing',
                            'targets',
                            page.targetName,
                            'options',
                            'settings',
                            'controlConfiguration',
                            table.controlConfigurationKey,
                            'tableSettings'
                        ];
                        problems.push({
                            type: REQUIRE_WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE,
                            manifestPropertyPath: path,
                            propertyName: 'widthIncludingColumnHeader',
                            annotation: {
                                file: table.annotation.source,
                                annotationPath: table.annotationPath,
                                annotation: table.annotation.top
                            }
                        });
                    }
                }
            }
        }

        return problems;
    },
    createJson(context, diagnostics) {
        if (diagnostics.length === 0) {
            return {};
        }
        const matchers: RuleVisitor = {};
        function report(node: MemberNode) {
            // The selector matches a Member node, we need its value (the Object)
            const tableSettingsObject = node.value;

            if (tableSettingsObject.type !== 'Object') {
                return;
            }

            // Check if widthIncludingColumnHeader already exists
            const property = tableSettingsObject.members.find(
                (member: MemberNode) =>
                    member.name.type === 'String' && member.name.value === 'widthIncludingColumnHeader'
            );

            if (property?.value?.type !== 'Boolean' || property.value.value !== true) {
                context.report({
                    node: tableSettingsObject,
                    messageId: 'require-width-including-column-header',
                    fix(fixer) {
                        // Check if required properties exist
                        if (!tableSettingsObject.loc || !tableSettingsObject.range) {
                            return null;
                        }

                        // Calculate indentation from the first member or use object position + 2 spaces
                        let propertyIndent = '';
                        let baseIndent = '';

                        if (tableSettingsObject.members.length > 0 && tableSettingsObject.members[0].loc) {
                            // Use existing member's indentation
                            propertyIndent = ' '.repeat(tableSettingsObject.members[0].loc.start.column);
                            // Base indent is 2 spaces less than property indent
                            baseIndent = ' '.repeat(Math.max(0, tableSettingsObject.members[0].loc.start.column - 2));
                        } else {
                            // Fallback: calculate from object position
                            baseIndent = ' '.repeat(tableSettingsObject.loc.start.column);
                            propertyIndent = baseIndent + '  ';
                        }

                        if (tableSettingsObject.members.length === 0) {
                            // Empty object
                            return fixer.replaceTextRange(
                                tableSettingsObject.range,
                                `{\n${propertyIndent}"widthIncludingColumnHeader": true\n${baseIndent}}`
                            );
                        }

                        // Build new object with existing properties + widthIncludingColumnHeader
                        const properties: string[] = [];
                        for (const member of tableSettingsObject.members) {
                            // Preserve all existing properties by extracting their raw text
                            if (!member.range) {
                                continue;
                            }
                            const memberStart = member.range[0];
                            const memberEnd = member.range[1];
                            const memberText = context.sourceCode.text.substring(memberStart, memberEnd);
                            properties.push(`${propertyIndent}${memberText.trim()}`);
                        }
                        properties.push(`${propertyIndent}"widthIncludingColumnHeader": true`);

                        const newContent = `{\n${properties.join(',\n')}\n${baseIndent}}`;
                        return fixer.replaceTextRange(tableSettingsObject.range, newContent);
                    }
                });
            }
        }
        for (const diagnostic of diagnostics) {
            matchers[context.sourceCode.createMatcherString(diagnostic.manifestPropertyPath)] = report;
        }
        return matchers;
    },
    createAnnotations(context, validationResult) {
        if (validationResult.length === 0) {
            return {};
        }

        const lookup = new Set<Element>();
        console.log(validationResult);
        for (const diagnostic of validationResult) {
            lookup.add(diagnostic.annotation?.annotation);
        }
        return {
            ['target>element[name="Annotation"]'](node: Element) {
                if (!lookup.has(node)) {
                    return;
                }

                context.report({
                    node: node,
                    messageId: 'require-width-including-column-header'
                });
            }
        };
    }
});

export default rule;

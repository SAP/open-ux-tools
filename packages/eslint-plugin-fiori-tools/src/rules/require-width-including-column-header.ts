import { UI_LINE_ITEM } from '../constants';
import { createMixedRule } from '../language/rule-factory';
import type { FioriMixedRuleDefinition } from '../types';
import { ServiceIndex } from '../project-context/facets/services';
import { Edm, elementsWithName, Element } from '@sap-ux/odata-annotation-core';
import {
    REQUIRE_WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE,
    RequireWidthIncludingColumnHeaderDiagnostic
} from '../language/diagnostics';
import { AnyNode } from '@humanwhocodes/momoa';
import { RuleVisitor } from '@eslint/core';
import { findPathsInObject } from '../utils/helpers';

export type RequireWidthIncludingColumnHeaderOptions = {
    form: string;
};

interface PathFilterContext {
    indexedService?: ServiceIndex;
}

interface PathFilterMetadata {
    fullyQualifiedName: string;
}

type PathFilter = (
    value: any,
    key: string,
    path: string[],
    ctx?: PathFilterContext
) => PathFilterMetadata | undefined;

const pathTemplate = [
    'sap.ui5',
    'routing',
    'targets',
    '{targetName}',
    'options',
    'settings',
    'controlConfiguration?',
    `@${UI_LINE_ITEM}?`,
    'tableSettings?',
    'widthIncludingColumnHeader?'
];

const pathFilters: Record<string, PathFilter> = {
    targetName: (value, key, path, ctx) => {
        const target = value as any;

        // Check target type
        if (target?.type !== 'Component' || target?.name !== 'sap.fe.templates.ListReport') {
            return;
        }

        // Extract and validate contextPath
        const contextPath =
            target.options?.settings?.contextPath ??
            (target.options?.settings?.entitySet ? `/${target.options.settings.entitySet}` : undefined);

        if (!contextPath) {
            return;
        }

        const targetSegments = contextPath.split('/');
        if (targetSegments.length !== 2) {
            // TODO: support different target paths
            return;
        }

        const entitySetName = targetSegments[1];
        const fullyQualifiedName = ctx?.indexedService?.entitySets[entitySetName]?.structuredType;

        if (!fullyQualifiedName) {
            return;
        }

        // Return metadata containing the computed fullyQualifiedName
        return { fullyQualifiedName };
    }
};

const rule: FioriMixedRuleDefinition = createMixedRule({
    ruleId: REQUIRE_WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE,
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
        }
    },
    check(context) {
        const problems: RequireWidthIncludingColumnHeaderDiagnostic[] = [];

        for (const app of Object.values(context.sourceCode.projectContext.index.apps)) {
            const manifest = app.manifestObject;
            const indexedService = context.sourceCode.projectContext.getIndexedServiceForMainService(app);
            if (!indexedService) {
                continue;
            }

            // Find all ListReport targets with LineItem control configurations
            // Using optional segments to match paths at any depth
            const pathMatches = findPathsInObject(manifest, pathTemplate, pathFilters, { indexedService });

            // Build lineItemReferences with computed report paths
            const lineItemReferences = pathMatches.map((match) => {
                const hasWidthProp = match.path.length >= pathTemplate.length;

                return {
                    entityTypeName: match.metadata?.fullyQualifiedName,
                    value: match.value,
                    annotationPath: '@' + UI_LINE_ITEM,
                    targetName: match.wildcardValues.targetName,
                    reportPath: match.path,
                    widthIncludingColumnHeader: hasWidthProp ? match.value : undefined
                };
            });

            // TODO: it is better to loop through pages as they are usually less than annotations
            // TODO: check presentation variants
            for (const annotationsByQualifier of Object.values(indexedService.annotations).values()) {
                for (const annotation of Object.values(annotationsByQualifier)) {
                    if (annotation.term !== UI_LINE_ITEM) {
                        continue;
                    }
                    const [collection] = elementsWithName(Edm.Collection, annotation.top);
                    if (!collection) {
                        continue;
                    }
                    const records = elementsWithName(Edm.Record, collection);
                    // Skip if wrong number of records (only check tables with 1-5 columns)
                    if (records.length === 0 || records.length >= 6) {
                        continue;
                    }

                    for (const ref of lineItemReferences) {
                        // Skip if target doesn't match or has qualifier
                        if (annotation.target !== ref.entityTypeName || annotation.qualifier !== undefined) {
                            continue;
                        }

                        // Skip if widthIncludingColumnHeader is already set to true
                        if (ref.widthIncludingColumnHeader === true) {
                            continue;
                        }

                        problems.push({
                            type: REQUIRE_WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE,
                            manifestPropertyPath: ref.reportPath,
                            propertyName: 'widthIncludingColumnHeader',
                            annotation: {
                                file: annotation.source,
                                annotationPath: ref.annotationPath,
                                annotation: annotation.top
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
        function report(node: AnyNode) {
            context.report({
                node,
                messageId: 'require-width-including-column-header'
            });
        }
        for (const diagnostic of diagnostics) {
            matchers[createMatcherString(diagnostic.manifestPropertyPath)] = report;
        }
        return matchers;
    },
    createAnnotations(context, validationResult) {
        if (validationResult.length === 0) {
            return {};
        }
        const lookup = new Set<Element>();
        for (const diagnostic of validationResult) {
            lookup.add((diagnostic as RequireWidthIncludingColumnHeaderDiagnostic).annotation?.annotation);
        }
        return {
            ['target>element[name="Annotation"]'](node: Element) {
                if (lookup.has(node)) {
                    context.report({
                        node,
                        messageId: 'require-width-including-column-header'
                    });
                }
            }
        };
    }
});

/**
 * Creates a CSS selector string for matching a path in the manifest JSON.
 *
 * @param path - Array of path segments
 * @returns CSS selector string for ESLint JSON matching
 */
function createMatcherString(path: string[]) {
    return path.map((segment) => `Member[name.value="${segment}"]`).join(' ');
}

export default rule;
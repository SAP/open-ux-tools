import { UI_LINE_ITEM } from '../constants';
import type { XMLElement } from '@xml-tools/ast';
import { createMixedRule } from '../language/rule-factory';
import type { FioriMixedRuleDefinition } from '../types';
import { IndexedAnnotation } from '../project-context/facets/services';
import { Edm, elementsWithName, Element } from '@sap-ux/odata-annotation-core';
import {
    REQUIRE_WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE,
    RequireWidthIncludingColumnHeaderDiagnostic
} from '../language/diagnostics';
import { AnyNode, ObjectNode } from '@humanwhocodes/momoa';
import { RuleVisitor } from '@eslint/core';
import { findPathsInObject } from '../utils/helpers';

export type RequireWidthIncludingColumnHeaderOptions = {
    form: string;
};

/**
 * Gets the path to the last property in an object.
 * Useful for reporting errors at the location of the last existing property.
 *
 * @param basePath - The base path array to the object.
 * @param obj - The plain JavaScript object to find the last property in.
 * @returns The path array pointing to the last property, or the base path if no properties exist.
 */
function getLastMemberPath(basePath: string[], obj: any): string[] {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
        return basePath;
    }
    const keys = Object.keys(obj);
    if (keys.length === 0) {
        return basePath;
    }
    const lastKey = keys[keys.length - 1];
    return [...basePath, lastKey];
}

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

        for (const [, app] of Object.entries(context.sourceCode.projectContext.index.apps)) {
            const manifest = app.manifestObject;
            const indexedService = context.sourceCode.projectContext.getIndexedServiceForMainService(app);
            if (!indexedService) {
                continue;
            }
            
            // Find all ListReport targets with LineItem control configurations
            // All validation logic is now in the filter predicates
            const pathMatches = findPathsInObject(
                manifest,
                ['sap.ui5', 'routing', 'targets', '{targetName}', 'options', 'settings', 'controlConfiguration', '{annotationPath}'],
                {
                    targetName: (value, key, path, ctx) => {
                        const target = value as any;
                        
                        // Check target type
                        if (target?.type !== 'Component' || target?.name !== 'sap.fe.templates.ListReport') {
                            return false;
                        }
                        
                        // Extract and validate contextPath
                        const contextPath = 
                            target.options?.settings?.contextPath ??
                            (target.options?.settings?.entitySet ? `/${target.options.settings.entitySet}` : undefined);
                        
                        if (!contextPath) {
                            return false;
                        }
                        
                        const targetSegments = contextPath.split('/');
                        if (targetSegments.length !== 2) {
                            // TODO: support different target paths
                            return false;
                        }
                        
                        const entitySetName = targetSegments[1];
                        const fullyQualifiedName = ctx?.indexedService?.entitySets[entitySetName]?.structuredType;
                        
                        if (!fullyQualifiedName) {
                            return false;
                        }
                        
                        // Return pass with metadata containing the computed fullyQualifiedName
                        return {
                            pass: true,
                            metadata: { fullyQualifiedName }
                        };
                    },
                    annotationPath: (value, key) => key === '@' + UI_LINE_ITEM
                },
                { indexedService }
            );

            // Build lineItemReferences directly from matches
            const lineItemReferences = pathMatches.map(match => ({
                entityTypeName: match.metadata?.fullyQualifiedName,
                value: match.value,
                annotationPath: match.wildcardValues.annotationPath,
                targetName: match.wildcardValues.targetName,
                basePath: match.path
            }));

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
                    if (records.length < 6 && records.length > 0) {
                        for (const ref of lineItemReferences) {
                            if (annotation.target === ref.entityTypeName && annotation.qualifier === undefined) {
                                const tableSettings = (ref.value as any)?.tableSettings;
                                const widthIncludingColumnHeader = tableSettings?.widthIncludingColumnHeader;
                                if (widthIncludingColumnHeader !== true) {
                                    let path: string[];
                                    if (widthIncludingColumnHeader !== undefined) {
                                        path = [...ref.basePath, 'tableSettings', 'widthIncludingColumnHeader'];
                                    } else if (tableSettings) {
                                        path = getLastMemberPath([...ref.basePath, 'tableSettings'], tableSettings);
                                    } else {
                                        path = getLastMemberPath(ref.basePath, ref.value);
                                    }
                                    
                                    problems.push({
                                        type: REQUIRE_WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE,
                                        manifestPropertyPath: path,
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
        const aliasMap = context.sourceCode.getAliasMap();
        const lookup = new Set<Element>();
        for (const diagnostic of validationResult) {
            lookup.add((diagnostic as RequireWidthIncludingColumnHeaderDiagnostic).annotation?.annotation);
        }
        return {
            ['target>element[name="Annotation"]'](node: Element) {
                if (!lookup.has(node)) {
                    return;
                }

                // if (node.attributes.length === 0) {
                //     return;
                // }

                // const termAttribute = node.attributes.find((attr) => attr.key === 'Term');
                // if (!termAttribute) {
                //     return;
                // }
                // const qualifier = node.attributes.find((attr) => attr.key === 'Qualifier');
                // if (qualifier) {
                //     // TODO: check if empty qualifier is ok
                //     return; // skip qualified annotations
                // }
                // const fullyQualifiedTermName = getFullyQualifiedName(aliasMap, termAttribute.value ?? '');
                // if (fullyQualifiedTermName !== result.annotation.term) {
                //     return;
                // }

                // if (node.parent?.type !== 'XMLElement') {
                //     return;
                // }
                // const targetPath = node.parent.attributes.find((attribute) => attribute.key === 'Target')?.value ?? '';
                // if (!targetPath) {
                //     return;
                // }

                // const [targetName, ...rest] = targetPath.split('/');
                // if (rest.length > 0) {
                //     return; // line item can only be on entity
                // }
                // const fullyQualifiedTargetName = getFullyQualifiedName(aliasMap, targetName);

                // if (fullyQualifiedTargetName !== result.annotation.target) {
                //     return;
                // }

                // if (node.syntax?.openBody !== undefined) {
                context.report({
                    node: node,
                    messageId: 'require-width-including-column-header'
                });
                // }
            }
        };
    }
});

/**
 *
 * @param path
 */
function createMatcherString(path: string[]) {
    return path.map((segment) => `Member[name.value="${segment}"]`).join(' ');
}

export default rule;

/**
 *
 * @param aliasMap
 * @param name
 */
function getFullyQualifiedName(aliasMap: Record<string, string>, name: string): string | undefined {
    const nameSegments = name.split('.');
    const simpleIdentifier = nameSegments.pop();
    if (!simpleIdentifier) {
        return;
    }
    const targetNamespaceOrAlias = nameSegments.join('.');
    const resolvedNamespace = aliasMap[targetNamespaceOrAlias] ?? targetNamespaceOrAlias;
    if (!resolvedNamespace) {
        return;
    }
    return `${resolvedNamespace}.${simpleIdentifier}`;
}

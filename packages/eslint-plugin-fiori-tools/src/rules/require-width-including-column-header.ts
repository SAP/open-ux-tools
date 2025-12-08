import { UI_LINE_ITEM } from '../constants';
import type { XMLElement } from '@xml-tools/ast';
import { createMixedRule } from '../language/rule-factory';
import type { FioriMixedRuleDefinition } from '../types';
import { IndexedAnnotation } from '../project-context/facets/services';
import { Edm, elementsWithName, Element } from '@sap-ux/odata-annotation-core';

export type RequireWidthIncludingColumnHeader = 'require-width-including-column-header';
export type RequireWidthIncludingColumnHeaderOptions = {
    form: string;
};

const rule: FioriMixedRuleDefinition = createMixedRule({
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
        const problems: any[] = [];
        const smallTables: IndexedAnnotation[] = [];
        const manifest = context.sourceCode.projectContext.getManifest();
        if (!manifest) {
            return problems;
        }
        const targets = manifest['sap.ui5']?.routing?.targets ?? {};
        const lineItemReferences = [];
        for (const [targetName, target] of Object.entries(targets)) {
            if (target.type === 'Component' && target.name === 'sap.fe.templates.ListReport') {
                const settings = target.options?.settings;
                if (!settings) {
                    continue;
                }
                if (!settings.controlConfiguration) {
                    continue;
                }
                for (const [key, value] of Object.entries(settings.controlConfiguration)) {
                    // Parse navigation path and term from key
                    // Key format: "@com.sap.vocabularies.UI.v1.LineItem" or "_BookSupplement/@com.sap.vocabularies.UI.v1.LineItem"
                    if (!key.startsWith('@') && !key.includes('/@')) {
                        continue;
                    }
                    
                    let navigationPath: string | undefined;
                    let termPart: string;
                    
                    if (key.includes('/@')) {
                        // Navigation-based: "_BookSupplement/@com.sap.vocabularies.UI.v1.LineItem"
                        const segments = key.split('/@');
                        navigationPath = segments[0];
                        termPart = segments[1];
                    } else {
                        // Direct: "@com.sap.vocabularies.UI.v1.LineItem"
                        navigationPath = undefined;
                        termPart = key.substring(1); // Remove @ prefix
                    }
                    
                    const [term, qualifier] = termPart.split('#');
                    if (term !== UI_LINE_ITEM) {
                        continue;
                    }

                    const contextPath =
                        target.options?.settings?.contextPath ??
                        (target.options?.settings?.entitySet ? `/${target.options.settings.entitySet}` : undefined);
                    if (!contextPath) {
                        continue;
                    }
                    const targetSegments = contextPath.split('/');
                    if (targetSegments.length !== 2) {
                        continue;
                    }
                    const entitySetName = targetSegments[1];
                    const indexedService = context.sourceCode.projectContext.getIndexedServiceForMainService();
                    if (!indexedService) {
                        continue;
                    }
                    const { metadataService } = indexedService;
                    const fullyQualifiedName = indexedService.entitySets[entitySetName]?.structuredType;
                    if (!fullyQualifiedName) {
                        continue;
                    }
                    // const metadataElement = metadataService.getMetadataElement(fullyQualifiedName);
                    let targetEntityTypeName = fullyQualifiedName;
                    
                    // Resolve navigation path if present
                    if (navigationPath) {
                        
                        let foundNavProperty: any = null;
                        metadataService.visitMetadataElements((element) => {
                            if (element.kind === 'NavigationProperty' && 
                                element.name === navigationPath) {
                                if (element.path.startsWith(fullyQualifiedName)) {
                                    foundNavProperty = element;
                                }
                            }
                        });
                        
                        if (foundNavProperty && foundNavProperty.structuredType) {
                            targetEntityTypeName = foundNavProperty.structuredType;
                        } else {
                            continue;
                        }
                    }
                    
                    lineItemReferences.push({
                        entityTypeName: targetEntityTypeName,
                        value,
                        annotationPath: key,
                        targetName,
                        qualifier: qualifier,
                        navigationPath: navigationPath
                    });
                }
            }
        }
        const index = context.sourceCode.projectContext.getIndexedServiceForMainService()?.annotations;
        // TODO: it is better to loop through pages as they are usually less than annotations
        // TODO: check presentation variants
        for (const annotationsByQualifier of Object.values(index ?? {}).values()) {
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
                        const qualifierMatches = annotation.qualifier === ref.qualifier;
                        if (annotation.target === ref.entityTypeName && qualifierMatches) {
                            const hasWidth = (ref.value as any)?.tableSettings?.widthIncludingColumnHeader === true;
                            if (!hasWidth) {
                                problems.push({
                                    annotation,
                                    targetName: ref.targetName,
                                    annotationPath: ref.annotationPath
                                });
                            }
                        }
                    }
                    smallTables.push(annotation);
                }
            }
        }
        return problems;
    },
    createJson(context, validationResult) {
        if (validationResult.length === 0) {
            return {};
        }
        const path = [
            'sap.ui5',
            'routing',
            'targets',
            validationResult[0].targetName,
            'options',
            'settings',
            'controlConfiguration',
            validationResult[0].annotationPath,
            'tableSettings'
        ];
        return {
            [createMatcherString(path)](node) {
                // const ancestors = context.sourceCode.getAncestors(node);

                context.report({
                    node,
                    messageId: 'require-width-including-column-header'
                });
            }
        };
    },
    createXml(context, validationResult) {
        if (validationResult.length === 0) {
            return {};
        }
        const aliasMap = context.sourceCode.getAliasMap();

        return {
            ['XMLElement[name="Annotation"]'](node: XMLElement) {
                const result = validationResult[0];

                if (node.attributes.length === 0) {
                    return;
                }

                const termAttribute = node.attributes.find((attr) => attr.key === 'Term');
                if (!termAttribute) {
                    return;
                }
                const qualifier = node.attributes.find((attr) => attr.key === 'Qualifier');
                if (qualifier) {
                    // TODO: check if empty qualifier is ok
                    return; // skip qualified annotations
                }
                const fullyQualifiedTermName = getFullyQualifiedName(aliasMap, termAttribute.value ?? '');
                if (fullyQualifiedTermName !== result.annotation.term) {
                    return;
                }

                if (node.parent?.type !== 'XMLElement') {
                    return;
                }
                const targetPath = node.parent.attributes.find((attribute) => attribute.key === 'Target')?.value ?? '';
                if (!targetPath) {
                    return;
                }

                const [targetName, ...rest] = targetPath.split('/');
                if (rest.length > 0) {
                    return; // line item can only be on entity
                }
                const fullyQualifiedTargetName = getFullyQualifiedName(aliasMap, targetName);

                if (fullyQualifiedTargetName !== result.annotation.target) {
                    return;
                }

                if (node.syntax?.openBody !== undefined) {
                    context.report({
                        node: node.syntax.openBody,
                        messageId: 'require-width-including-column-header'
                    });
                }
            }
        };
    },
    createAnnotations(context, validationResult) {
        if (validationResult.length === 0) {
            return {};
        }
        const aliasMap = context.sourceCode.getAliasMap();
        // const path =
        return {
            ['target>element[name="Annotation"]'](node: Element) {
                const result = validationResult[0];
                if (node !== result.annotation.top) {
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

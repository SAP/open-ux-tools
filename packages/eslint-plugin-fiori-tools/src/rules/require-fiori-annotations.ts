import type { XMLElement } from '@xml-tools/ast';
import type { FioriXMLRuleDefinition } from '../language/xml/types';
import { UI_LINE_ITEM } from '../constants';

export type RequireLineItemAnnotations = 'require-line-item-annotation';
export type RequireFacetsAnnotations = 'require-facets-annotation';
export type RequireFioriAnnotationsOptions = {
    listReport?: {
        lineItem?: boolean;
    };
    objectPage?: {
        facets?: boolean;
    };
};

export default {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'rule',
            recommended: true
            // url: null // URL to the documentation page for this rule
        },
        schema: [], // Add a schema if the rule has options
        messages: {
            ['require-line-item-annotation']: 'LineItem annotation is required for ListReport pages.',
            ['require-facets-annotation']: 'Facets annotation is required for ObjectPage pages.'
        } // Add messageId and message
    },

    create(context) {
        // variables should be defined here

        //----------------------------------------------------------------------
        // Helpers
        //----------------------------------------------------------------------

        // any helper functions should go here or else delete this section

        //----------------------------------------------------------------------
        // Public
        //----------------------------------------------------------------------

        return {
            // visitor functions for different types of nodes
            'XMLElement[name="Schema"]': (node: XMLElement) => {
                const namespaceAlias = node.ns ?? '::DEFAULT';
                const namespace = node.namespaces[namespaceAlias];
                if (namespace !== 'http://docs.oasis-open.org/odata/ns/edm') {
                    return;
                }
                const manifest = context.sourceCode.projectContext.getManifest();
                if (!manifest) {
                    return;
                }
                const targets = manifest['sap.ui5']?.routing?.targets ?? {};
                // TODO: check if we need to somehow cache this to avoid looping every time
                for (const target of Object.values(targets)) {
                    if (target.type === 'Component' && target.name === 'sap.fe.templates.ListReport') {
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
                        for (const annotations of node.subElements) {
                            const targetPath =
                                annotations.attributes.find((attribute) => attribute.key === 'Target')?.value ?? '';
                            if (!targetPath) {
                                return;
                            }
                            const aliasMap = context.sourceCode.getAliasMap();
                            const [targetName, ...rest] = targetPath.split('/');
                            if (rest.length > 0) {
                                return; // line item can only be on entity
                            }

                            // now we have the full target namespace, check if it matches the entity set

                            // const entitySet = context.sourceCode.projectContext.getAnnotationIndexForMainService.schema.entitySets.find(
                            //     (x) => x.name === entitySetName
                            // );
                            return;
                            // const fullyQualifiedTargetName = getFullyQualifiedName(aliasMap, targetName);

                            // if (fullyQualifiedTargetName === entitySet?.entityTypeName) {
                            //     // found the relevant Annotations element
                            //     const hasLineItem = annotations.subElements.some((subElement) => {
                            //         if (subElement.type !== 'XMLElement' || subElement.name !== 'Annotation') {
                            //             return false;
                            //         }
                            //         if (subElement.attributes.length === 0) {
                            //             return false;
                            //         }
                            //         const termAttribute = subElement.attributes.find((attr) => attr.key === 'Term');
                            //         if (!termAttribute) {
                            //             return false;
                            //         }
                            //         const qualifier = subElement.attributes.find((attr) => attr.key === 'Qualifier');
                            //         if (qualifier) {
                            //             // TODO: check if empty qualifier is ok
                            //             return false; // skip qualified annotations
                            //         }
                            //         const fullyQualifiedTermName = getFullyQualifiedName(
                            //             aliasMap,
                            //             termAttribute.value ?? ''
                            //         );

                            //         return fullyQualifiedTermName === UI_LINE_ITEM;
                            //     });
                            //     if (!hasLineItem && node.syntax?.openBody !== undefined) {
                            //         context.report({
                            //             node: node.syntax.openBody,
                            //             messageId: 'require-line-item-annotation'
                            //         });
                            //         return;
                            //     }
                            // }
                        }
                    }
                }
            }
        };
    }
} satisfies FioriXMLRuleDefinition<{
    RuleOptions: [RequireFioriAnnotationsOptions];
    MessageIds: RequireLineItemAnnotations | RequireFacetsAnnotations;
}>;

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

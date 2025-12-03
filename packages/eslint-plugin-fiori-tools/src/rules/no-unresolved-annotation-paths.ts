import type { MemberNode } from '@humanwhocodes/momoa';
import type { FioriJSONRuleDefinition } from '../language/json/types';
import { Edm, elementsWithName } from '@sap-ux/odata-annotation-core';
import { IndexedAnnotation } from '../project-context/facets/services';

export type NoUnresolvedAnnotationPaths = 'no-unresolved-annotation-paths';
export type NoUnresolvedAnnotationPathsOptions = {};

const rule: FioriJSONRuleDefinition<{
    RuleOptions: [NoUnresolvedAnnotationPathsOptions];
    MessageIds: NoUnresolvedAnnotationPaths;
}> = {
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true
            // description:
            //     'By default, the column width is calculated based on the type of the content. You can include the column header in the width calculation by setting this property to true',
            // url: 'https://ui5.sap.com/#/topic/c0f6592a592e47f9bb6d09900de47412'
        },
        schema: [],
        messages: {
            ['no-unresolved-annotation-paths']: 'Could not find related annotation'
        },
        fixable: 'code'
    },

    create(context) {
        const smallTables: IndexedAnnotation[] = [];
        const index = context.sourceCode.projectContext.getIndexedServiceForMainService()?.annotations;
        for (const annotationsByQualifier of Object.values(index ?? {}).values()) {
            for (const annotation of Object.values(annotationsByQualifier)) {
                const [collection] = elementsWithName(Edm.Collection, annotation.top);
                if (!collection) {
                    continue;
                }
                const records = elementsWithName(Edm.Record, collection);
                if (records.length < 6 && records.length > 0) {
                    smallTables.push(annotation);
                }
            }
        }
        return {
            'Member[name.value="sap.ui5"]  Member[name.value="routing"] Member[name.value="targets"] Member'(
                node: MemberNode
            ): void {
                const targetName = node.name.type === 'String' ? node.name.value : undefined;
                if (!targetName) {
                    return;
                }
                const ancestors = context.sourceCode.getAncestors(node);

                const targetOptions = getChildWithName('options', node);
                if (!targetOptions) {
                    return;
                }
                const settings = getChildWithName('settings', targetOptions);
                if (!settings) {
                    return;
                }

                const contextPath = getContextPath(settings);
                if (!contextPath) {
                    return;
                }
                const controlConfiguration = getChildWithName('controlConfiguration', settings)?.value;
                if (controlConfiguration?.type !== 'Object') {
                    return;
                }
                const targetSegments = contextPath.split('/');
                if (targetSegments.length !== 2) {
                    // TODO: support different target paths
                    return;
                }
                const entitySetName = targetSegments[1];
                // const entitySet = context.sourceCode.projectContext.metadata.schema.entitySets.find(
                //     (x) => x.name === entitySetName
                // );
                // if (!entitySet) {
                    return;
                // }

                // for (const member of controlConfiguration.members) {
                //     if (member.name.type === 'String') {
                //         if (!member.name.value.startsWith('@')) {
                //             continue;
                //         }
                //         const [term, qualifier] = member.name.value.substring(1).split('#');
                //         const annotation = context.sourceCode.projectContext.lookupAnnotation(
                //             entitySet.entityTypeName,
                //             term,
                //             qualifier
                //         );
                //         if (!annotation) {
                //             context.report({
                //                 node: member.name,
                //                 messageId: 'no-unresolved-annotation-paths'
                //             });
                //         }
                //     }
                // }
                return;
            }
        };
    }
};

/**
 *
 * @param node
 * @returns
 */
function getContextPath(node: MemberNode): string | undefined {
    const contextPathNode = getChildWithName('contextPath', node);
    if (contextPathNode && contextPathNode.value.type === 'String') {
        return contextPathNode.value.value;
    }
    const entitySet = getChildWithName('entitySet', node);
    if (entitySet && entitySet.value.type === 'String') {
        return entitySet.value.value;
    }
    return undefined;
}

/**
 *
 * @param name
 * @param node
 * @returns
 */
function getChildWithName(name: string, node: MemberNode): MemberNode | undefined {
    if (node.value.type !== 'Object') {
        return undefined;
    }
    for (const member of node.value.members) {
        if (member.name.type === 'String' && member.name.value === name) {
            return member;
        }
    }
    return undefined;
}

export default rule;

import type { Element, AliasInformation } from '@sap-ux/odata-annotation-core';
import {
    Edm,
    getElementAttributeValue,
    toFullyQualifiedName,
    parseIdentifier,
    ELEMENT_TYPE
} from '@sap-ux/odata-annotation-core';

import { createFioriRule } from '../language/rule-factory';
import type { FioriRuleDefinition } from '../types';
import { TEXT_ARRANGEMENT_HIDDEN, type TextArrangementHidden } from '../language/diagnostics';
import { buildAnnotationIndexKey } from '../project-context/parser';
import type { ParsedService } from '../project-context/parser';
import { COMMON_TEXT, UI_HIDDEN } from '../constants';

/**
 * Resolves a path expression relative to an entity type to find the entity type and property of the target.
 *
 * For example, given entity type "IncidentService.Incidents" and path "category/name",
 * it navigates through the "category" navigation property to find "IncidentService.Category",
 * and returns { entityTypeName: "IncidentService.Category", propertyName: "name" }.
 *
 * @param entityTypeName - Fully-qualified name of the starting entity type
 * @param textPath - Path expression (e.g. "category/name" or "name")
 * @param service - The parsed OData service
 * @returns Resolved entity type name and property name, or undefined if resolution fails
 */
function resolveTextPropertyPath(
    entityTypeName: string,
    textPath: string,
    service: ParsedService
): { entityTypeName: string; propertyName: string } | undefined {
    const segments = textPath.split('/');
    if (segments.length === 0) {
        return undefined;
    }

    const propertyName = segments[segments.length - 1];
    let currentEntityTypeName = entityTypeName;

    for (let i = 0; i < segments.length - 1; i++) {
        const segment = segments[i];
        const entityTypeElement = service.artifacts.metadataService.getMetadataElement(currentEntityTypeName);
        if (!entityTypeElement) {
            return undefined;
        }
        const navProp = entityTypeElement.content.find((child) => child.name === segment);
        if (!navProp?.structuredType) {
            return undefined;
        }
        currentEntityTypeName = navProp.structuredType;
    }

    return { entityTypeName: currentEntityTypeName, propertyName };
}

/**
 * Checks whether a Common.Text annotation element has a nested UI.TextArrangement inline annotation.
 * This is the standard real-world pattern:
 *   <Annotation Term="Common.Text" Path="...">
 *     <Annotation Term="UI.TextArrangement" .../>
 *   </Annotation>
 *
 * @param textElement - The Common.Text annotation element
 * @param aliasInfo - Alias information for the file containing the annotation
 * @returns True if an inline UI.TextArrangement child annotation was found
 */
function hasInlineTextArrangement(textElement: Element, aliasInfo: AliasInformation | undefined): boolean {
    if (!aliasInfo) {
        return false;
    }
    for (const child of textElement.content) {
        if (child.type !== ELEMENT_TYPE) {
            continue;
        }
        const childElement = child as Element;
        if (childElement.name !== Edm.Annotation) {
            continue;
        }
        const childTerm = getElementAttributeValue(childElement, Edm.Term);
        if (!childTerm) {
            continue;
        }
        const qualifiedTerm = toFullyQualifiedName(
            aliasInfo.aliasMap,
            aliasInfo.currentFileNamespace,
            parseIdentifier(childTerm)
        );
        if (qualifiedTerm === 'com.sap.vocabularies.UI.v1.TextArrangement') {
            return true;
        }
    }
    return false;
}

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: TEXT_ARRANGEMENT_HIDDEN,
    meta: {
        type: 'problem',
        docs: {
            recommended: true,
            description:
                'The description (text) property referenced by a UI.TextArrangement annotation must not have UI.Hidden set to true',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-text-arrangement-hidden.md'
        },
        messages: {
            [TEXT_ARRANGEMENT_HIDDEN]:
                'The text property "{{textPropertyPath}}" referenced via Common.Text on "{{targetPath}}" is hidden (UI.Hidden). Remove the UI.Hidden annotation from the text property or set it to false.'
        }
    },

    check(context) {
        const problems: TextArrangementHidden[] = [];

        for (const parsedApp of Object.values(context.sourceCode.projectContext.index.apps)) {
            for (const parsedService of Object.values(parsedApp.services)) {
                for (const [annotationKey, qualifiedAnnotations] of Object.entries(parsedService.index.annotations)) {
                    const atIdx = annotationKey.indexOf('/@');
                    if (atIdx === -1) {
                        continue;
                    }

                    const targetPath = annotationKey.substring(0, atIdx);
                    const term = annotationKey.substring(atIdx + 2);

                    // Only process Common.Text annotations
                    if (term !== COMMON_TEXT) {
                        continue;
                    }

                    // Only handle property-level annotations (path must contain '/')
                    const slashIdx = targetPath.indexOf('/');
                    if (slashIdx === -1) {
                        continue;
                    }

                    const entityTypeName = targetPath.substring(0, slashIdx);

                    for (const textAnnotation of Object.values(qualifiedAnnotations)) {
                        const textElement = textAnnotation.top.value;
                        const textPath = getElementAttributeValue(textElement, Edm.Path);
                        if (!textPath) {
                            continue;
                        }

                        // UI.TextArrangement must appear as a nested inline annotation
                        // inside the Common.Text element — the only valid form per the vocabulary spec
                        const aliasInfo = parsedService.artifacts.aliasInfo[textAnnotation.top.uri];
                        const hasTextArrangement = hasInlineTextArrangement(textElement, aliasInfo);

                        if (!hasTextArrangement) {
                            continue;
                        }

                        // Resolve the text path to find the entity type and property
                        const resolved = resolveTextPropertyPath(entityTypeName, textPath, parsedService);
                        if (!resolved) {
                            continue;
                        }

                        const textPropertyTarget = `${resolved.entityTypeName}/${resolved.propertyName}`;

                        // Check whether UI.Hidden is set on the text property
                        const hiddenKey = buildAnnotationIndexKey(textPropertyTarget, UI_HIDDEN);
                        const hiddenAnnotations = parsedService.index.annotations[hiddenKey];
                        if (!hiddenAnnotations) {
                            continue;
                        }

                        for (const hiddenAnnotation of Object.values(hiddenAnnotations)) {
                            const hiddenElement = hiddenAnnotation.top.value;

                            // Skip when explicitly set to false (Bool="false" means not hidden)
                            const boolVal = getElementAttributeValue(hiddenElement, Edm.Bool);
                            if (boolVal === 'false') {
                                continue;
                            }

                            // Skip dynamic path expressions — visibility cannot be determined statically
                            const dynamicPath = getElementAttributeValue(hiddenElement, Edm.Path);
                            if (dynamicPath) {
                                continue;
                            }

                            problems.push({
                                type: TEXT_ARRANGEMENT_HIDDEN,
                                annotation: {
                                    reference: hiddenAnnotation.top,
                                    textPropertyPath: textPropertyTarget,
                                    targetWithTextArrangement: targetPath
                                }
                            });
                        }
                    }
                }
            }
        }

        return problems;
    },

    createAnnotations(context, validationResult) {
        if (validationResult.length === 0) {
            return {};
        }

        const lookup = new Map<Element, TextArrangementHidden>();
        for (const diagnostic of validationResult) {
            lookup.set(diagnostic.annotation.reference.value as Element, diagnostic);
        }

        return {
            ['target>element[name="Annotation"]'](node: Element) {
                const diagnostic = lookup.get(node);
                if (!diagnostic) {
                    return;
                }
                context.report({
                    node,
                    messageId: TEXT_ARRANGEMENT_HIDDEN,
                    data: {
                        textPropertyPath: diagnostic.annotation.textPropertyPath,
                        targetPath: diagnostic.annotation.targetWithTextArrangement
                    }
                });
            }
        };
    }
});

export default rule;

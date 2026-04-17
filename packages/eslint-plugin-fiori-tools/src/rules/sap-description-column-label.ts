import type { Element } from '@sap-ux/odata-annotation-core';
import { Edm, getElementAttributeValue } from '@sap-ux/odata-annotation-core';

import { createFioriRule } from '../language/rule-factory';
import type { FioriRuleDefinition } from '../types';
import {
    DESCRIPTION_COLUMN_LABEL,
    type DescriptionColumnLabel,
    type DescriptionColumnLabelMessageId
} from '../language/diagnostics';
import { buildAnnotationIndexKey } from '../project-context/parser';
import type { IndexedAnnotation, ParsedService } from '../project-context/parser';
import { COMMON_TEXT, COMMON_LABEL } from '../constants';
import { resolveTextPropertyPath, collectRelevantEntityTypes } from './utils/common-text-helpers';

/**
 * Labels that are considered trivially non-descriptive regardless of context.
 */
const TRIVIAL_LABELS = new Set(['name', 'description']);

/**
 * Reads a Common.Label String value from the annotation index.
 *
 * @param propertyTarget - Fully-qualified target path (e.g. "Service.Entity/prop")
 * @param service - The parsed OData service
 * @returns The label string, or undefined if not found
 */
function getLabelForProperty(propertyTarget: string, service: ParsedService): string | undefined {
    const labelKey = buildAnnotationIndexKey(propertyTarget, COMMON_LABEL);
    const labelAnnotations = service.index.annotations[labelKey];
    if (!labelAnnotations) {
        return undefined;
    }
    const annotation = Object.values(labelAnnotations)[0];
    if (!annotation) {
        return undefined;
    }
    return getElementAttributeValue(annotation.top.value, Edm.String) || undefined;
}

/**
 * Checks a single Common.Text annotation for a non-descriptive text property label.
 *
 * @param textAnnotation - The indexed Common.Text annotation
 * @param entityTypeName - Entity type that owns the annotated property
 * @param targetPath - Annotation target (the ID property path)
 * @param pageNames - Pages where the entity type is used
 * @param parsedService - The parsed OData service
 * @returns Diagnostics found, if any
 */
function processTextAnnotation(
    textAnnotation: IndexedAnnotation,
    entityTypeName: string,
    targetPath: string,
    pageNames: string[],
    parsedService: ParsedService
): DescriptionColumnLabel[] {
    const textElement = textAnnotation.top.value;
    const textPath = getElementAttributeValue(textElement, Edm.Path);
    if (!textPath) {
        return [];
    }

    const resolved = resolveTextPropertyPath(entityTypeName, textPath, parsedService);
    if (!resolved) {
        return [];
    }

    const textPropertyTarget = `${resolved.entityTypeName}/${resolved.propertyName}`;
    const textPropertyLabel = getLabelForProperty(textPropertyTarget, parsedService);
    if (!textPropertyLabel) {
        return [];
    }

    const labelLower = textPropertyLabel.trim().toLowerCase();

    // Check 1: trivial generic labels
    if (TRIVIAL_LABELS.has(labelLower)) {
        return [
            {
                type: DESCRIPTION_COLUMN_LABEL,
                messageId: 'trivialLabel',
                pageNames,
                annotation: {
                    reference: textAnnotation.top,
                    idPropertyTarget: targetPath,
                    textPropertyTarget,
                    textPropertyLabel
                }
            }
        ];
    }

    // Check 2: label of text property identical to label of ID property
    const idPropertyLabel = getLabelForProperty(targetPath, parsedService);
    if (idPropertyLabel?.trim().toLowerCase() === labelLower) {
        return [
            {
                type: DESCRIPTION_COLUMN_LABEL,
                messageId: 'duplicateLabel',
                pageNames,
                annotation: {
                    reference: textAnnotation.top,
                    idPropertyTarget: targetPath,
                    textPropertyTarget,
                    textPropertyLabel,
                    idPropertyLabel
                }
            }
        ];
    }

    return [];
}

/**
 * Processes one annotation index entry and returns diagnostics.
 *
 * @param annotationKey - Annotation index key (e.g. "Entity/property/@Common.Text")
 * @param qualifiedAnnotations - Map of qualified annotations for this key
 * @param parsedService - The parsed OData service
 * @param relevantEntityTypes - Entity types used in the app, mapped to page names
 * @returns Diagnostics found, if any
 */
function processAnnotationEntry(
    annotationKey: string,
    qualifiedAnnotations: { [qualifier: string]: IndexedAnnotation },
    parsedService: ParsedService,
    relevantEntityTypes: Map<string, string[]>
): DescriptionColumnLabel[] {
    const atIdx = annotationKey.indexOf('/@');
    if (atIdx === -1) {
        return [];
    }
    const targetPath = annotationKey.substring(0, atIdx);
    const term = annotationKey.substring(atIdx + 2);

    if (term !== COMMON_TEXT) {
        return [];
    }
    const slashIdx = targetPath.indexOf('/');
    if (slashIdx === -1) {
        return [];
    }
    const entityTypeName = targetPath.substring(0, slashIdx);
    const pageNames = relevantEntityTypes.get(entityTypeName);
    if (!pageNames) {
        return [];
    }

    const problems: DescriptionColumnLabel[] = [];
    for (const textAnnotation of Object.values(qualifiedAnnotations)) {
        problems.push(...processTextAnnotation(textAnnotation, entityTypeName, targetPath, pageNames, parsedService));
    }
    return problems;
}

/**
 * Collects all DescriptionColumnLabel diagnostics for a single parsed OData service.
 *
 * @param parsedService - The parsed OData service
 * @param relevantEntityTypes - Entity types used in the app, mapped to page names
 * @returns All diagnostics found for the service
 */
function collectProblemsForService(
    parsedService: ParsedService,
    relevantEntityTypes: Map<string, string[]>
): DescriptionColumnLabel[] {
    const problems: DescriptionColumnLabel[] = [];
    for (const [annotationKey, qualifiedAnnotations] of Object.entries(parsedService.index.annotations)) {
        problems.push(
            ...processAnnotationEntry(annotationKey, qualifiedAnnotations, parsedService, relevantEntityTypes)
        );
    }
    return problems;
}

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: DESCRIPTION_COLUMN_LABEL,
    meta: {
        type: 'problem',
        docs: {
            recommended: true,
            description:
                'The description (text) property referenced using the Common.Text annotation must have a meaningful label which is not a generic value such as "Name" or "Description" nor the same label as the ID property it describes.',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-description-column-label.md'
        },
        messages: {
            trivialLabel:
                'The "{{textPropertyTarget}}" text property has a "{{textPropertyLabel}}" generic label. Use a more descriptive label that distinguishes it from other properties.',
            duplicateLabel:
                'The "{{textPropertyTarget}}" text property has the same "{{textPropertyLabel}}" label as the "{{idPropertyTarget}}" ID property. The description column label must be different from the ID label.'
        }
    },

    check(context) {
        if (!context.sourceCode.projectContext) {
            return [];
        }
        const problems: DescriptionColumnLabel[] = [];
        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
            const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
            if (!parsedService) {
                continue;
            }
            const relevantEntityTypes = collectRelevantEntityTypes(app.pages, parsedService);
            problems.push(...collectProblemsForService(parsedService, relevantEntityTypes));
        }
        return problems;
    },

    createAnnotations(context, validationResult) {
        if (validationResult.length === 0) {
            return {};
        }
        const lookup = new Map<Element, DescriptionColumnLabel>();
        for (const diagnostic of validationResult) {
            lookup.set(diagnostic.annotation.reference.value, diagnostic);
        }
        return {
            ['target>element[name="Annotation"]'](node: Element): void {
                const diagnostic = lookup.get(node);
                if (!diagnostic) {
                    return;
                }
                context.report({
                    node,
                    messageId: diagnostic.messageId as DescriptionColumnLabelMessageId,
                    data: {
                        textPropertyTarget: diagnostic.annotation.textPropertyTarget,
                        textPropertyLabel: diagnostic.annotation.textPropertyLabel,
                        idPropertyTarget: diagnostic.annotation.idPropertyTarget,
                        idPropertyLabel: diagnostic.annotation.idPropertyLabel ?? ''
                    }
                });
            }
        };
    }
});

export default rule;

import type { Element } from '@sap-ux/odata-annotation-core';

import { createFioriRule } from '../language/rule-factory.js';
import type { FioriRuleDefinition } from '../types.js';
import { DESCRIPTION_COLUMN_LABEL, type DescriptionColumnLabel } from '../language/diagnostics.js';
import { buildAnnotationIndexKey } from '../project-context/parser/index.js';
import type { IndexedAnnotation, ParsedService } from '../project-context/parser/index.js';
import { COMMON_LABEL } from '../constants.js';
import {
    resolveTextPropertyPath,
    collectRelevantEntityTypes,
    parseCommonTextAnnotationKey,
    getTextPath,
    getStringValue
} from './utils/common-text-helpers.js';

/**
 * Labels that are considered trivially non-descriptive regardless of context.
 */
const TRIVIAL_LABELS = new Set(['name', 'description']);

/**
 * Reads a Common.Label String value and the corresponding annotation from the annotation index.
 *
 * @param propertyTarget - Fully-qualified target path (e.g. "Service.Entity/prop")
 * @param service - The parsed OData service
 * @returns The label string and annotation, or undefined if not found
 */
function getLabelForProperty(
    propertyTarget: string,
    service: ParsedService
): { label: string; annotation: IndexedAnnotation } | undefined {
    const labelKey = buildAnnotationIndexKey(propertyTarget, COMMON_LABEL);
    const labelAnnotations = service.index.annotations[labelKey];
    if (!labelAnnotations) {
        return undefined;
    }
    const annotation = labelAnnotations['undefined'] ?? Object.values(labelAnnotations)[0];
    if (!annotation) {
        return undefined;
    }
    const label = getStringValue(annotation.top.value) ?? undefined;
    if (!label) {
        return undefined;
    }
    return { label, annotation };
}

/**
 * Checks a single Common.Text annotation for a non-descriptive text property label.
 *
 * The issue is reported on the Common.Label annotation of the text property (the referenced
 * annotation), because that is the annotation the developer needs to fix. The idPropertyTarget
 * (which has the Common.Text annotation) is included in the message for context.
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
    let textPath: string | undefined;
    for (const layer of textAnnotation.layers) {
        textPath ??= getTextPath(layer.value);
        if (textPath) {
            break;
        }
    }
    if (!textPath) {
        return [];
    }

    const resolved = resolveTextPropertyPath(entityTypeName, textPath, parsedService.artifacts.metadataService);
    if (!resolved) {
        return [];
    }

    const textPropertyTarget = `${resolved.entityTypeName}/${resolved.propertyName}`;
    const textPropertyLabelResult = getLabelForProperty(textPropertyTarget, parsedService);
    if (!textPropertyLabelResult) {
        return [];
    }

    const { label: textPropertyLabel, annotation: labelAnnotation } = textPropertyLabelResult;
    const labelLower = textPropertyLabel.trim().toLowerCase();

    // Check 1: trivial generic labels
    // Issue reported on the Common.Label annotation (labelAnnotation.top) — that is what needs fixing.
    if (TRIVIAL_LABELS.has(labelLower)) {
        return [
            {
                type: DESCRIPTION_COLUMN_LABEL,
                messageId: 'trivialLabel',
                pageNames,
                annotation: {
                    reference: labelAnnotation.top,
                    idPropertyTarget: targetPath,
                    textPropertyTarget,
                    textPropertyLabel
                }
            }
        ];
    }

    // Check 2: label of text property identical to label of ID property
    // Issue reported on the Common.Label annotation of the text property — that is what needs fixing.
    const idPropertyLabelResult = getLabelForProperty(targetPath, parsedService);
    if (idPropertyLabelResult?.label.trim().toLowerCase() === labelLower) {
        return [
            {
                type: DESCRIPTION_COLUMN_LABEL,
                messageId: 'duplicateLabel',
                pageNames,
                annotation: {
                    reference: labelAnnotation.top,
                    idPropertyTarget: targetPath,
                    textPropertyTarget,
                    textPropertyLabel,
                    idPropertyLabel: idPropertyLabelResult.label
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
    const parsed = parseCommonTextAnnotationKey(annotationKey, relevantEntityTypes);
    if (!parsed) {
        return [];
    }
    const { targetPath, entityTypeName, pageNames } = parsed;
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
                'The "{{textPropertyTarget}}" text property has a "{{textPropertyLabel}}" generic label. Use a more descriptive label that distinguishes it from other properties',
            duplicateLabel:
                'The "{{textPropertyTarget}}" text property has the same "{{textPropertyLabel}}" label as the "{{idPropertyTarget}}" ID property. The description column label must be different from the ID label'
        }
    },

    check(context) {
        const problems: DescriptionColumnLabel[] = [];
        const allApps = context.sourceCode.projectContext.linkedModel.apps;
        for (const [appKey, app] of Object.entries(allApps)) {
            const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
            const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
            if (!parsedService) {
                continue;
            }
            const relevantEntityTypes = collectRelevantEntityTypes(app.pages, parsedService);
            const pageProblems = collectProblemsForService(parsedService, relevantEntityTypes);
            problems.push(...pageProblems);
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
        const report = (node: Element, diagnostic: DescriptionColumnLabel): void => {
            context.report({
                node,
                messageId: diagnostic.messageId,
                data: {
                    textPropertyTarget: diagnostic.annotation.textPropertyTarget,
                    textPropertyLabel: diagnostic.annotation.textPropertyLabel,
                    idPropertyTarget: diagnostic.annotation.idPropertyTarget,
                    idPropertyLabel: diagnostic.annotation.idPropertyLabel ?? ''
                }
            });
        };
        return {
            ['target>element[name="Annotation"]'](node: Element): void {
                const diagnostic = lookup.get(node);
                if (!diagnostic) {
                    return;
                }
                lookup.delete(node);
                report(node, diagnostic);
            },
            ['annotation-file:exit'](): void {
                // V2 synthetic elements are not injected into the AST, so the selector
                // above never visits them. Report any remaining diagnostics directly using
                // the element's pre-set range, filtering to the file currently being linted.
                const currentUri = context.sourceCode.ast.uri;
                for (const [element, diagnostic] of lookup) {
                    if (diagnostic.annotation.reference.uri === currentUri) {
                        report(element, diagnostic);
                    }
                }
                lookup.clear();
            }
        };
    }
});

export default rule;

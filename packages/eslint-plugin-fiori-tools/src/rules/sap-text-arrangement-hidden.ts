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
import type { IndexedAnnotation, ParsedService } from '../project-context/parser';
import { COMMON_TEXT, UI_HIDDEN, UI_TEXT_ARRANGEMENT } from '../constants';
import type { FeV4ObjectPage, FeV4ListReport } from '../project-context/linker/fe-v4';
import type { FeV2ListReport, FeV2ObjectPage } from '../project-context/linker/fe-v2';

type AnyPage = FeV4ObjectPage | FeV4ListReport | FeV2ListReport | FeV2ObjectPage;

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

    const propertyName = segments.at(-1)!;
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

/**
 * Builds a reverse map from IndexedAnnotation to entity type name,
 * covering only entity-type level annotations (non-property targets).
 *
 * @param parsedService - The parsed OData service
 * @returns Map from annotation object to its entity type name
 */
function buildAnnotationEntityTypeMap(parsedService: ParsedService): Map<IndexedAnnotation, string> {
    const map = new Map<IndexedAnnotation, string>();
    for (const [key, qualifiedAnnotations] of Object.entries(parsedService.index.annotations)) {
        const atIdx = key.indexOf('/@');
        if (atIdx === -1) {
            continue;
        }
        const targetPath = key.substring(0, atIdx);
        if (targetPath.includes('/')) {
            continue; // property-level annotation, skip
        }
        for (const annotation of Object.values(qualifiedAnnotations)) {
            map.set(annotation, targetPath);
        }
    }
    return map;
}

/**
 * Collects the entity type names that are actually used on pages in the app,
 * mapped to the list of page target names where each entity type appears.
 * Includes the main entity type of each page and entity types from sub-tables (e.g. via nav props on OPs).
 * Only annotations on these entity types will be checked by the rule.
 *
 * @param pages - Pages from the linked app model
 * @param parsedService - The parsed OData service
 * @returns Map from fully-qualified entity type name to the page target names it appears on
 */
function collectRelevantEntityTypes(pages: AnyPage[], parsedService: ParsedService): Map<string, string[]> {
    const entityTypePages = new Map<string, string[]>();
    const annotationEntityTypeMap = buildAnnotationEntityTypeMap(parsedService);

    const addEntityType = (entityTypeName: string, pageName: string): void => {
        const pageNames = entityTypePages.get(entityTypeName) ?? [];
        if (!pageNames.includes(pageName)) {
            pageNames.push(pageName);
        }
        entityTypePages.set(entityTypeName, pageNames);
    };

    for (const page of pages) {
        if (page.entity?.structuredType) {
            addEntityType(page.entity.structuredType, page.targetName);
        }
        // Also collect entity types from sub-tables (e.g. navigation-based tables on OPs)
        for (const table of page.lookup['table'] ?? []) {
            if (table.type !== 'table' || !table.annotation) {
                continue;
            }
            const entityType = annotationEntityTypeMap.get(table.annotation.annotation);
            if (entityType) {
                addEntityType(entityType, page.targetName);
            }
        }
    }
    return entityTypePages;
}

/**
 * Collects all entity type names that have UI.TextArrangement applied directly at entity-type level.
 *
 * @param parsedService - The parsed OData service
 * @returns Set of fully-qualified entity type names with entity-level UI.TextArrangement
 */
function collectEntityTypesWithTextArrangement(parsedService: ParsedService): Set<string> {
    const entityTypes = new Set<string>();
    for (const key of Object.keys(parsedService.index.annotations)) {
        const atIdx = key.indexOf('/@');
        if (atIdx === -1) {
            continue;
        }
        const targetPath = key.substring(0, atIdx);
        const term = key.substring(atIdx + 2);
        if (term === UI_TEXT_ARRANGEMENT && !targetPath.includes('/')) {
            entityTypes.add(targetPath);
        }
    }
    return entityTypes;
}

/**
 * Checks whether UI.Hidden is set on the given property and produces diagnostics if so.
 *
 * @param textPropertyTarget - Fully-qualified target path of the text property (e.g. "Service.Entity/prop")
 * @param targetPath - The annotation target path that has Common.Text and UI.TextArrangement
 * @param pageNames - Page target names where the annotated entity type is used
 * @param parsedService - The parsed OData service
 * @returns Array of diagnostics (empty if the property is not hidden)
 */
function checkHiddenProperty(
    textPropertyTarget: string,
    targetPath: string,
    pageNames: string[],
    parsedService: ParsedService
): TextArrangementHidden[] {
    const problems: TextArrangementHidden[] = [];
    const hiddenKey = buildAnnotationIndexKey(textPropertyTarget, UI_HIDDEN);
    const hiddenAnnotations = parsedService.index.annotations[hiddenKey];
    if (!hiddenAnnotations) {
        return problems;
    }
    for (const hiddenAnnotation of Object.values(hiddenAnnotations)) {
        // Skip only when explicitly set to false (Bool="false" means not hidden)
        // Dynamic path expressions (Path="...") are still warned — presence of
        // UI.Hidden on the text property is considered problematic regardless
        const boolVal = getElementAttributeValue(hiddenAnnotation.top.value, Edm.Bool);
        if (boolVal === 'false') {
            continue;
        }
        problems.push({
            type: TEXT_ARRANGEMENT_HIDDEN,
            pageNames,
            annotation: {
                reference: hiddenAnnotation.top,
                textPropertyPath: textPropertyTarget,
                targetWithTextArrangement: targetPath
            }
        });
    }
    return problems;
}

/**
 * Processes a single Common.Text annotation and returns diagnostics if the referenced text property is hidden.
 *
 * @param textAnnotation - The indexed Common.Text annotation to process
 * @param entityTypeName - Fully-qualified name of the entity type that owns the annotated property
 * @param targetPath - The annotation target path (e.g. "Service.Entity/property")
 * @param pageNames - Page target names where the entity type is used
 * @param entityTypesWithTextArrangement - Entity types with UI.TextArrangement at entity-type level
 * @param parsedService - The parsed OData service
 * @returns Array of diagnostics (empty if no violation found)
 */
function processTextAnnotation(
    textAnnotation: IndexedAnnotation,
    entityTypeName: string,
    targetPath: string,
    pageNames: string[],
    entityTypesWithTextArrangement: Set<string>,
    parsedService: ParsedService
): TextArrangementHidden[] {
    const textElement = textAnnotation.top.value;
    const textPath = getElementAttributeValue(textElement, Edm.Path);
    if (!textPath) {
        return [];
    }
    // UI.TextArrangement may be a nested inline annotation inside Common.Text
    // (property level, takes precedence) or applied directly on the entity type
    // (entity-type level fallback per vocabulary spec)
    const aliasInfo = parsedService.artifacts.aliasInfo[textAnnotation.top.uri];
    const hasTextArrangement =
        hasInlineTextArrangement(textElement, aliasInfo) || entityTypesWithTextArrangement.has(entityTypeName);
    if (!hasTextArrangement) {
        return [];
    }
    const resolved = resolveTextPropertyPath(entityTypeName, textPath, parsedService);
    if (!resolved) {
        return [];
    }
    const textPropertyTarget = `${resolved.entityTypeName}/${resolved.propertyName}`;
    return checkHiddenProperty(textPropertyTarget, targetPath, pageNames, parsedService);
}

/**
 * Processes a single annotation index entry and returns any diagnostics found.
 *
 * @param annotationKey - The annotation index key (e.g. "Service.Entity/prop/\@Common.Text")
 * @param qualifiedAnnotations - All qualified annotations for this key, keyed by qualifier
 * @param entityTypesWithTextArrangement - Entity types with UI.TextArrangement at entity-type level
 * @param parsedService - The parsed OData service
 * @param relevantEntityTypes - Map from entity type name to page target names where it is used
 * @returns Array of diagnostics (empty if no violation found)
 */
function processAnnotationEntry(
    annotationKey: string,
    qualifiedAnnotations: Record<string, IndexedAnnotation>,
    entityTypesWithTextArrangement: Set<string>,
    parsedService: ParsedService,
    relevantEntityTypes: Map<string, string[]>
): TextArrangementHidden[] {
    const atIdx = annotationKey.indexOf('/@');
    if (atIdx === -1) {
        return [];
    }
    const targetPath = annotationKey.substring(0, atIdx);
    const term = annotationKey.substring(atIdx + 2);
    // Only process Common.Text annotations
    if (term !== COMMON_TEXT) {
        return [];
    }
    // Only handle property-level annotations (path must contain '/')
    const slashIdx = targetPath.indexOf('/');
    if (slashIdx === -1) {
        return [];
    }
    const entityTypeName = targetPath.substring(0, slashIdx);
    // Only check entity types that are actually used on pages
    const pageNames = relevantEntityTypes.get(entityTypeName);
    if (!pageNames) {
        return [];
    }
    const problems: TextArrangementHidden[] = [];
    for (const textAnnotation of Object.values(qualifiedAnnotations)) {
        problems.push(
            ...processTextAnnotation(
                textAnnotation,
                entityTypeName,
                targetPath,
                pageNames,
                entityTypesWithTextArrangement,
                parsedService
            )
        );
    }
    return problems;
}

/**
 * Collects all TextArrangementHidden diagnostics for a single parsed OData service.
 *
 * @param parsedService - The parsed OData service to check
 * @param relevantEntityTypes - Map from entity type name to page target names where it is used
 * @returns Array of diagnostics found in the service
 */
function collectProblemsForService(
    parsedService: ParsedService,
    relevantEntityTypes: Map<string, string[]>
): TextArrangementHidden[] {
    // Pre-pass: collect entity types that have UI.TextArrangement applied directly
    // (entity-type level acts as a fallback for all Common.Text properties on that type)
    const entityTypesWithTextArrangement = collectEntityTypesWithTextArrangement(parsedService);
    const problems: TextArrangementHidden[] = [];
    for (const [annotationKey, qualifiedAnnotations] of Object.entries(parsedService.index.annotations)) {
        problems.push(
            ...processAnnotationEntry(
                annotationKey,
                qualifiedAnnotations,
                entityTypesWithTextArrangement,
                parsedService,
                relevantEntityTypes
            )
        );
    }
    return problems;
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
                'The text property "{{textPropertyPath}}" referenced using the Common.Text annotation on "{{targetPath}}" is hidden (UI.Hidden). Remove the UI.Hidden annotation from the text property or set it to false.'
        }
    },

    check(context) {
        const problems: TextArrangementHidden[] = [];
        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
            const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
            if (!parsedService) {
                continue;
            }
            const relevantEntityTypes = collectRelevantEntityTypes(app.pages as AnyPage[], parsedService);
            problems.push(...collectProblemsForService(parsedService, relevantEntityTypes));
        }
        return problems;
    },

    createAnnotations(context, validationResult) {
        if (validationResult.length === 0) {
            return {};
        }

        const lookup = new Map<Element, TextArrangementHidden>();
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

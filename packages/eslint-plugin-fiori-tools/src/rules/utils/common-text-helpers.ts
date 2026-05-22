import type { Element } from '@sap-ux/odata-annotation-core';
import { Edm, getElementAttributeValue, ELEMENT_TYPE } from '@sap-ux/odata-annotation-core';

import type { IndexedAnnotation, ParsedService } from '../../project-context/parser';
import type { FeV4ObjectPage, FeV4ListReport } from '../../project-context/linker/fe-v4';
import type { FeV2ListReport, FeV2ObjectPage } from '../../project-context/linker/fe-v2';
import { COMMON_TEXT } from '../../constants';

export { resolveTextPropertyPath } from '@sap-ux/fiori-annotation-api';

export type AnyPage = FeV4ObjectPage | FeV4ListReport | FeV2ListReport | FeV2ObjectPage;

/**
 * Extracts a String value from an annotation element.
 * Handles both OData XML format (String attribute) and CDS-compiled format
 * (value stored as text content of a child String element).
 *
 * @param element - The annotation element
 * @returns The string value or undefined if not found
 */
export function getStringValue(element: Element): string | undefined {
    const attrString = getElementAttributeValue(element, Edm.String);
    if (attrString) {
        return attrString;
    }
    for (const child of element.content) {
        if (child.type !== ELEMENT_TYPE) {
            continue;
        }
        const childEl = child as Element;
        if (childEl.name === Edm.String) {
            const textNode = childEl.content.find((c) => c.type === 'text');
            if (textNode && 'text' in textNode) {
                return textNode.text;
            }
        }
    }
    return undefined;
}

/**
 * Extracts the text path from a Common.Text annotation element.
 * Handles both OData XML format (Path attribute) and CDS-compiled format
 * (path stored as text content of a child Path/PropertyPath element).
 *
 * @param textElement - The Common.Text annotation element
 * @returns The path string or undefined if not found
 */
export function getTextPath(textElement: Element): string | undefined {
    const attrPath = getElementAttributeValue(textElement, Edm.Path);
    if (attrPath) {
        return attrPath;
    }
    for (const child of textElement.content) {
        if (child.type !== ELEMENT_TYPE) {
            continue;
        }
        const childEl = child as Element;
        if (childEl.name === Edm.Path || childEl.name === Edm.PropertyPath) {
            const textNode = childEl.content.find((c) => c.type === 'text');
            if (textNode && 'text' in textNode) {
                return textNode.text;
            }
        }
    }
    return undefined;
}

/**
 * Builds a reverse map from IndexedAnnotation to entity type name,
 * covering only entity-type level annotations (non-property targets).
 *
 * @param parsedService - The parsed OData service
 * @returns Map from annotation object to its entity type name
 */
export function buildAnnotationEntityTypeMap(parsedService: ParsedService): Map<IndexedAnnotation, string> {
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
export function collectRelevantEntityTypes(pages: AnyPage[], parsedService: ParsedService): Map<string, string[]> {
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
 * Parses an annotation index key and validates it is a property-level Common.Text
 * annotation targeting a known entity type.
 *
 * Returns the parsed `targetPath`, `entityTypeName`, and `pageNames` when the key
 * matches — or `undefined` for any of these conditions:
 * - the key has no `/@` separator
 * - the term is not `Common.Text`
 * - the target path has no `/` (entity-type-level, not property-level)
 * - the entity type is not present in `relevantEntityTypes`
 *
 * @param annotationKey - Annotation index key (e.g. "Service.Entity/prop/@Common.Text")
 * @param relevantEntityTypes - Entity types used in the app, mapped to page names
 * @returns Parsed values, or undefined if the key does not qualify
 */
export function parseCommonTextAnnotationKey(
    annotationKey: string,
    relevantEntityTypes: Map<string, string[]>
): { targetPath: string; entityTypeName: string; pageNames: string[] } | undefined {
    const atIdx = annotationKey.indexOf('/@');
    if (atIdx === -1) {
        return undefined;
    }
    const targetPath = annotationKey.substring(0, atIdx);
    const term = annotationKey.substring(atIdx + 2);
    if (term !== COMMON_TEXT) {
        return undefined;
    }
    const slashIdx = targetPath.indexOf('/');
    if (slashIdx === -1) {
        return undefined;
    }
    const entityTypeName = targetPath.substring(0, slashIdx);
    const pageNames = relevantEntityTypes.get(entityTypeName);
    if (!pageNames) {
        return undefined;
    }
    return { targetPath, entityTypeName, pageNames };
}

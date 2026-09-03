import type { Element } from '@sap-ux/odata-annotation-core';
import { Edm, getElementAttributeValue, ELEMENT_TYPE } from '@sap-ux/odata-annotation-core';

import type { IndexedAnnotation, ParsedService } from '../../project-context/parser/index.js';
import type { FeV4ObjectPage, FeV4ListReport } from '../../project-context/linker/fe-v4.js';
import type { FeV2ListReport, FeV2ObjectPage } from '../../project-context/linker/fe-v2.js';
import { COMMON_TEXT } from '../../constants.js';

export { resolveTextPropertyPath } from '@sap-ux/fiori-annotation-api';

export type AnyPage = FeV4ObjectPage | FeV4ListReport | FeV2ListReport | FeV2ObjectPage;

/**
 * Extracts a scalar value from an annotation element.
 * Checks for an attribute named `name` first (OData XML form); if absent, searches child elements
 * whose name matches `name` or any of `extraChildNames` and returns the text content of the first
 * match (CDS-compiled form). `name` is always included in the child search because in OData the
 * attribute name and the compiled child-element name are the same constant.
 *
 * @param element - The annotation element
 * @param name - The Edm constant used for both the attribute lookup and the primary child-element match
 * @param extraChildNames - Additional child-element names to accept (e.g. `Edm.PropertyPath` for path values)
 * @returns The scalar value or undefined if not found
 */
function getScalarValue(element: Element, name: string, ...extraChildNames: string[]): string | undefined {
    const attr = getElementAttributeValue(element, name);
    if (attr) {
        return attr;
    }
    for (const child of element.content) {
        if (child.type !== ELEMENT_TYPE) {
            continue;
        }
        const childEl = child as Element;
        if (childEl.name === name || extraChildNames.includes(childEl.name)) {
            const textNode = childEl.content.find((c) => c.type === 'text');
            if (textNode && 'text' in textNode) {
                return textNode.text;
            }
        }
    }
    return undefined;
}

// Edm.String is both the XML attribute name and the CDS-compiled child-element name.
export const getStringValue = (element: Element): string | undefined => getScalarValue(element, Edm.String);
// Edm.Bool is both the XML attribute name and the CDS-compiled child-element name.
export const getBoolValue = (element: Element): string | undefined => getScalarValue(element, Edm.Bool);
// Edm.Path covers both the XML Path attribute and the CDS-compiled <Path> child element;
// Edm.PropertyPath covers navigation-path child elements emitted by some CDS forms.
export const getTextPath = (element: Element): string | undefined =>
    getScalarValue(element, Edm.Path, Edm.PropertyPath);

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

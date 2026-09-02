import type { Element } from '@sap-ux/odata-annotation-core';
import { Edm, elementsWithName, getElementAttributeValue } from '@sap-ux/odata-annotation-core';
import type { ParsedService } from '../parser/index.js';
import { buildAnnotationIndexKey } from '../parser/index.js';
import type { ProjectContext } from '../project-context.js';
import { getRecordType } from './annotations.js';

export const COLLECTION_FACET_TYPE = 'com.sap.vocabularies.UI.v1.CollectionFacet';
const UI_FACETS = 'com.sap.vocabularies.UI.v1.Facets';
const I18N_BINDING_REGEX = /^\{@?i18n>(.+)\}$/;

/**
 * Gets a string value from an element's attribute or from a child element's text content.
 * Handles both XML (attribute-based) and CDS (child element text) annotation formats.
 *
 * @param element - The element to read from
 * @param valueName - The attribute or child element name to look for
 * @returns The string value, or empty string if not found
 */
export function getAttrOrChildText(element: Element, valueName: string): string {
    const fromAttr = getElementAttributeValue(element, valueName);
    if (fromAttr) {
        return fromAttr;
    }
    const [childEl] = elementsWithName(valueName, element);
    const textNode = childEl?.content?.find((c) => c.type === 'text');
    return textNode?.type === 'text' && textNode.text ? textNode.text : '';
}

/**
 * Extracts an i18n binding key from a label string.
 * Matches patterns like `{i18n>key}` (with or without the `@` prefix).
 *
 * @param label - The label string to parse
 * @returns The extracted i18n key, or undefined if not an i18n binding
 */
export function extractI18nKey(label: string): string | undefined {
    return I18N_BINDING_REGEX.exec(label)?.[1];
}

/**
 * Finds the `Label` PropertyValue element within a facet record.
 *
 * @param record - The facet record element to search
 * @returns The Label PropertyValue element, or undefined if not found
 */
export function getLabelPropValue(record: Element): Element | undefined {
    return elementsWithName(Edm.PropertyValue, record).find(
        (pv) => getElementAttributeValue(pv, Edm.Property) === 'Label'
    );
}

/**
 * Collects sub-records from a CollectionFacet's nested `Facets` property.
 *
 * @param record - The CollectionFacet record element
 * @returns Array of nested facet record elements
 */
export function getCollectionFacetSubRecords(record: Element): Element[] {
    const facetsPv = elementsWithName(Edm.PropertyValue, record).find(
        (pv) => getElementAttributeValue(pv, Edm.Property) === 'Facets'
    );
    if (!facetsPv) {
        return [];
    }
    const [nestedCollection] = elementsWithName(Edm.Collection, facetsPv);
    if (!nestedCollection) {
        return [];
    }
    return elementsWithName(Edm.Record, nestedCollection);
}

/**
 * Extracts the i18n key from a facet record's Label into the key-to-page-names map.
 *
 * @param record - The facet record element
 * @param pageName - The object page target name
 * @param keyToPageNames - Map being populated with i18n keys to page names
 */
export function extractRecordI18nKey(record: Element, pageName: string, keyToPageNames: Map<string, string[]>): void {
    const labelPropValue = getLabelPropValue(record);
    if (!labelPropValue) {
        return;
    }
    const i18nKey = extractI18nKey(getAttrOrChildText(labelPropValue, Edm.String));
    if (!i18nKey) {
        return;
    }
    const existing = keyToPageNames.get(i18nKey) ?? [];
    if (!existing.includes(pageName)) {
        keyToPageNames.set(i18nKey, [...existing, pageName]);
    }
}

/**
 * Collects all i18n keys used as section/subsection labels in the facets of a given entity type.
 *
 * @param entityType - The entity type name
 * @param pageName - The object page target name
 * @param parsedService - The parsed OData service
 * @param keyToPageNames - Map being populated with i18n keys to page names
 */
export function collectFacetI18nKeys(
    entityType: string,
    pageName: string,
    parsedService: ParsedService,
    keyToPageNames: Map<string, string[]>
): void {
    const facetsMap = parsedService.index.annotations[buildAnnotationIndexKey(entityType, UI_FACETS)];
    if (!facetsMap) {
        return;
    }
    for (const annotation of Object.values(facetsMap)) {
        const [collection] = elementsWithName(Edm.Collection, annotation.top.value);
        if (!collection) {
            continue;
        }
        const aliasInfo = parsedService.artifacts.aliasInfo[annotation.top.uri];
        for (const record of elementsWithName(Edm.Record, collection)) {
            extractRecordI18nKey(record, pageName, keyToPageNames);
            if (getRecordType(aliasInfo, record) === COLLECTION_FACET_TYPE) {
                for (const sub of getCollectionFacetSubRecords(record)) {
                    extractRecordI18nKey(sub, pageName, keyToPageNames);
                }
            }
        }
    }
}

/**
 * Traverses the project context to collect all i18n keys used as object page section/subsection labels.
 *
 * @param projectContext - The project context
 * @returns Map from i18n key to the list of page names using that key as a label
 */
export function collectSectionLabelKeys(projectContext: ProjectContext): Map<string, string[]> {
    const keyToPageNames = new Map<string, string[]>();
    for (const [appKey, app] of Object.entries(projectContext.linkedModel.apps)) {
        const parsedApp = projectContext.index.apps[appKey];
        const parsedService = projectContext.getIndexedServiceForMainService(parsedApp);
        if (!parsedService) {
            continue;
        }
        for (const page of app.pages) {
            if (page.type !== 'object-page') {
                continue;
            }
            const entityType = page.entity?.structuredType;
            if (!entityType) {
                continue;
            }
            collectFacetI18nKeys(entityType, page.targetName, parsedService, keyToPageNames);
        }
    }
    return keyToPageNames;
}

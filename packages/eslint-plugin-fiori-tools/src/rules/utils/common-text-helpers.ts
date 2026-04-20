import type { IndexedAnnotation, ParsedService } from '../../project-context/parser';
import type { FeV4ObjectPage, FeV4ListReport } from '../../project-context/linker/fe-v4';
import type { FeV2ListReport, FeV2ObjectPage } from '../../project-context/linker/fe-v2';

export type AnyPage = FeV4ObjectPage | FeV4ListReport | FeV2ListReport | FeV2ObjectPage;

/**
 * Resolves a path expression relative to an entity type.
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
export function resolveTextPropertyPath(
    entityTypeName: string,
    textPath: string,
    service: ParsedService
): { entityTypeName: string; propertyName: string } | undefined {
    const segments = textPath.split('/');
    if (segments.length === 0 || segments[0] === '') {
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

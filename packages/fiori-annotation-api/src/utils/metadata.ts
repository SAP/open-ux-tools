import type { MetadataService } from '@sap-ux/odata-entity-model';

/**
 * Resolves a path expression relative to an entity type by following navigation properties.
 *
 * For example, given entity type "IncidentService.Incidents" and path "category/name",
 * it navigates through the "category" navigation property to find "IncidentService.Category",
 * and returns { entityTypeName: "IncidentService.Category", propertyName: "name" }.
 *
 * @param entityTypeName - Fully-qualified name of the starting entity type
 * @param textPath - Path expression (e.g. "category/name" or "name")
 * @param metadataService - The metadata service used for type lookup
 * @returns Resolved entity type name and property name, or undefined if resolution fails
 */
export function resolveTextPropertyPath(
    entityTypeName: string,
    textPath: string,
    metadataService: MetadataService
): { entityTypeName: string; propertyName: string } | undefined {
    const segments = textPath.split('/');
    if (segments.length === 0 || segments[0] === '') {
        return undefined;
    }

    const propertyName = segments.at(-1)!;
    let currentEntityTypeName = entityTypeName;

    for (let i = 0; i < segments.length - 1; i++) {
        const segment = segments[i];
        const entityTypeElement = metadataService.getMetadataElement(currentEntityTypeName);
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

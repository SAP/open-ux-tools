import { convert } from '@sap-ux/annotation-converter';
import { merge, parse } from '@sap-ux/edmx-parser';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import type { ApplicationAccess } from '@sap-ux/project-access';
import { DirName, getMockServerConfig } from '@sap-ux/project-access';
import type { BackendSystem } from '@sap-ux/store';
import { BackendSystemKey, getService } from '@sap-ux/store';
import type { ConvertedMetadata, EntitySet, EntityType } from '@sap-ux/vocabularies-types';
import { FioriElementsVersion, PageTypeV4, type Specification } from '@sap/ux-specification/dist/types/src';
import type { PagesV4 } from '@sap/ux-specification/dist/types/src/v4';
import { t } from '../utils/i18n.js';
import { ODataDownloadGenerator } from './odata-download-generator.js';
import type { EntitySetsFlat } from './odata-query.js';
import type { Entity, ReferencedEntities, SemanticKeyFilter, HierarchyEntity } from './types.js';
import { navPropNameExclusions } from './types.js';

/**
 * Merges entity set data by concatenating arrays and deduplicating using Set for O(n) performance.
 *
 * @param target - The target object to merge into
 * @param source - The source object to merge from
 * @returns The merged object with deduplicated arrays
 */
function mergeEntitySetData(
    target: { [key: string]: object[] },
    source: { [key: string]: object[] }
): { [key: string]: object[] } {
    for (const key of Object.keys(source)) {
        if (target[key]) {
            const seen = new Set(target[key].map((item) => JSON.stringify(item)));
            for (const item of source[key]) {
                const itemStr = JSON.stringify(item);
                if (!seen.has(itemStr)) {
                    seen.add(itemStr);
                    target[key].push(item);
                }
            }
        } else {
            target[key] = source[key];
        }
    }
    return target;
}
/**
 * Creates an object keyed on entity set name containing expanded results.
 *
 * @param odataResult - The OData result to process
 * @param entitySetsFlat - Map of entity paths to entity set names
 * @param entitySetName - The name of the entity set
 * @param hierarchyEntities - Optional hierarchy descriptors; when provided, root node parent properties are cleared
 * @param parentPath - The path of the parent entity set used to build contextual keys for nested expansion
 * @returns Object keyed on entity set name containing entity data arrays
 */
export function createEntitySetData(
    odataResult: object | unknown[],
    entitySetsFlat: EntitySetsFlat,
    entitySetName: string,
    hierarchyEntities?: HierarchyEntity[],
    parentPath = ''
): { [key: string]: object[] } {
    const resultDataByEntitySet: { [key: string]: object[] } = {};
    const odataRestulAsArray: Record<string, unknown>[] = Array.isArray(odataResult)
        ? (odataResult as Record<string, unknown>[])
        : [odataResult as Record<string, unknown>];

    // Track seen entities using JSON string as key for O(1) lookup
    // This tracks items added in this call (not from merges - those are handled by mergeEntitySetData)
    const seenInThisCall: { [key: string]: Set<string> } = {};

    // Each entry is of the same entity set data
    odataRestulAsArray.forEach((resultEntry) => {
        for (const propName of Object.keys(resultEntry)) {
            const contextualKey = parentPath ? `${parentPath}/${propName}` : propName;
            // Prefer full-path key for accurate mapping; fall back to flat prop name for backward compat
            const childEntitySetName = entitySetsFlat[contextualKey] ?? entitySetsFlat[propName];
            if (!childEntitySetName || !resultEntry[propName]) {
                continue;
            }
            const entitySetData = createEntitySetData(
                resultEntry[propName] as object | unknown[],
                entitySetsFlat,
                childEntitySetName,
                undefined,
                contextualKey
            );
            mergeEntitySetData(resultDataByEntitySet, entitySetData);
            // Since we have assigned the property value to its own entity set property we can remove it from the parent (to prevent dups and file bloat)
            delete resultEntry[propName];
        }

        // Initialize seen set for this entity set if needed
        if (!seenInThisCall[entitySetName]) {
            // Build initial set from any existing data (could be from merges)
            seenInThisCall[entitySetName] = new Set(
                (resultDataByEntitySet[entitySetName] ?? []).map((item) => JSON.stringify(item))
            );
        }

        const entryStr = JSON.stringify(resultEntry);
        if (!seenInThisCall[entitySetName].has(entryStr)) {
            seenInThisCall[entitySetName].add(entryStr);
            if (resultDataByEntitySet[entitySetName]) {
                resultDataByEntitySet[entitySetName].push(resultEntry);
            } else {
                resultDataByEntitySet[entitySetName] = [resultEntry];
            }
        }
    });

    if (hierarchyEntities?.length) {
        normalizeHierarchyNodeIds(resultDataByEntitySet, hierarchyEntities);
        clearRootHierarchyParentProperty(resultDataByEntitySet, hierarchyEntities);
    }

    return resultDataByEntitySet;
}

/** Regex matching a 32-character uppercase hex string (ABAP RAW16 GUID without dashes). */
const upperHexGuidPattern = /^[0-9A-F]{32}$/;

/** Regex matching a string of digits with leading zeros (e.g. "0000000042"). */
const paddedNumberPattern = /^0\d+$/;

/**
 * Converts a 32-character uppercase hex string to standard GUID format (lowercase, 8-4-4-4-12 dashes).
 *
 * @param hex - The 32-character hex string
 * @returns The GUID-formatted string
 */
function hexToGuid(hex: string): string {
    const h = hex.toLowerCase();
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * Normalizes hierarchy NodeId values to match the parent property format.
 * Handles two cases:
 * - ABAP GUID mismatch: Edm.Guid parent properties use lowercase with dashes, while Edm.String
 *   NodeId values use uppercase hex without dashes. Converts NodeId to GUID format.
 * - Padded numeric strings: NodeId values that are all-digit strings with leading zeros
 *   (e.g. "0000000042") have the leading zeros stripped to match the unpadded parent reference.
 *
 * @param entityFileData - The entity set data map keyed by entity set name
 * @param hierarchyEntities - The detected hierarchy entity descriptors
 */
export function normalizeHierarchyNodeIds(
    entityFileData: { [key: string]: object[] },
    hierarchyEntities: HierarchyEntity[]
): void {
    for (const hierarchy of hierarchyEntities) {
        const pathParts = hierarchy.nodeProperty.split('/');
        for (const entityData of Object.values(entityFileData)) {
            for (const entity of entityData) {
                const record = entity as Record<string, unknown>;
                let nodeValue: string | undefined;
                if (pathParts.length > 1) {
                    const complexObj = record[pathParts[0]] as Record<string, unknown> | undefined;
                    nodeValue = complexObj?.[pathParts[1]] as string | undefined;
                } else {
                    nodeValue = record[pathParts[0]] as string | undefined;
                }
                if (typeof nodeValue !== 'string') {
                    continue;
                }
                if (
                    hierarchy.parentPropertyType &&
                    ['Edm.Guid', 'Edm.UUID'].includes(hierarchy.parentPropertyType) &&
                    upperHexGuidPattern.test(nodeValue)
                ) {
                    const guidValue = hexToGuid(nodeValue);
                    if (pathParts.length > 1) {
                        (record[pathParts[0]] as Record<string, unknown>)[pathParts[1]] = guidValue;
                    } else {
                        record[pathParts[0]] = guidValue;
                    }
                } else if (hierarchy.parentProperty && paddedNumberPattern.test(nodeValue)) {
                    const stripped = Number.parseInt(nodeValue, 10).toString();
                    if (pathParts.length > 1) {
                        (record[pathParts[0]] as Record<string, unknown>)[pathParts[1]] = stripped;
                    } else {
                        record[pathParts[0]] = stripped;
                    }
                    const parentValue = record[hierarchy.parentProperty];
                    if (typeof parentValue === 'string' && paddedNumberPattern.test(parentValue)) {
                        record[hierarchy.parentProperty] = Number.parseInt(parentValue, 10).toString();
                    }
                }
            }
        }
    }
}

/**
 * Clears the parent property on root hierarchy nodes (DistanceFromRoot === 0).
 * The mock data server uses an empty parent property to determine the root of the hierarchy from the data.
 *
 * @param entityFileData - The entity set data map keyed by entity set name
 * @param hierarchyEntities - The detected hierarchy entity descriptors
 */
export function clearRootHierarchyParentProperty(
    entityFileData: { [key: string]: object[] },
    hierarchyEntities: HierarchyEntity[]
): void {
    for (const hierarchy of hierarchyEntities) {
        const pathParts = hierarchy.nodeProperty.split('/');
        for (const entityData of Object.values(entityFileData)) {
            for (const entity of entityData) {
                const record = entity as Record<string, unknown>;
                // Is the parent property a direct property
                if (!hierarchy.parentProperty || !(hierarchy.parentProperty in record)) {
                    continue;
                }
                const distanceFromRoot =
                    pathParts.length > 1
                        ? (record[pathParts[0]] as Record<string, unknown>)?.DistanceFromRoot
                        : record.DistanceFromRoot;
                // Mock server requires an empty string to indicate root
                if (distanceFromRoot === 0) {
                    record[hierarchy.parentProperty] = '';
                }
            }
        }
    }
}

/**
 * Load the system from store if available otherwise return as a new system choice.
 *
 * @param systemUrl - The system URL
 * @param client - The client number
 * @returns The system name or 'NewSystemChoice' if not found
 */
export async function getSystemNameFromStore(systemUrl: string, client?: string | number): Promise<string | undefined> {
    const systemStore = await getService<BackendSystem, BackendSystemKey>({
        logger: ODataDownloadGenerator.logger,
        entityName: 'system'
    });

    if (typeof client === 'number') {
        client = String(client);
    }
    const system = await systemStore.read(new BackendSystemKey({ url: systemUrl, client }));
    return system?.name ?? 'NewSystemChoice';
}
/**
 * Gets the semantic key properties from an entity type.
 *
 * @param entityType - The entity type to get semantic keys from
 * @returns Array of semantic key filters
 */
export function getSemanticKeyProperties(entityType: EntityType): SemanticKeyFilter[] {
    const keyNames: SemanticKeyFilter[] = [];
    const draftKeyNames = new Set(['DraftUUID', 'IsActiveEntity']);
    const entityBusinessKeys = entityType.keys.filter((k) => !draftKeyNames.has(k.name));

    if (entityType?.annotations.Common?.SemanticKey) {
        const semanticKey = entityType.annotations.Common.SemanticKey;
        semanticKey.forEach((keyProperty, index) => {
            const semName = keyProperty.value;
            const isActualKey = entityBusinessKeys.some((k) => k.name === semName);
            const actualKey = isActualKey ? undefined : entityBusinessKeys[index]?.name;
            if (actualKey) {
                ODataDownloadGenerator.logger.debug(
                    `Semantic key '${semName}' mapped to actual entity key '${actualKey}'`
                );
            }
            keyNames.push({
                name: semName,
                keyName: actualKey,
                type: keyProperty.$target?.type ?? 'Edm.String',
                value: undefined
            });
        });
        // Include draft keys present in entity keys alongside semantic keys, unless already covered by annotation
        const existingNames = new Set(keyNames.map((k) => k.name));
        entityType.keys
            .filter((k) => draftKeyNames.has(k.name) && !existingNames.has(k.name))
            .forEach((k) => {
                keyNames.push({
                    name: k.name,
                    type: k.type,
                    value: k.name === 'IsActiveEntity' ? 'true' : undefined
                });
            });
    }
    // If no semantic key annotations defined use the key properties
    if (keyNames.length === 0) {
        entityType.keys.forEach((keyProperty) => {
            keyNames.push({
                name: keyProperty.name,
                type: keyProperty.type,
                value: keyProperty.name === 'IsActiveEntity' ? 'true' : undefined // Hardcode to alway only get active entities
            });
        });
    }
    return keyNames;
}

/**
 * Find the entity set of the specified type, since mock server needs the files to be named as entity set names.
 *
 * @param entitySets - Array of entity sets to search
 * @param entityTypeFullName - The fully qualified entity type name to find
 * @returns The matching entity set or undefined
 */
function findEntitySet(entitySets: EntitySet[], entityTypeFullName: string): EntitySet | undefined {
    return entitySets.find((entitySet) => entitySet.entityTypeName === entityTypeFullName);
}

/**
 * Gets the navigation property tree which will form the expand queries.
 * Certain property names will be excluded.
 * A limit to the depth can be provided.
 * If the same entity is found or its a leaf, recursion will stop to avoid infinite loops.
 *
 * @param entityType - The entity type to get navigation properties from
 * @param convertedMetadata - The converted metadata object
 * @param ancestorTypes - Keeps track of ancestors to prevent self referential loops and endless nested expansions
 * @param maxDepth - Maximum depth for recursion
 * @returns Array of navigation property entities
 */
function getNavPropsForExpansion(
    entityType: EntityType,
    convertedMetadata: ConvertedMetadata,
    ancestorTypes?: string[],
    maxDepth = 4
): Entity[] {
    const navPropEntities: Entity[] = [];
    if (--maxDepth > 0) {
        entityType.navigationProperties.forEach((entityTypeNavProp) => {
            // Exclude entities that are using specific property names
            if (!navPropNameExclusions.includes(entityTypeNavProp.name)) {
                let nestedNavPropEntities: Entity[] = [];
                if (entityTypeNavProp.targetType.navigationProperties.length > 0 && maxDepth > 0) {
                    nestedNavPropEntities = getNavPropsForExpansion(
                        entityTypeNavProp.targetType,
                        convertedMetadata,
                        ancestorTypes,
                        maxDepth
                    );
                }
                navPropEntities.push({
                    entityType: entityTypeNavProp.targetType,
                    entityPath: entityTypeNavProp.name,
                    entitySetName:
                        convertedMetadata.entitySets.find(
                            (entitySet) => entitySet.entityTypeName === entityTypeNavProp.targetTypeName
                        )?.name ?? 'Unknown',
                    navPropEntities: [...nestedNavPropEntities]
                });
            }
        });
    }
    return navPropEntities;
}

/**
 * Scans converted metadata for entity sets with Aggregation.RecursiveHierarchy annotations.
 * Extracts the node identifier property and parent reference property for each.
 *
 * @param convertedMetadata - The converted metadata object
 * @param mockDataPath
 * @returns Array of hierarchy entity descriptors
 */
type ParentNavPropAnnotation = {
    value?: string;
    $target?: { referentialConstraint?: { sourceProperty: string }[] };
};

type HierarchyAnnotation = {
    NodeProperty?: { value?: string };
    ParentNavigationProperty?: ParentNavPropAnnotation;
};

function resolveParentPropertyFromFile(
    entitySetName: string,
    navPropName: string,
    mockDataPath?: string
): string | undefined {
    if (!mockDataPath) {
        return undefined;
    }
    const resolvedFile = [join(mockDataPath, `${entitySetName}.cjs`), join(mockDataPath, `${entitySetName}.js`)].find(
        existsSync
    );
    if (!resolvedFile) {
        return undefined;
    }
    const existing = createRequire(import.meta.url)(resolvedFile) as {
        getReferentialConstraints?: (nav: {
            name: string;
            referentialConstraint: [];
        }) => { sourceProperty: string; targetProperty: string }[];
    };
    const constraints = existing.getReferentialConstraints?.({ name: navPropName, referentialConstraint: [] }) ?? [];
    ODataDownloadGenerator.logger.debug(
        `getHierarchyEntities: '${entitySetName}' loaded constraints from existing file: ${JSON.stringify(constraints)}`
    );
    return constraints[0]?.targetProperty;
}

function resolveParentProperty(
    entitySetName: string,
    parentNavProp: ParentNavPropAnnotation | undefined,
    hasReferentialConstraint: boolean,
    mockDataPath?: string
): {
    parentProperty: string | undefined;
    missingReferentialConstraints: HierarchyEntity['missingReferentialConstraints'];
} {
    if (hasReferentialConstraint) {
        return {
            parentProperty: parentNavProp?.$target?.referentialConstraint?.[0]?.sourceProperty,
            missingReferentialConstraints: undefined
        };
    }
    const navPropName = parentNavProp?.value;
    if (!navPropName) {
        return { parentProperty: undefined, missingReferentialConstraints: undefined };
    }
    const parentProperty = resolveParentPropertyFromFile(entitySetName, navPropName, mockDataPath);
    if (parentProperty) {
        return { parentProperty, missingReferentialConstraints: undefined };
    }
    ODataDownloadGenerator.logger.debug(
        `getHierarchyEntities: '${entitySetName}' nav prop '${navPropName}' has no referentialConstraint in metadata — will prompt user`
    );
    return { parentProperty: undefined, missingReferentialConstraints: { navPropName, constraints: [] } };
}

export function getHierarchyEntities(convertedMetadata: ConvertedMetadata, mockDataPath?: string): HierarchyEntity[] {
    const hierarchyEntities: HierarchyEntity[] = [];

    for (const entitySet of convertedMetadata.entitySets) {
        const aggregationAnnotations = entitySet.entityType?.annotations?.Aggregation;
        const hierarchyKey = Object.keys(aggregationAnnotations ?? {}).find((k) => k.startsWith('RecursiveHierarchy'));
        if (!hierarchyKey) {
            continue;
        }
        const annotation = aggregationAnnotations![
            hierarchyKey as keyof typeof aggregationAnnotations
        ] as unknown as HierarchyAnnotation;
        const nodeProperty = annotation.NodeProperty?.value;
        if (!nodeProperty) {
            continue;
        }
        ODataDownloadGenerator.logger.debug(
            `Number of hierarchy annotations entity type: ${entitySet.entityType.name} - ${Object.keys(aggregationAnnotations!).filter((k) => k.startsWith('RecursiveHierarchy')).length}`
        );

        const qualifier = hierarchyKey.split('#')[1] ?? '';
        const parentNavProp = annotation.ParentNavigationProperty;
        const hasReferentialConstraint = (parentNavProp?.$target?.referentialConstraint?.length ?? 0) > 0;
        const { parentProperty, missingReferentialConstraints } = resolveParentProperty(
            entitySet.name,
            parentNavProp,
            hasReferentialConstraint,
            mockDataPath
        );

        hierarchyEntities.push({
            entitySetName: entitySet.name,
            entityTypeName: entitySet.entityType.fullyQualifiedName,
            qualifier,
            nodeProperty,
            parentProperty,
            parentPropertyType: parentProperty
                ? (entitySet.entityType.entityProperties.find((p) => p.name === parentProperty)?.type ?? 'Edm.String')
                : undefined,
            isDraft: !!(entitySet.annotations?.Common?.DraftRoot ?? entitySet.annotations?.Common?.DraftNode),
            entityTypeKeys: entitySet.entityType.keys.map((k) => k.name),
            entityProperties: entitySet.entityType.entityProperties.map((p) => p.name),
            missingReferentialConstraints
        });
    }

    if (hierarchyEntities.length) {
        ODataDownloadGenerator.logger.debug(
            `Hierarchy entities found: ${hierarchyEntities.map((h) => h.entitySetName).join(', ')}`
        );
    }
    return hierarchyEntities;
}

/**
 * Load the entity model for processing to determine the odata queries that are relevant for the application.
 *
 * @param appAccess - Application access reference
 * @param specification - The specification instance
 * @param remoteMetadata - The backend service metadata, as distinct to the local metadata
 * @returns The referenced entities or undefined if not found
 */
export async function getEntityModel(
    appAccess: ApplicationAccess,
    specification: Specification,
    remoteMetadata: string
): Promise<ReferencedEntities | undefined | string> {
    let entities: ReferencedEntities | undefined;
    const mainService = appAccess.app.services['mainService'];
    try {
        if (mainService.local) {
            const annotationFiles = (mainService.annotations ?? [])
                .map((a) => a.local)
                .filter((p): p is string => !!p && existsSync(p));
            const annotationContents = await Promise.all(annotationFiles.map((f) => readFile(f, 'utf-8')));
            const parsedAnnotations = annotationContents.map((xml, i) => parse(xml, annotationFiles[i]));
            const rawMetadata =
                parsedAnnotations.length > 0
                    ? merge(parse(remoteMetadata), ...parsedAnnotations)
                    : parse(remoteMetadata);
            const convertedMetadata = convert(rawMetadata);
            const appConfig = await specification.readApp({ app: appAccess });

            if (
                appConfig.applicationModel &&
                appConfig.applicationModel?.target?.fioriElements == FioriElementsVersion.v4
            ) {
                const appModel = appConfig.applicationModel;
                const pages = appModel.pages as unknown as PagesV4;
                let mainListEntityType: EntityType | undefined;
                const pageObjectEntities: Entity[] = [];

                // Get all the app referenced pages and list entity
                Object.values(pages).forEach((page) => {
                    // Get the main list entity
                    if (page.pageType === PageTypeV4.ListReport && page.entityType && page.entitySet) {
                        mainListEntityType = convertedMetadata.entityTypes.find(
                            (et) => et.fullyQualifiedName === page.entityType
                        );
                        if (mainListEntityType) {
                            const entityKeys = getSemanticKeyProperties(mainListEntityType);
                            entities = {
                                listEntity: {
                                    entitySetName: page.entitySet,
                                    semanticKeys: entityKeys,
                                    entityPath: page.entitySet,
                                    entityType: mainListEntityType
                                }
                            };

                            // Add nav props of the list entity
                            entities.listEntity.navPropEntities = getNavPropsForExpansion(
                                mainListEntityType,
                                convertedMetadata
                            );
                        }
                    } else if (page.pageType === PageTypeV4.ObjectPage && page.entityType && page.entitySet) {
                        // Dont add the page object for the main entity since it will be the query root entity set
                        if (
                            page.entitySet &&
                            page.entityType &&
                            page.entityType !== mainListEntityType?.fullyQualifiedName
                        ) {
                            const objectPageEntitySet = findEntitySet(convertedMetadata.entitySets, page.entityType);
                            const pageEntity: Entity = {
                                entityPath: page.navigationProperty!,
                                entitySetName: page.entitySet,
                                entityType: objectPageEntitySet?.entityType,
                                page
                            };
                            pageObjectEntities.push(pageEntity);
                        }
                    }
                });

                if (!entities?.listEntity) {
                    ODataDownloadGenerator.logger.info(t('info.noListEntityDefined'));
                    return t('info.noListEntityDefined');
                }
                entities.pageObjectEntities = pageObjectEntities;
                const appRoot = appAccess.getAppRoot();
                const mockServerConfig = await getMockServerConfig(appRoot);
                const serviceConfig = mockServerConfig?.services?.find(
                    (s) => s.urlPath.replaceAll(/(^\/)|(\/$)/g, '') === mainService.uri?.replaceAll(/(^\/)|(\/$)/g, '')
                );
                const mockDataPath = join(
                    appRoot,
                    serviceConfig?.mockdataPath ?? join(DirName.Webapp, DirName.LocalService, DirName.Mockdata)
                );
                entities.hierarchyEntities = getHierarchyEntities(convertedMetadata, mockDataPath);
            }
        }
        return entities;
    } catch (error) {
        const errLog = t('errors.entityModelLoading', { error });
        ODataDownloadGenerator.logger.error(errLog);
        return errLog;
    }
}

/**
 * Builds the content of a mock server `.js` constraint file for a hierarchy entity
 * whose parent navigation property has no referential constraint in the metadata.
 *
 * @param navPropName - The navigation property name (used in the switch case)
 * @param constraints - The derived referential constraints to return
 * @returns The complete `.js` file content as a string
 */
export function buildReferentialConstraintFileContent(
    navPropName: string,
    constraints: { sourceProperty: string; targetProperty: string }[]
): string {
    const constraintsJson = JSON.stringify(constraints, null, 4).replaceAll('\n', '\n            ');
    return [
        `module.exports = {`,
        `    // See: https://github.com/SAP/open-ux-odata/blob/main/docs/MockserverAPI.md#getreferentialconstraints`,
        `    getReferentialConstraints: function (navigationProperty) {`,
        `        if (navigationProperty.name === "${navPropName}") {`,
        `            return ${constraintsJson};`,
        `        }`,
        `        return undefined;`,
        `    }`,
        `};`,
        ``
    ].join('\n');
}

/**
 * Updates an existing referential constraint `.js` file to include a new nav property condition.
 * - If the nav property is already handled, returns content unchanged.
 * - If `getReferentialConstraints` exists, injects the new `if` block at the start of the function body.
 * - If `getReferentialConstraints` is absent, appends the function to `module.exports`.
 *
 * @param content - The existing file content
 * @param navPropName - The navigation property name
 * @param constraints - The referential constraints to add
 * @returns The updated file content
 */
export function updateReferentialConstraintFileContent(
    content: string,
    navPropName: string,
    constraints: { sourceProperty: string; targetProperty: string }[]
): string {
    if (content.includes(`"${navPropName}"`) || content.includes(`'${navPropName}'`)) {
        return content;
    }
    const constraintsJson = JSON.stringify(constraints, null, 4).replaceAll('\n', '\n            ');
    const ifBlock = [
        `        if (navigationProperty.name === "${navPropName}") {`,
        `            return ${constraintsJson};`,
        `        }`
    ].join('\n');

    if (content.includes('getReferentialConstraints')) {
        // Inject at the start of the function body, after the opening {
        return content.replace(/(getReferentialConstraints[\s\S]*?{)/, `$1\n${ifBlock}`);
    }

    // Append getReferentialConstraints to module.exports before its closing };
    const newFn = [
        `    getReferentialConstraints: function (navigationProperty) {`,
        `${ifBlock}`,
        `        return undefined;`,
        `    }`
    ].join('\n');
    const closeIdx = content.lastIndexOf('\n};');
    if (closeIdx !== -1) {
        return `${content.slice(0, closeIdx)},\n${newFn}${content.slice(closeIdx)}`;
    }
    return content;
}

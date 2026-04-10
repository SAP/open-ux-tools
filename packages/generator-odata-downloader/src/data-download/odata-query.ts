import type { ODataService } from '@sap-ux/axios-extension';
import buildQuery, { type Filter } from 'odata-query';
import { t } from '../utils/i18n';
import { ODataDownloadGenerator } from './odata-download-generator';
import { type SelectedEntityAnswer } from './prompts/prompts';
import type { ReferencedEntities, HierarchyEntity } from './types';

export type EntitySetsFlat = { [entityPath: string]: string };
type ExpandTree = { expand?: Record<string, ExpandTree> };

/** Default number of hierarchy levels to fetch in a descendants query. */
const defaultHierarchyLevels = 3;

/**
 * Builds the expands object used to create an odata query.
 *
 * @param entityPaths - Array of entity paths with their entity set names
 * @returns Object containing expands configuration and entity path parts
 */
export function getExpands(entityPaths: { entityPath: string; entitySetName: string }[]): {
    expands: object;
    entityPathParts: string[];
} {
    const entityPathParts: string[] = [];
    const expand = entityPaths.reduce<ExpandTree>(
        (tree, { entityPath: path }) => {
            const parts = path.split('/');
            let current = tree;

            parts.forEach((part, index) => {
                if (!current.expand) {
                    current.expand = {};
                }
                current.expand[part] ??= index === parts.length - 1 ? {} : { expand: {} };
                current = current.expand[part] as typeof current;
                if (!entityPathParts.includes(part)) {
                    entityPathParts.push(part);
                }
            });

            return tree;
        },
        { expand: {} }
    );

    return { expands: expand, entityPathParts };
}

/**
 * Create the odata query by expanding and filtering the list entity.
 *
 * @param listEntity - The list entity to query from
 * @param selectedEntities - The selected entities to include in the query
 * @param top - The maximum number of records to return
 * @param hierarchyEntity
 * @returns The generated query string
 */
export function createQueryFromEntities(
    listEntity: ReferencedEntities['listEntity'],
    selectedEntities: SelectedEntityAnswer[],
    top = 1,
    hierarchyEntity?: HierarchyEntity
): { query: string } {
    const selectedPaths = selectedEntities?.map((entity) => {
        return { entityPath: entity.fullPath, entitySetName: entity.entity.entitySetName };
    });

    const { expands: entitiesToExpand, entityPathParts } = getExpands(selectedPaths);

    // To provide feedback about which entity set files would be created by this query
    const entitySetNames = entityPathParts
        .map((path) => {
            const found = selectedEntities.find((selectedEntity) => {
                return path === selectedEntity.entity.entityPath ? selectedEntity.entity.entitySetName : undefined;
            });
            return found?.entity.entitySetName;
        })
        .filter((item): item is string => item !== undefined);
    ODataDownloadGenerator.logger.info(t('info.entityFilesToBeGenerated', { entities: entitySetNames.join(', ') }));

    const mainEntity = listEntity;

    // Hierarchy entities use a descendants query instead of top/filter
    if (hierarchyEntity) {
        // Build filter from semantic key values
        const filterParts: string[] = [];
        mainEntity.semanticKeys.forEach((key) => {
            if (key.value !== undefined && key.value !== '') {
                if (key.type === 'Edm.Boolean') {
                    filterParts.push(`${key.name} eq ${key.value}`);
                } else {
                    const values = String(key.value).split(',');
                    const isGuid = ['Edm.UUID', 'Edm.Guid'].includes(key.type);
                    const wrap = (v: string): string => (isGuid ? v.trim() : `'${v.trim()}'`);
                    if (values.length === 1) {
                        filterParts.push(`${key.name} eq ${wrap(values[0])}`);
                    } else {
                        const orParts = values.map((v) => `${key.name} eq ${wrap(v)}`);
                        filterParts.push(`(${orParts.join(' or ')})`);
                    }
                }
            }
        });
        const filterParam = filterParts.length > 0 ? `,filter(${filterParts.join(' and ')})` : '';

        const hierarchyArgs = `$root/${mainEntity.entitySetName},${hierarchyEntity.qualifier},${hierarchyEntity.nodeProperty}`;
        const topLevelsPart = `com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/${mainEntity.entitySetName},HierarchyQualifier='${hierarchyEntity.qualifier}',NodeProperty='${hierarchyEntity.nodeProperty}',Levels=${defaultHierarchyLevels})`;

        // Draft-enabled hierarchies require an ancestors() wrapper to scope to active entities
        const applyPart = hierarchyEntity.isDraft
            ? `$apply=ancestors(${hierarchyArgs}${filterParam},keep start)/${topLevelsPart}`
            : `$apply=${topLevelsPart}`;

        const expandQuery = entitiesToExpand ? buildQuery(entitiesToExpand) : '';
        const expandPart = expandQuery ? `&${expandQuery.substring(1)}` : '';
        const query = `${mainEntity.entitySetName}?${applyPart}${expandPart}`;
        ODataDownloadGenerator.logger.debug(`Query for odata: ${query}`);
        return { query };
    }

    const mainEntityFilters: Filter<string>[] = [];
    mainEntity.semanticKeys.forEach((key) => {
        // Process ranges and/or comma seperated values
        if (key.value !== undefined && key.value !== '') {
            if (['Edm.UUID', 'Edm.Guid'].includes(key.type)) {
                const filterParts = String(key.value).split(',');
                const filters: Filter<string>[] = filterParts.map((part) => ({
                    [key.name]: { type: 'guid' as const, value: part.trim() }
                }));
                mainEntityFilters.push(filters.length === 1 ? filters[0] : { or: filters });
            } else if (key.type === 'Edm.Boolean') {
                mainEntityFilters.push({
                    [key.name]: String(key.value) === 'true'
                });
            } else if (key.type === 'Edm.String') {
                // Create the range and set values
                const filterParts = String(key.value).split(',');
                const filters: Filter<string>[] = [];
                filterParts.forEach((filterPart) => {
                    const filterRangeParts = filterPart.trim().split('-');

                    if (filterRangeParts.length === 1) {
                        // Single value
                        filters.push({
                            [key.name]: filterPart.trim()
                        });
                    } else if (filterRangeParts.length === 2) {
                        // Range
                        filters.push({
                            [key.name]: {
                                ge: filterRangeParts[0].trim(),
                                le: filterRangeParts[1].trim()
                            }
                        });
                    }
                });

                mainEntityFilters.push(
                    filters.length == 1
                        ? filters[0]
                        : {
                              or: filters
                          }
                );
            } else {
                mainEntityFilters.push({
                    [key.name]: key.value
                });
            }
        }
    });

    // Build the query object
    const queryInput = {};

    if (entitiesToExpand) {
        Object.assign(queryInput, entitiesToExpand);
    }
    if (mainEntityFilters.length > 0) {
        Object.assign(queryInput, {
            filter: mainEntityFilters.length === 1 ? mainEntityFilters[0] : mainEntityFilters,
            count: true
        });
    } else if (top) {
        Object.assign(queryInput, {
            top
        });
    }
    const queryString = buildQuery(queryInput);
    const query = `${mainEntity.entitySetName}${queryString}`;
    ODataDownloadGenerator.logger.debug(`Query for odata: ${query}`);
    return { query };
}
/**
 * Builds a nav-key-rooted TopLevels query for a nav-prop that has a hierarchy annotation.
 * e.g. PPS_PurchaseOrder(PurchaseOrder='4500003676',DraftUUID=...,IsActiveEntity=true)/_PurchaseOrderItem
 *      ?$apply=com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=$root/...,...)
 *
 * @param listEntity - The parent/list entity (provides entity set name and key values)
 * @param navPropName - The navigation property name connecting parent to child
 * @param hierarchyEntity - The hierarchy descriptor for the nav-prop entity
 * @returns The query string, or undefined if no semantic key values are available
 */
export function buildNavPropHierarchyQuery(
    listEntity: ReferencedEntities['listEntity'],
    navPropName: string,
    hierarchyEntity: HierarchyEntity
): string | undefined {
    const draftKeyNames = new Set(['DraftUUID', 'IsActiveEntity']);

    // Build key segment: use keyName (actual entity key) if set, else name (semantic key = actual key)
    const keyParts: string[] = [];
    for (const key of listEntity.semanticKeys) {
        if (key.value === undefined || key.value === '' || draftKeyNames.has(key.name)) {
            continue;
        }
        const actualKeyName = key.keyName ?? key.name;
        const firstValue = String(key.value).split(',')[0].trim();
        const isGuid = ['Edm.UUID', 'Edm.Guid'].includes(key.type);
        const isBoolean = key.type === 'Edm.Boolean';
        keyParts.push(`${actualKeyName}=${isGuid || isBoolean ? firstValue : `'${firstValue}'`}`);
    }

    if (keyParts.length === 0) {
        ODataDownloadGenerator.logger.debug(
            `buildNavPropHierarchyQuery: no key values available for '${listEntity.entitySetName}', skipping nav-prop hierarchy query for '${navPropName}'`
        );
        return undefined;
    }

    // Draft entities always use fixed DraftUUID + IsActiveEntity for active reads
    const isDraftListEntity = listEntity.entityType?.keys?.some((k) => k.name === 'IsActiveEntity') ?? false;
    if (isDraftListEntity) {
        keyParts.push(`DraftUUID=00000000-0000-0000-0000-000000000000`);
        keyParts.push(`IsActiveEntity=true`);
    }

    ODataDownloadGenerator.logger.debug(
        `buildNavPropHierarchyQuery: key segment for '${listEntity.entitySetName}': (${keyParts.join(',')})`
    );

    const keySegment = `${listEntity.entitySetName}(${keyParts.join(',')})`;
    const navPath = `${keySegment}/${navPropName}`;
    const hierarchyNodesRef = `$root/${navPath}`;

    const topLevelsPart = `com.sap.vocabularies.Hierarchy.v1.TopLevels(HierarchyNodes=${hierarchyNodesRef},HierarchyQualifier='${hierarchyEntity.qualifier}',NodeProperty='${hierarchyEntity.nodeProperty}',Levels=${defaultHierarchyLevels})`;
    const query = `${navPath}?$apply=${topLevelsPart}`;
    ODataDownloadGenerator.logger.debug(`Nav-prop hierarchy query: ${query}`);
    return query;
}

/**
 * Builds an odata query and fetches the data from a backend.
 *
 * @param listEntity - The list entity to query from
 * @param odataService - The OData service to use for fetching
 * @param selectedEntities - The selected entities to include in the query
 * @param top - The maximum number of records to return
 * @param hierarchyEntity - Hierarchy entity when the list entity itself is a hierarchy root
 * @param navPropHierarchyEntities - Hierarchy entities for selected nav-props (not the list entity)
 * @returns The fetched OData result
 */
export async function fetchData(
    listEntity: ReferencedEntities['listEntity'],
    odataService: ODataService,
    selectedEntities: SelectedEntityAnswer[],
    top?: number,
    hierarchyEntity?: HierarchyEntity,
    navPropHierarchyEntities: HierarchyEntity[] = []
): Promise<{ odataResult: { entityData?: []; error?: string } }> {
    const query = createQueryFromEntities(listEntity, selectedEntities, top, hierarchyEntity);
    const odataResult = await executeQuery(odataService, query.query);

    // Issue additional nav-key-rooted TopLevels queries for nav-prop hierarchy entities
    for (const navHierarchy of navPropHierarchyEntities) {
        const matchingEntity = selectedEntities.find((s) => s.entity.entitySetName === navHierarchy.entitySetName);
        if (!matchingEntity) {
            ODataDownloadGenerator.logger.debug(
                `fetchData: no selected entity matched hierarchy entity '${navHierarchy.entitySetName}', skipping`
            );
            continue;
        }
        const navQuery = buildNavPropHierarchyQuery(listEntity, matchingEntity.entity.entityPath, navHierarchy);
        if (!navQuery) {
            ODataDownloadGenerator.logger.debug(
                `fetchData: could not build nav-prop hierarchy query for '${navHierarchy.entitySetName}', skipping`
            );
            continue;
        }
        const navResult = await executeQuery(odataService, navQuery);
        if (!navResult.entityData || !odataResult.entityData) {
            ODataDownloadGenerator.logger.debug(
                `fetchData: no data returned for nav-prop hierarchy query '${navHierarchy.entitySetName}', skipping merge`
            );
            continue;
        }

        ODataDownloadGenerator.logger.debug(
            `fetchData: merging ${navResult.entityData.length} hierarchy records into '${matchingEntity.entity.entityPath}' expanded items`
        );

        // Patch hierarchy properties in-place onto matching expanded nav-prop records
        const navPropName = matchingEntity.entity.entityPath;
        const hierPropName = navHierarchy.nodeProperty.split('/')[0];
        const navResultData = navResult.entityData as Record<string, unknown>[];
        let patchCount = 0;

        for (const rootRecord of odataResult.entityData as Record<string, unknown>[]) {
            const expandedItems = rootRecord[navPropName];
            if (!Array.isArray(expandedItems)) {
                continue;
            }
            for (const item of expandedItems as Record<string, unknown>[]) {
                const match = navResultData.find((h) => navHierarchy.entityTypeKeys.every((k) => h[k] === item[k]));
                if (match) {
                    item[hierPropName] = match[hierPropName];
                    patchCount++;
                }
            }
        }

        ODataDownloadGenerator.logger.debug(
            `fetchData: patched '${hierPropName}' onto ${patchCount} expanded '${navPropName}' records`
        );
    }

    return { odataResult };
}

/**
 * Sends a get request to run the odata query using the specified odata service.
 *
 * @param odataService - The OData service to use for executing the query
 * @param query - The query string to execute
 * @returns The query result or error
 */
async function executeQuery(odataService: ODataService, query: string): Promise<{ entityData?: []; error?: string }> {
    try {
        ODataDownloadGenerator.logger.info(
            `OData query request: ${encodeURI(odataService.defaults.baseURL + query).replaceAll("'", '%27')}`
        );
        ODataDownloadGenerator.logger.debug(
            `OData query request headers: ${JSON.stringify(odataService.defaults.headers)}`
        );
        const data = await odataService.get(query);
        const odataCount = data?.data?.match(/"@odata\.count":(\d+)/)?.[1];
        ODataDownloadGenerator.logger.info(`OData query records count: ${odataCount}`);
        // Process the result set into individual entity data for files
        return { entityData: data?.odata() };
    } catch (error) {
        const errorText = t('errors.odataQueryError', { error });
        ODataDownloadGenerator.logger.error(errorText);
        return { error: errorText };
    }
}

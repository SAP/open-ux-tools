import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { familyFor } from './service-family.mjs';

const { createFieldContextV3 } = await import('../../../packages/mock-data-generator/dist/semantics/field-context.js');

export const AUTHORIZED_V3_CONVERSION_FORMAT = 'mockgen-v3-authorized-development-conversion';
export const AUTHORIZED_V3_CONVERSION_VERSION = 1;

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function assertObject(value, name) {
    if (value === null || typeof value !== 'object' || Array.isArray(value))
        throw new TypeError(`${name} must be an object`);
}

function directLicense(record) {
    return record?.license?.redistributable === true && ['Apache-2.0', 'MIT'].includes(record.license.identifier);
}

function sourceAllowed(record, split, includeInternal) {
    if (split !== 'train') return false;
    const graphSource = record?.source?.format === 'schema-graph';
    if (directLicense(record)) return graphSource;
    return (
        includeInternal === true &&
        graphSource &&
        record?.license?.identifier === 'INTERNAL-OWNER-AUTHORIZATION' &&
        record?.trainingAuthorization?.scope === 'structural-metadata-only' &&
        record?.trainingAuthorization?.privacyReview?.status === 'passed'
    );
}

function descriptorIndex(catalog) {
    const index = new Map();
    for (const descriptor of catalog.descriptors ?? []) {
        if (typeof descriptor.title !== 'string' || !Array.isArray(descriptor.positiveFieldKeys)) continue;
        for (const fieldKey of descriptor.positiveFieldKeys) {
            const previous = index.get(fieldKey);
            if (previous && previous !== descriptor.title)
                throw new TypeError(`field ${fieldKey} has conflicting descriptor labels`);
            index.set(fieldKey, descriptor.title);
        }
    }
    return index;
}

export function runtimeGraphFromSchemaGraph(graph) {
    const entities = (graph.nodes ?? []).filter((node) => node.kind === 'entity');
    const properties = (graph.nodes ?? []).filter((node) => node.kind === 'property');
    const propertiesByEntity = new Map(
        entities.map((entity) => [entity.id, properties.filter((property) => property.entityId === entity.id)])
    );
    const annotations = (property) =>
        (property.evidence?.annotations ?? [])
            .filter((annotation) => typeof annotation.term === 'string')
            .map((annotation) => ({
                term: annotation.term,
                ...(annotation.value === undefined ? {} : { value: annotation.value })
            }));
    const runtimeProperties = (entity) =>
        (propertiesByEntity.get(entity.id) ?? []).map((property) => {
            const facets = property.facets ?? {};
            const evidence = property.evidence ?? {};
            return {
                name: property.name,
                primitiveType: property.primitiveType,
                nullable: facets.nullable !== false,
                isKey: facets.isKey === true,
                ...(facets.maxLength === undefined ? {} : { maxLength: facets.maxLength }),
                ...(facets.precision === undefined ? {} : { precision: facets.precision }),
                ...(facets.scale === undefined ? {} : { scale: facets.scale }),
                ...(typeof evidence.label === 'string' ? { label: evidence.label } : {}),
                ...(typeof evidence.description === 'string' ? { description: evidence.description } : {}),
                ...(typeof evidence.dataElement === 'string' ? { dataElement: evidence.dataElement } : {}),
                annotations: annotations(property),
                ...(evidence.links && typeof evidence.links === 'object' ? { links: evidence.links } : {})
            };
        });
    const runtimeEntities = entities.map((entity) => ({
        name: entity.name,
        entitySetName: entity.id,
        properties: runtimeProperties(entity)
    }));
    const entityById = new Map(runtimeEntities.map((entity, index) => [entities[index].id, entity]));
    const propertyById = new Map(
        entities.flatMap((entity) =>
            (propertiesByEntity.get(entity.id) ?? []).map((property, index) => [
                `${property.id}`,
                { entity: entityById.get(entity.id), property: entityById.get(entity.id)?.properties[index] }
            ])
        )
    );
    const relationships = (graph.edges ?? [])
        .filter((edge) => edge.kind === 'foreign-key')
        .flatMap((edge) => {
            const from = propertyById.get(edge.from);
            const to = propertyById.get(edge.to);
            if (!from?.entity || !to?.entity || !from.property || !to.property) return [];
            return [
                {
                    name: edge.provenance?.relationshipGroup ?? edge.id,
                    fromEntitySet: from.entity.entitySetName,
                    toEntitySet: to.entity.entitySetName,
                    mappings: [{ sourceProperty: from.property.name, targetProperty: to.property.name }]
                }
            ];
        });
    return { namespace: 'authorized-schema-graph', entities: runtimeEntities, relationships };
}

function rowsFromGraph(service, graph, descriptors, mappings, registry, split) {
    const rows = [];
    const runtimeGraph = runtimeGraphFromSchemaGraph(graph);
    const entities = (graph.nodes ?? []).filter((node) => node.kind === 'entity');
    for (const entity of entities) {
        const runtimeEntity = runtimeGraph.entities.find((candidate) => candidate.entitySetName === entity.id);
        const properties = (graph.nodes ?? []).filter(
            (node) => node.kind === 'property' && node.entityId === entity.id
        );
        for (const property of properties) {
            const descriptor = descriptors.get(property.id);
            const label = descriptor === undefined ? undefined : mappings[descriptor];
            if (label === undefined) continue;
            rows.push({
                id: property.id,
                group: service.id,
                family: familyFor(registry, split, service),
                label,
                descriptorTitle: descriptor,
                context: createFieldContextV3(
                    runtimeGraph,
                    runtimeEntity,
                    runtimeEntity.properties.find((candidate) => candidate.name === property.name)
                ),
                source: {
                    serviceId: service.id,
                    sourceUri: service.source.uri,
                    sourceChecksum: service.source.contentChecksum,
                    graphFingerprint: service.graphFingerprint,
                    propertyId: property.id
                }
            });
        }
    }
    return rows;
}

export async function convertAuthorizedV3({ registry, split, catalog, mapping, sourceRoot, includeInternal = false }) {
    assertObject(registry, 'registry');
    assertObject(split, 'split');
    assertObject(catalog, 'catalog');
    assertObject(mapping, 'mapping');
    if (
        mapping.format !== 'mockgen-v3-descriptor-role-mapping' ||
        mapping.version !== 1 ||
        mapping.status !== 'machine-proposed-unreviewed'
    )
        throw new TypeError('mapping must be the versioned machine-proposed mapping artifact');
    if (!isAbsolute(sourceRoot)) throw new TypeError('sourceRoot must be absolute');
    const descriptors = descriptorIndex(catalog);
    const services = [];
    const skipped = [];
    const rows = [];
    for (const service of registry.services ?? []) {
        const assigned = split.assignments?.[service.id];
        if (!sourceAllowed(service, assigned, includeInternal)) {
            skipped.push({
                id: service.id,
                split: assigned ?? null,
                reason:
                    assigned !== 'train'
                        ? 'not-train'
                        : service.source?.format !== 'schema-graph'
                          ? 'unsupported-source-format'
                          : 'license-or-authorization'
            });
            continue;
        }
        if (service.evaluationOnly === true) {
            skipped.push({ id: service.id, split: assigned, reason: 'evaluation-only' });
            continue;
        }
        const graphPath = resolve(sourceRoot, service.source.uri);
        const lexicalRelative = relative(sourceRoot, graphPath);
        if (lexicalRelative.startsWith('..') || isAbsolute(lexicalRelative)) {
            throw new TypeError(`source path escapes the source root for ${service.id}`);
        }
        const physicalRoot = await realpath(sourceRoot);
        const physicalPath = await realpath(graphPath);
        const physicalRelative = relative(physicalRoot, physicalPath);
        if (physicalRelative.startsWith('..') || isAbsolute(physicalRelative)) {
            throw new TypeError(`source path escapes the source root for ${service.id}`);
        }
        const graphBytes = await readFile(physicalPath);
        if (sha256(graphBytes) !== service.source.contentChecksum)
            throw new TypeError(`source checksum mismatch for ${service.id}`);
        const graph = JSON.parse(graphBytes.toString('utf8'));
        const serviceRows = rowsFromGraph(service, graph, descriptors, mapping.mappings, registry, split);
        rows.push(...serviceRows);
        services.push({
            id: service.id,
            split: assigned,
            sourceUri: service.source.uri,
            sourceChecksum: service.source.contentChecksum,
            graphFingerprint: service.graphFingerprint,
            candidateRows: serviceRows.length
        });
    }
    const labels = [...new Set(rows.map((row) => row.label))].sort();
    const source = {
        registryFingerprint: sha256(Buffer.from(JSON.stringify(registry))),
        splitFingerprint: sha256(Buffer.from(JSON.stringify(split))),
        catalogFingerprint: sha256(Buffer.from(JSON.stringify(catalog))),
        sourceRootNotPersisted: true,
        includeInternal
    };
    source.conversionManifestFingerprint = sha256(
        Buffer.from(
            JSON.stringify({
                registryFingerprint: source.registryFingerprint,
                splitFingerprint: source.splitFingerprint,
                catalogFingerprint: source.catalogFingerprint,
                mappingFingerprint: sha256(Buffer.from(JSON.stringify(mapping))),
                includeInternal
            })
        )
    );
    for (const row of rows) row.conversionManifestFingerprint = source.conversionManifestFingerprint;
    return {
        format: AUTHORIZED_V3_CONVERSION_FORMAT,
        version: AUTHORIZED_V3_CONVERSION_VERSION,
        qualification: {
            status: 'unqualified',
            reason: 'Machine-proposed descriptor conversion for development only; labels are not gold.'
        },
        mapping: {
            version: mapping.version,
            status: mapping.status,
            fingerprint: sha256(Buffer.from(JSON.stringify(mapping))),
            mappedTitles: Object.keys(mapping.mappings).sort()
        },
        source,
        counts: {
            candidateServices: services.length,
            candidateRows: rows.length,
            labels: labels.length,
            skippedServices: skipped.length
        },
        labels,
        services,
        skipped,
        rows
    };
}

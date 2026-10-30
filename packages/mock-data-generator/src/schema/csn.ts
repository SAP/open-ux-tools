import type {
    PrimitiveType,
    SchemaAnnotation,
    SchemaEntity,
    SchemaGraph,
    SchemaProperty,
    SchemaRelationship,
    SchemaValueListParameter
} from './graph.js';
import { valueListParameterDirection } from './graph.js';
import { compareCodePoints } from '../ordering.js';
import { errorMessage, isRecord } from '../guards.js';
import { MOCKGEN_ERROR_CODE, MockGenError } from '../errors.js';

type CsnRecord = Record<string, unknown>;

function typeName(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }
    if (isRecord(value) && Array.isArray(value.ref)) {
        const reference: unknown[] = value.ref;
        const last = reference.at(-1);
        return typeof last === 'string' ? last : '';
    }
    return '';
}

function primitiveType(value: unknown): PrimitiveType {
    switch (typeName(value)) {
        case 'cds.Integer':
        case 'cds.Integer16':
        case 'cds.Integer32':
        case 'cds.Integer64':
        case 'cds.Int16':
        case 'cds.Int32':
        case 'cds.Int64':
        case 'cds.UInt8':
            return 'int';
        case 'cds.Decimal':
        case 'cds.DecimalFloat':
        case 'cds.Double':
            return 'decimal';
        case 'cds.Boolean':
            return 'bool';
        case 'cds.UUID':
            return 'guid';
        case 'cds.Date':
            return 'date';
        case 'cds.DateTime':
            return 'datetime';
        case 'cds.Timestamp':
            return 'datetimeoffset';
        case 'cds.Time':
            return 'time';
        case 'cds.Binary':
        case 'cds.LargeBinary':
            return 'binary';
        default:
            return 'string';
    }
}

function integerBounds(value: unknown): Readonly<{ numericMinimum: number; numericMaximum: number }> | undefined {
    switch (typeName(value)) {
        case 'cds.UInt8':
            return { numericMinimum: 0, numericMaximum: 255 };
        case 'cds.Integer16':
        case 'cds.Int16':
            return { numericMinimum: -32_768, numericMaximum: 32_767 };
        case 'cds.Integer':
        case 'cds.Integer32':
        case 'cds.Int32':
            return { numericMinimum: -2_147_483_648, numericMaximum: 2_147_483_647 };
        case 'cds.Integer64':
        case 'cds.Int64':
            return { numericMinimum: Number.MIN_SAFE_INTEGER, numericMaximum: Number.MAX_SAFE_INTEGER };
        default:
            return undefined;
    }
}

function optionalInteger(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function isAssociation(element: CsnRecord): boolean {
    const name = typeName(element.type);
    return typeof element.target === 'string' || name === 'cds.Association' || name === 'cds.Composition';
}

function localEntityName(qualifiedName: string): string {
    const parts = qualifiedName.split('.');
    return parts.length > 1 ? parts.slice(1).join('_') : qualifiedName;
}

/** Selects the CAP service a CSN document is read for when it defines more than one. */
interface CsnServiceSelection {
    /** Service name, either fully qualified or without its namespace. */
    alias?: string;
    /** Request URL path; matched against the service's `@path` or CAP's default path. */
    urlPath?: string;
}

/**
 * @param path URL or service path
 * @returns its non-empty segments
 */
function pathSegments(path: string): ReadonlyArray<string> {
    return path.split('/').filter((segment) => segment.length > 0);
}

/**
 * @param serviceName qualified service name
 * @returns the name without its namespace
 */
function shortServiceName(serviceName: string): string {
    return serviceName.split('.').at(-1) ?? serviceName;
}

/**
 * CAP serves a service at its `@path`, or by default at its name without the `Service` suffix in kebab case.
 *
 * @param serviceName qualified service name
 * @param definition service definition
 * @returns path segments the service is served under
 */
function servicePath(serviceName: string, definition: CsnRecord): ReadonlyArray<string> {
    const declared = definition['@path'];
    if (typeof declared === 'string') {
        return pathSegments(declared);
    }
    const name = shortServiceName(serviceName).replace(/Service$/u, '') || shortServiceName(serviceName);
    return [name.replaceAll(/([a-z0-9])([A-Z])/gu, '$1-$2').toLowerCase()];
}

/**
 * @param urlPath request URL path
 * @param path segments a service is served under
 * @returns true when the URL path ends with the service path
 */
function servedAt(urlPath: string, path: ReadonlyArray<string>): boolean {
    const url = pathSegments(urlPath);
    return (
        path.length > 0 &&
        path.length <= url.length &&
        path.every((segment, index) => url[url.length - path.length + index] === segment)
    );
}

/**
 * Pick the service to read: by alias, then by URL path, then the only service.
 *
 * @param definitions CSN definitions
 * @param selection alias and URL path from the request
 * @returns the qualified service name, or undefined when the document defines no service
 */
function selectService(
    definitions: Readonly<Record<string, CsnRecord>>,
    selection: CsnServiceSelection
): string | undefined {
    const services = Object.keys(definitions)
        .filter((name) => definitions[name].kind === 'service')
        .sort((left, right) => compareCodePoints(left, right));
    if (services.length === 0) {
        return undefined;
    }
    const available = services.join(', ');
    if (selection.alias !== undefined) {
        const named = services.filter((name) => name === selection.alias || shortServiceName(name) === selection.alias);
        if (named.length !== 1) {
            throw new MockGenError(
                MOCKGEN_ERROR_CODE.METADATA_INVALID,
                `CAP CSN ${named.length === 0 ? 'has no service' : 'has several services'} named ${
                    selection.alias
                }; available services: ${available}`
            );
        }
        return named[0];
    }
    const { urlPath } = selection;
    const served =
        urlPath === undefined ? [] : services.filter((name) => servedAt(urlPath, servicePath(name, definitions[name])));
    if (served.length === 1) {
        return served[0];
    }
    if (services.length === 1) {
        return services[0];
    }
    throw new MockGenError(
        MOCKGEN_ERROR_CODE.METADATA_INVALID,
        `CAP CSN defines several services (${available}); set service.alias to the service to generate data for`
    );
}

/**
 * @param qualifiedNames qualified names of the entities to emit
 * @param service selected service, if any
 * @returns the entity set name of each qualified name
 */
function entitySetNames(
    qualifiedNames: ReadonlyArray<string>,
    service: string | undefined
): ReadonlyMap<string, string> {
    const names = new Map<string, string>();
    const owners = new Map<string, string>();
    for (const qualifiedName of qualifiedNames) {
        // Inside a service CAP names the entity set after the service-local name, joining nested parts with '_'.
        const name =
            service === undefined
                ? localEntityName(qualifiedName)
                : qualifiedName.slice(service.length + 1).replaceAll('.', '_');
        const owner = owners.get(name);
        if (owner !== undefined) {
            throw new MockGenError(
                MOCKGEN_ERROR_CODE.METADATA_INVALID,
                `CAP CSN definitions ${owner} and ${qualifiedName} both resolve to the entity set name ${name}; ` +
                    'expose them through a service or rename one of them'
            );
        }
        owners.set(name, qualifiedName);
        names.set(qualifiedName, name);
    }
    return names;
}

function resolveElement(
    element: CsnRecord,
    definitions: Readonly<Record<string, CsnRecord>>,
    visited: ReadonlySet<string> = new Set()
): CsnRecord {
    const name = typeName(element.type);
    if (!name || name.startsWith('cds.') || visited.has(name)) {
        return element;
    }
    const definition = definitions[name];
    if (definition?.type === undefined) {
        return element;
    }
    const inherited = resolveElement(definition, definitions, new Set(visited).add(name));
    return { ...inherited, ...element, type: inherited.type, enum: element.enum ?? inherited.enum };
}

function annotations(element: CsnRecord): ReadonlyArray<SchemaAnnotation> {
    return Object.entries(element)
        .filter(([name]) => name.startsWith('@'))
        .map(([name, value]) => ({
            term: name.slice(1),
            ...(typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? { value } : {})
        }));
}

function stringAnnotation(element: CsnRecord, ...names: ReadonlyArray<string>): string | undefined {
    for (const name of names) {
        const value = element[`@${name}`];
        if (typeof value === 'string') {
            return value;
        }
    }
    return undefined;
}

function enumValues(element: CsnRecord): ReadonlyArray<string | number | boolean> | undefined {
    if (!isRecord(element.enum)) {
        return undefined;
    }
    return Object.entries(element.enum).map(([name, definition]) => {
        if (isRecord(definition)) {
            const value = definition.val;
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                return value;
            }
        }
        return name;
    });
}

function pathValue(value: unknown): string | undefined {
    if (typeof value === 'string') {
        return value;
    }
    if (isRecord(value) && typeof value['='] === 'string') {
        return value['='];
    }
    if (isRecord(value) && Array.isArray(value.ref)) {
        const reference: unknown[] = value.ref;
        const last = reference.at(-1);
        return typeof last === 'string' ? last : undefined;
    }
    return undefined;
}

function valueListParameters(element: CsnRecord): SchemaProperty['links'] | undefined {
    const annotation = element['@Common.ValueList'] ?? element['@Common.v1.ValueList'];
    if (!isRecord(annotation) || typeof annotation.CollectionPath !== 'string') {
        return undefined;
    }
    const records = Array.isArray(annotation.Parameters) ? annotation.Parameters.filter(isRecord) : [];
    const parameters: SchemaValueListParameter[] = records.flatMap((record) => {
        const type = typeof record.$Type === 'string' ? record.$Type : '';
        const direction = valueListParameterDirection(type);
        if (!direction) {
            return [];
        }
        const constant = record.Constant;
        return [
            {
                direction,
                ...(pathValue(record.LocalDataProperty) ? { localProperty: pathValue(record.LocalDataProperty) } : {}),
                ...(typeof record.ValueListProperty === 'string'
                    ? { valueListProperty: record.ValueListProperty }
                    : {}),
                ...(typeof constant === 'string' || typeof constant === 'number' || typeof constant === 'boolean'
                    ? { constant }
                    : {})
            }
        ];
    });
    const mappings = parameters.flatMap(({ localProperty, valueListProperty }) =>
        localProperty && valueListProperty ? [{ localProperty, valueListProperty }] : []
    );
    return {
        valueListCollection: annotation.CollectionPath,
        ...(parameters.length > 0 ? { valueListParameters: parameters } : {}),
        ...(mappings.length > 0 ? { valueListMappings: mappings } : {})
    };
}

/**
 * The element that `@Common.Text` names as the text of this element, when the annotation is a path to an
 * element of the same entity (`{"=": "name"}`). Paths through associations are not followed.
 *
 * @param element the element
 * @returns the text element's name
 */
function textPath(element: CsnRecord): string | undefined {
    const annotation = element['@Common.Text'] ?? element['@Common.v1.Text'];
    const path = isRecord(annotation) ? pathValue(annotation) : undefined;
    return path && !path.includes('/') && !path.includes('.') ? path : undefined;
}

function property(name: string, declared: CsnRecord, resolved: CsnRecord): SchemaProperty {
    const label = stringAnnotation(resolved, 'Common.Label', 'title');
    const description = stringAnnotation(resolved, 'Core.Description', 'description');
    const dataElement = stringAnnotation(resolved, 'sap.dataElement', 'SAP.Common.DataElement');
    const values = enumValues(resolved);
    const text = textPath(resolved);
    const valueList = valueListParameters(resolved);
    const links = text ? { ...valueList, text } : valueList;
    const bounds = integerBounds(resolved.type);
    return {
        name,
        primitiveType: primitiveType(resolved.type),
        nullable: resolved.notNull !== true,
        isKey: declared.key === true,
        maxLength: optionalInteger(resolved.length),
        precision: optionalInteger(resolved.precision),
        scale: optionalInteger(resolved.scale),
        ...bounds,
        ...(label ? { label } : {}),
        ...(description ? { description } : {}),
        ...(dataElement ? { dataElement } : {}),
        ...(values ? { enumValues: values } : {}),
        ...(links ? { links } : {}),
        annotations: annotations(resolved)
    };
}

/**
 * Parse a JSON-serialized CAP CSN document into the canonical generation graph.
 * When the document defines services, only the selected service's entities are read and each entity set is
 * named after its service-local name (`CatalogService.Shelves.texts` becomes `Shelves_texts`), as CAP serves them.
 *
 * @param content the CSN document
 * @param selection picks the service when the document defines more than one
 * @returns the schema graph
 * @throws {MockGenError} `METADATA_INVALID` when the document is not CSN JSON, several services match or two definitions resolve to the same entity set name
 */
export function parseCsn(content: string, selection: CsnServiceSelection = {}): SchemaGraph {
    let parsed: unknown;
    try {
        parsed = JSON.parse(content);
    } catch (error) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.METADATA_INVALID,
            `CAP CSN is not valid JSON: ${errorMessage(error)}`,
            {
                cause: error
            }
        );
    }
    if (!isRecord(parsed) || !isRecord(parsed.definitions)) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.METADATA_INVALID, 'CAP CSN must contain a definitions object');
    }
    const definitions = Object.fromEntries(
        Object.entries(parsed.definitions).filter((entry): entry is [string, CsnRecord] => isRecord(entry[1]))
    );
    const service = selectService(definitions, selection);
    const entityDefinitions = Object.entries(definitions).filter(
        ([qualifiedName, definition]) =>
            definition.kind === 'entity' && (service === undefined || qualifiedName.startsWith(`${service}.`))
    );
    const names = entitySetNames(
        entityDefinitions.map(([qualifiedName]) => qualifiedName),
        service
    );
    const entities: SchemaEntity[] = [];
    const relationships: SchemaRelationship[] = [];

    for (const [qualifiedName, definition] of entityDefinitions) {
        const entitySetName = names.get(qualifiedName);
        if (!entitySetName) {
            continue;
        }
        const elements = isRecord(definition.elements) ? definition.elements : {};
        const scalarProperties: SchemaProperty[] = [];
        for (const [name, candidate] of Object.entries(elements)) {
            if (!isRecord(candidate) || isAssociation(candidate)) {
                continue;
            }
            scalarProperties.push(property(name, candidate, resolveElement(candidate, definitions)));
        }

        for (const [associationName, candidate] of Object.entries(elements)) {
            if (!isRecord(candidate) || !isAssociation(candidate) || typeof candidate.target !== 'string') {
                continue;
            }
            const targetEntitySet = names.get(candidate.target);
            const targetDefinition = definitions[candidate.target];
            const targetElements =
                targetDefinition && isRecord(targetDefinition.elements) ? targetDefinition.elements : {};
            // A target outside the selected service is not navigable, but its foreign key is still a column.
            if (!Array.isArray(candidate.keys)) {
                continue;
            }
            const mappings: Array<{ sourceProperty: string; targetProperty: string }> = [];
            for (const key of candidate.keys) {
                if (!isRecord(key) || !Array.isArray(key.ref)) {
                    continue;
                }
                const reference: unknown[] = key.ref;
                const targetProperty = reference.at(-1);
                if (typeof targetProperty !== 'string') {
                    continue;
                }
                const sourceProperty = typeof key.as === 'string' ? key.as : `${associationName}_${targetProperty}`;
                const targetElement = targetElements[targetProperty];
                if (!isRecord(targetElement) || isAssociation(targetElement)) {
                    continue;
                }
                if (!scalarProperties.some((candidateProperty) => candidateProperty.name === sourceProperty)) {
                    const inherited = property(sourceProperty, {}, resolveElement(targetElement, definitions));
                    scalarProperties.push({ ...inherited, nullable: candidate.notNull !== true, isKey: false });
                }
                mappings.push({ sourceProperty, targetProperty });
            }
            if (targetEntitySet && mappings.length > 0) {
                relationships.push({
                    name: associationName,
                    fromEntitySet: entitySetName,
                    toEntitySet: targetEntitySet,
                    mappings: Object.freeze(mappings),
                    provenance: 'explicit',
                    confidence: 1
                });
            }
        }

        entities.push({
            name: entitySetName,
            entitySetName,
            properties: Object.freeze(scalarProperties.sort((left, right) => compareCodePoints(left.name, right.name)))
        });
    }

    return Object.freeze({
        namespace: 'CAPService',
        entities: Object.freeze(
            entities.sort((left, right) => compareCodePoints(left.entitySetName, right.entitySetName))
        ),
        relationships: Object.freeze(
            relationships.sort((left, right) =>
                compareCodePoints(`${left.fromEntitySet}.${left.name}`, `${right.fromEntitySet}.${right.name}`)
            )
        )
    });
}

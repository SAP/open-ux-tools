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

/**
 * The semantic key a CSN entity declares (`@Common.SemanticKey: [ID]`), kept only when it names its scalar
 * elements.
 *
 * @param definition the entity definition
 * @param scalarNames the names of its scalar elements
 * @returns the property names, or undefined when none is declared
 */
function csnSemanticKey(definition: CsnRecord, scalarNames: ReadonlySet<string>): string[] | undefined {
    const declared = definition['@Common.SemanticKey'] ?? definition['@Common.v1.SemanticKey'];
    const names = (Array.isArray(declared) ? declared : []).map((item: unknown) =>
        isRecord(item) && typeof item['='] === 'string' ? item['='] : item
    );
    const keyNames = names.filter((name): name is string => typeof name === 'string' && scalarNames.has(name));
    return keyNames.length > 0 && keyNames.length === names.length ? keyNames : undefined;
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

/**
 * The element a measure annotation (`@Measures.Unit`, `@Measures.ISOCurrency`) names as the unit or currency
 * of this element, when it is a path (`{"=": "unit_code"}`); a literal unit (`'%'`) names no element.
 *
 * @param element the element
 * @param term the annotation term without its vocabulary (`Unit`, `ISOCurrency`)
 * @returns the path, possibly through a managed association (`toUnit.code`)
 */
function measurePath(element: CsnRecord, term: string): string | undefined {
    const annotation = element[`@Measures.${term}`] ?? element[`@Measures.v1.${term}`];
    return isRecord(annotation) ? pathValue(annotation) : undefined;
}

/**
 * Keep the unit and currency links of an entity's elements that name one of its scalar elements. A path
 * through a managed association (`toUnit.code`) names the foreign key CAP flattens it to (`toUnit_code`).
 *
 * @param properties the entity's scalar elements
 * @returns the elements with their resolved links
 */
function withMeasureLinks(properties: ReadonlyArray<SchemaProperty>): SchemaProperty[] {
    const names = new Set(properties.map(({ name }) => name));
    const resolve = (path: string | undefined): string | undefined => {
        const flattened = path?.replaceAll('.', '_');
        return flattened !== undefined && !flattened.includes('/') && names.has(flattened) ? flattened : undefined;
    };
    return properties.map((candidate) => {
        if (candidate.links?.unit === undefined && candidate.links?.currency === undefined) {
            return candidate;
        }
        const { unit, currency, ...others } = candidate.links;
        const unitName = resolve(unit);
        const currencyName = resolve(currency);
        const links = {
            ...others,
            ...(unitName ? { unit: unitName } : {}),
            ...(currencyName ? { currency: currencyName } : {})
        };
        const { links: _unresolved, ...rest } = candidate;
        return Object.keys(links).length > 0 ? { ...rest, links } : rest;
    });
}

function property(name: string, declared: CsnRecord, resolved: CsnRecord): SchemaProperty {
    const label = stringAnnotation(resolved, 'Common.Label', 'title');
    const description = stringAnnotation(resolved, 'Core.Description', 'description');
    const dataElement = stringAnnotation(resolved, 'sap.dataElement', 'SAP.Common.DataElement');
    const values = enumValues(resolved);
    const text = textPath(resolved);
    const unit = measurePath(resolved, 'Unit');
    const currency = measurePath(resolved, 'ISOCurrency');
    const valueList = valueListParameters(resolved);
    const links =
        valueList || text || unit || currency
            ? { ...valueList, ...(text ? { text } : {}), ...(unit ? { unit } : {}), ...(currency ? { currency } : {}) }
            : undefined;
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
    const definitions = csnDefinitions(content);
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
        if (entitySetName) {
            entities.push(csnEntity({ definitions, names, relationships }, entitySetName, definition));
        }
    }

    return Object.freeze({
        namespace: 'CAPService',
        entities: Object.freeze(
            entities.toSorted((left, right) => compareCodePoints(left.entitySetName, right.entitySetName))
        ),
        relationships: Object.freeze(
            relationships.toSorted((left, right) =>
                compareCodePoints(`${left.fromEntitySet}.${left.name}`, `${right.fromEntitySet}.${right.name}`)
            )
        )
    });
}

/**
 * The record definitions of a JSON-serialized CAP CSN document.
 *
 * @param content the CSN document
 * @returns the definitions that are records, by qualified name
 * @throws {MockGenError} `METADATA_INVALID` when the document is not JSON or has no definitions object
 */
function csnDefinitions(content: string): Record<string, CsnRecord> {
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
    return Object.fromEntries(
        Object.entries(parsed.definitions).filter((entry): entry is [string, CsnRecord] => isRecord(entry[1]))
    );
}

/** What reading the entities of a CSN document shares. */
interface CsnEntityContext {
    /** The record definitions, by qualified name. */
    definitions: Record<string, CsnRecord>;
    /** The entity set name of each entity of the selected service, by qualified name. */
    names: ReadonlyMap<string, string>;
    /** Receives the relationships of the entities read. */
    relationships: SchemaRelationship[];
}

/**
 * Read one CSN entity: its scalar elements, then the foreign keys and relationships of its managed associations.
 *
 * @param context the definitions, entity set names and relationships being collected
 * @param entitySetName the entity set name of the entity
 * @param definition the entity definition
 * @returns the schema entity
 */
function csnEntity(context: CsnEntityContext, entitySetName: string, definition: CsnRecord): SchemaEntity {
    const elements = isRecord(definition.elements) ? definition.elements : {};
    const scalarProperties: SchemaProperty[] = [];
    for (const [name, candidate] of Object.entries(elements)) {
        if (isRecord(candidate) && !isAssociation(candidate)) {
            scalarProperties.push(property(name, candidate, resolveElement(candidate, context.definitions)));
        }
    }

    for (const [associationName, candidate] of Object.entries(elements)) {
        if (!isRecord(candidate) || !isAssociation(candidate)) {
            continue;
        }
        const { target, keys } = candidate;
        // A target outside the selected service is not navigable, but its foreign key is still a column.
        if (typeof target !== 'string' || !Array.isArray(keys)) {
            continue;
        }
        const targetEntitySet = context.names.get(target);
        const mappings = associationMappings(
            context,
            { name: associationName, target, keys, element: candidate },
            scalarProperties
        );
        if (targetEntitySet && mappings.length > 0) {
            context.relationships.push({
                name: associationName,
                fromEntitySet: entitySetName,
                toEntitySet: targetEntitySet,
                mappings: Object.freeze(mappings),
                provenance: 'explicit',
                confidence: 1
            });
        }
    }

    const semanticKey = csnSemanticKey(definition, new Set(scalarProperties.map(({ name }) => name)));
    return {
        name: entitySetName,
        entitySetName,
        ...(semanticKey ? { semanticKey } : {}),
        properties: Object.freeze(
            withMeasureLinks(scalarProperties).toSorted((left, right) => compareCodePoints(left.name, right.name))
        )
    };
}

/**
 * The foreign-key mappings of a managed association. A foreign key the entity does not declare is added to its
 * scalar properties, typed like the target element it refers to.
 *
 * @param context the definitions being read
 * @param association the association element with its name, target and keys
 * @param association.name the association element's name
 * @param association.target the qualified name of the target entity
 * @param association.keys the association's foreign keys
 * @param association.element the association element
 * @param scalarProperties the entity's scalar properties; receives the undeclared foreign keys
 * @returns the mappings from foreign key to target element, in key order
 */
function associationMappings(
    context: CsnEntityContext,
    association: Readonly<{ name: string; target: string; keys: ReadonlyArray<unknown>; element: CsnRecord }>,
    scalarProperties: SchemaProperty[]
): Array<{ sourceProperty: string; targetProperty: string }> {
    const associationName = association.name;
    const targetDefinition = context.definitions[association.target];
    const targetElements = targetDefinition && isRecord(targetDefinition.elements) ? targetDefinition.elements : {};
    const mappings: Array<{ sourceProperty: string; targetProperty: string }> = [];
    for (const key of association.keys) {
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
            const inherited = property(sourceProperty, {}, resolveElement(targetElement, context.definitions));
            scalarProperties.push({ ...inherited, nullable: association.element.notNull !== true, isKey: false });
        }
        mappings.push({ sourceProperty, targetProperty });
    }
    return mappings;
}

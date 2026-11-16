import { posix } from 'node:path';
import { edmxExternalCodeLists, parseEdmx, type EdmxCodeListReference } from '../schema/edmx.js';
import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../schema/graph.js';
import type {
    JsonValue,
    MockDataGeneratorDiagnostic,
    MockDataReferencedResource,
    MockDataReferencedService,
    MockDataReferencedServiceDescriptor,
    MockDataRow,
    MockDataServiceRequest
} from '../types.js';
import { MockGenError } from '../errors.js';
import { assertMetadataInputWithinLimit } from '../metadata-limit.js';
import { compareCodePoints } from '../ordering.js';
import { SAP_V2_SEMANTICS_CURRENCY_CODE, SAP_V2_TERM, VOCABULARY_TERM_SUFFIX } from '../spec/odata.js';
import { displayName } from './code-list-metadata.js';
import { currencyFractionDigits } from './coherence.js';
import { propertyValueIsValid } from './constraints.js';
import { pushUniqueDiagnostic } from './rows.js';

/** Fraction digits of a currency code no standard defines, unless its amounts use more. */
const DEFAULT_CURRENCY_SCALE = 2;
const MAX_SCALE = 14;
/** An OData simple identifier, so an entity set name is also a safe data file name. */
const ENTITY_SET_NAME = /^[A-Za-z_]\w*$/u;
/** A folder segment the host can join to a path on any platform: no separator, no `.` or `..`. */
const FOLDER_SEGMENT = /^(?!\.{1,2}$)[\w.~-]+$/u;

/** What a code-list row says about its code. */
interface CodeFacts {
    /** Name of the code. */
    name: string;
    /** Fraction digits of values measured in the code. */
    scale: number;
}

/** Codes the rows use for one code-list kind, with the most fraction digits a measured value has per code. */
type CodeUsage = Map<string, number>;

/**
 * The folder the SAP Fiori tools mockserver serves a referenced service from, relative to the folder of the
 * requested service's metadata. It is the referenced service path below the part it shares with the requested
 * service path, as `@sap-ux/fe-mockserver-core` resolves it.
 *
 * @param serviceUrlPath - URL path of the requested service
 * @param url - the code list's `Url`, relative to the requested service
 * @returns the relative folder; undefined when the url leaves no folder or a segment is not a plain name
 */
export function referencedServiceFolder(serviceUrlPath: string, url: string): string | undefined {
    const rootPath = serviceUrlPath.replace(/\/+$/u, '');
    const [servicePath] = posix.join(rootPath, url).replace('/$metadata', '').split(';');
    let prefix = '/';
    for (const segment of servicePath.split('/')) {
        const next = posix.join(prefix, segment);
        if (!rootPath.startsWith(next)) {
            break;
        }
        prefix = next;
    }
    const folder = servicePath.replace(prefix, '').replace(/^\/+/u, '');
    return folder.split('/').every((part) => FOLDER_SEGMENT.test(part)) ? folder : undefined;
}

/**
 * The code lists the requested service declares in other services, each with the folder it is served from.
 *
 * @param request - the requested service's metadata and identity
 * @returns code-list references with their folders; none for CSN, a folder that is not a plain relative path or an
 *   entity set that is not an OData identifier
 */
function externalCodeLists(
    request: Pick<MockDataServiceRequest, 'metadata' | 'service'>
): Array<EdmxCodeListReference & { folder: string }> {
    if (request.metadata.format !== 'edmx') {
        return [];
    }
    return edmxExternalCodeLists(request.metadata.content).flatMap((reference) => {
        const folder = reference.url ? referencedServiceFolder(request.service.urlPath, reference.url) : undefined;
        return folder && ENTITY_SET_NAME.test(reference.collectionPath) ? [{ ...reference, folder }] : [];
    });
}

/**
 * The referenced services a host should read and pass as `referencedServices`: for each folder, relative to the
 * folder of the requested service's metadata, the entity sets whose data files the generator completes.
 *
 * @param request - the requested service's metadata and identity
 * @returns one descriptor per folder, in declaration order
 * @throws {MockGenError} `METADATA_INPUT_TOO_LARGE` when the metadata exceeds the accepted input size
 * @throws {MockGenError} `METADATA_INVALID` when the EDMX document cannot be parsed as XML or has no Edmx/DataServices or no Schema
 * @example
 * describeReferencedServices({ metadata, service: { urlPath, odataVersion: '4.0' } });
 * // [{ folder: 'default/iwbep/common/0001', entitySets: ['Currencies', 'UnitsOfMeasure'] }]
 */
export function describeReferencedServices(
    request: Pick<MockDataServiceRequest, 'metadata' | 'service'>
): ReadonlyArray<MockDataReferencedServiceDescriptor> {
    assertMetadataInputWithinLimit(request.metadata);
    const byFolder = new Map<string, string[]>();
    for (const { folder, collectionPath } of externalCodeLists(request)) {
        const entitySets = byFolder.get(folder) ?? [];
        if (!entitySets.includes(collectionPath)) {
            entitySets.push(collectionPath);
        }
        byFolder.set(folder, entitySets);
    }
    return Object.freeze(
        [...byFolder].map(([folder, entitySets]) => Object.freeze({ folder, entitySets: Object.freeze(entitySets) }))
    );
}

/**
 * Number of fraction digits a measured value is written with.
 *
 * @param value - cell value
 * @returns fraction digits, at most `MAX_SCALE`; 0 for a value that is not a decimal number
 */
function fractionDigits(value: JsonValue | undefined): number {
    if (typeof value !== 'number' && typeof value !== 'string') {
        return 0;
    }
    const match = /^-?\d*\.(\d+)$/u.exec(String(value).trim());
    return match ? Math.min(match[1].length, MAX_SCALE) : 0;
}

/**
 * The fields of an entity that OData V2 marks as currency codes (`sap:semantics="currency-code"`).
 *
 * @param entity - the entity
 * @returns the field names
 */
function v2CurrencyCodeFields(entity: SchemaEntity): ReadonlySet<string> {
    return new Set(
        entity.properties
            .filter(({ annotations }) =>
                annotations.some(
                    ({ term, value }) => term === SAP_V2_TERM.semantics && value === SAP_V2_SEMANTICS_CURRENCY_CODE
                )
            )
            .map(({ name }) => name)
    );
}

/**
 * The field that holds the currency or the unit of a measured field. OData V2 names both with `sap:unit`; the
 * code field's semantics tell them apart.
 *
 * @param property - a field of the entity
 * @param v2CurrencyCodes - the entity's V2 currency-code fields
 * @returns the currency field and the unit field, either absent
 */
function measureCodeFields(
    property: SchemaProperty,
    v2CurrencyCodes: ReadonlySet<string>
): { currency?: string; unit?: string } {
    const { currency, unit } = property.links ?? {};
    if (currency) {
        return { currency, ...(unit && unit !== currency ? { unit } : {}) };
    }
    if (unit && v2CurrencyCodes.has(unit)) {
        return { currency: unit };
    }
    return unit ? { unit } : {};
}

/**
 * The currency and unit codes the rows use, read from the fields that `Measures.ISOCurrency` and `Measures.Unit`
 * name for each amount and quantity.
 *
 * @param graph - schema graph of the requested service
 * @param rows - all rows of the requested service by entity set
 * @returns used codes by kind
 */
function codeUsage(
    graph: SchemaGraph,
    rows: Readonly<Record<string, ReadonlyArray<MockDataRow>>>
): Record<EdmxCodeListReference['kind'], CodeUsage> {
    const usage: Record<EdmxCodeListReference['kind'], CodeUsage> = { currency: new Map(), unit: new Map() };
    const record = (codes: CodeUsage, code: JsonValue | undefined, digits: number): void => {
        if (typeof code === 'string' && code.trim() !== '') {
            codes.set(code, Math.max(codes.get(code) ?? 0, digits));
        }
    };
    for (const entity of graph.entities) {
        const v2CurrencyCodes = v2CurrencyCodeFields(entity);
        for (const row of rows[entity.entitySetName] ?? []) {
            for (const property of entity.properties) {
                const digits = fractionDigits(row[property.name]);
                const { currency, unit } = measureCodeFields(property, v2CurrencyCodes);
                if (currency) {
                    record(usage.currency, row[currency], digits);
                }
                if (unit) {
                    record(usage.unit, row[unit], digits);
                }
            }
        }
    }
    return usage;
}

/**
 * Cuts a text to a field's maximum length, in code points.
 *
 * @param value - text
 * @param property - target field
 * @returns the text, no longer than the field allows
 */
function fit(value: string, property: SchemaProperty): string {
    // Cut in code points, as the display texts of the requested service are.
    return property.maxLength === undefined ? value : Array.from(value).slice(0, property.maxLength).join('');
}

/**
 * The name and fraction digits of a code. An ISO 4217 currency gets its standard name and minor units; any other
 * code, such as a placeholder, keeps the code as its name and the digits its amounts use.
 *
 * @param kind - code-list kind
 * @param code - the code
 * @param dataDigits - most fraction digits a measured value uses with the code
 * @param locale - locale of the names
 * @returns name and scale
 */
function codeFacts(kind: EdmxCodeListReference['kind'], code: string, dataDigits: number, locale: string): CodeFacts {
    if (kind === 'currency' && Intl.supportedValuesOf('currency').includes(code)) {
        return {
            name: displayName(locale, 'currency', code) ?? code,
            scale: currencyFractionDigits(code) ?? DEFAULT_CURRENCY_SCALE
        };
    }
    return { name: code, scale: kind === 'currency' ? Math.max(dataDigits, DEFAULT_CURRENCY_SCALE) : dataDigits };
}

/**
 * A value for a field of a code-list row that no annotation gives a role, so a non-nullable field stays valid.
 *
 * @param property - code-list field
 * @param code - the row's code
 * @returns the value, or undefined when the field may stay out
 */
function typedValue(property: SchemaProperty, code: string): JsonValue | undefined {
    if (property.nullable) {
        return undefined;
    }
    switch (property.primitiveType) {
        case 'string':
            return fit(code, property);
        case 'bool':
            return false;
        case 'int':
        case 'decimal':
            return 0;
        default:
            return undefined;
    }
}

/**
 * One code-list row: the code in the key, and the text, unit-specific scale, standard code and external code in
 * the fields the key's `Common.Text`, `Common.UnitSpecificScale`, `CodeList.StandardCode` and
 * external-code annotations name. UI5 looks a code up by its external code when one is declared.
 *
 * @param entity - code-list entity
 * @param key - the code-list key
 * @param facts - name and scale of the code
 * @param code - the code
 * @returns the row, or undefined when a value does not fit its field
 */
function codeListRow(
    entity: SchemaEntity,
    key: SchemaProperty,
    facts: CodeFacts,
    code: string
): MockDataRow | undefined {
    // The key and the external code are written exactly, or the row is not written: UI5 finds a row by them, so
    // a cut code finds none. The text and the standard code only describe the row, so they are cut to fit.
    const roles = new Map<string, JsonValue>([[key.name, code]]);
    if (key.links?.scale) {
        roles.set(key.links.scale, facts.scale);
    }
    const externalCode = key.annotations.find(({ term }) =>
        term.toLowerCase().endsWith(VOCABULARY_TERM_SUFFIX.externalCode)
    )?.value;
    if (typeof externalCode === 'string') {
        roles.set(externalCode, code);
    }
    const descriptions = new Map<string | undefined, string>([
        [key.links?.standardCode, code],
        [key.links?.text, facts.name]
    ]);
    const row: Record<string, JsonValue> = {};
    for (const property of entity.properties) {
        const description = roles.has(property.name) ? undefined : descriptions.get(property.name);
        const value =
            description === undefined
                ? (roles.get(property.name) ?? typedValue(property, code))
                : fit(description, property);
        if (value === undefined) {
            continue;
        }
        if (!propertyValueIsValid(property, value)) {
            return undefined;
        }
        row[property.name] = value;
    }
    return Object.freeze(row);
}

/**
 * The entities of a referenced service.
 *
 * @param service - the referenced service as the host passed it
 * @returns its entities; undefined when its metadata is not EDMX or cannot be read
 * @throws {MockGenError} when the metadata exceeds the input limit
 */
function referencedEntities(service: MockDataReferencedService): ReadonlyArray<SchemaEntity> | undefined {
    if (service.metadata.format !== 'edmx') {
        return undefined;
    }
    assertMetadataInputWithinLimit(service.metadata);
    try {
        return parseEdmx(service.metadata.content).entities;
    } catch (error) {
        // Unreadable referenced metadata leaves its data as is and is reported; the requested rows still publish.
        if (error instanceof MockGenError) {
            return undefined;
        }
        throw error;
    }
}

/**
 * The complete rows of one referenced code list: its existing rows, then a row for each used code they lack.
 *
 * @param reference - the code list
 * @param service - the referenced service as the host passed it
 * @param codes - codes the requested service's rows use for the code list's kind
 * @param locale - locale of the names
 * @param diagnostics - diagnostics to extend
 * @returns the complete rows, or undefined when no row was added
 */
function completeCodeList(
    reference: EdmxCodeListReference & { folder: string },
    service: MockDataReferencedService,
    codes: CodeUsage,
    locale: string,
    diagnostics: MockDataGeneratorDiagnostic[]
): ReadonlyArray<MockDataRow> | undefined {
    const target = `${reference.folder}/${reference.collectionPath}`;
    const entity = referencedEntities(service)?.find(({ entitySetName }) => entitySetName === reference.collectionPath);
    const keys = entity?.properties.filter(({ isKey }) => isKey) ?? [];
    if (!entity || keys.length !== 1) {
        pushUniqueDiagnostic(diagnostics, {
            code: 'REFERENCED_CODE_LIST_UNSUPPORTED',
            severity: 'warning',
            target,
            message:
                'The referenced code-list metadata is not readable EDMX, or its entity set is missing or has no single key; its data is left as is.'
        });
        return undefined;
    }
    const [key] = keys;
    const existing = service.existingRows?.[reference.collectionPath] ?? [];
    const known = new Set(existing.map((row) => row[key.name]));
    const added = [...codes]
        .filter(([code]) => !known.has(code))
        .sort(([left], [right]) => compareCodePoints(left, right))
        .flatMap(([code, digits]) => {
            const row = codeListRow(entity, key, codeFacts(reference.kind, code, digits, locale), code);
            if (!row) {
                pushUniqueDiagnostic(diagnostics, {
                    code: 'REFERENCED_CODE_LIST_UNSUPPORTED',
                    severity: 'warning',
                    target,
                    message: 'A code the rows use does not fit the referenced code list; amounts with it may not show.'
                });
            }
            return row ? [row] : [];
        });
    return added.length > 0 ? Object.freeze([...existing, ...added]) : undefined;
}

/**
 * Completes the code lists the requested service declares in other services (`CodeList.CurrencyCodes`,
 * `CodeList.UnitsOfMeasure`) with every currency and unit code its rows use. UI5 shows no amount or quantity
 * whose code its code list lacks, and the mockserver serves a referenced code list only from local data files.
 * A declared code list whose service the host did not pass is reported, not skipped silently.
 *
 * @param request - the generation request, with the referenced services the host stores locally
 * @param graph - schema graph of the requested service
 * @param rows - all rows of the requested service by entity set, existing and generated
 * @param diagnostics - diagnostics to extend
 * @param locale - locale of the names
 * @returns the referenced data files that changed
 */
export function completeReferencedCodeLists(
    request: MockDataServiceRequest,
    graph: SchemaGraph,
    rows: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    diagnostics: MockDataGeneratorDiagnostic[],
    locale = 'en'
): ReadonlyArray<MockDataReferencedResource> {
    const references = externalCodeLists(request);
    if (references.length === 0) {
        return [];
    }
    const usage = codeUsage(graph, rows);
    const resources: MockDataReferencedResource[] = [];
    for (const reference of references) {
        const codes = usage[reference.kind];
        if (codes.size === 0) {
            continue;
        }
        const service = request.referencedServices?.find(({ folder }) => folder === reference.folder);
        if (!service) {
            pushUniqueDiagnostic(diagnostics, {
                code: 'REFERENCED_SERVICE_UNAVAILABLE',
                severity: 'warning',
                target: `${reference.folder}/${reference.collectionPath}`,
                message:
                    'The service that holds a declared code list was not supplied; amounts or quantities whose code it lacks may not show.'
            });
            continue;
        }
        const completed = completeCodeList(reference, service, codes, locale, diagnostics);
        if (completed) {
            resources.push(
                Object.freeze({ folder: reference.folder, entitySet: reference.collectionPath, rows: completed })
            );
        }
    }
    return Object.freeze(resources);
}

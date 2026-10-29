import { sha256Uint32 } from '../hash.js';
import { lazy } from '../lazy.js';
import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../schema/graph.js';
import { packagedBanks, type PackagedBanks } from '../semantics/bank-store.js';
import { semanticPropertyKey } from '../semantics/classifier.js';
import { semanticRules } from '../semantics/rule-store.js';
import { semanticRowContext, semanticValue } from '../semantics/value-banks.js';
import type {
    ExistingMockData,
    JsonValue,
    MockDataRow,
    SemanticClassification,
    SyntheticSampleDataset
} from '../types.js';
import { generatedRowFlags } from './authored.js';
import { isCountryCodeField, matchingCountry, sharedContext } from './coherence.js';
import { propertyValueIsValid } from './constraints.js';
import { protectedPropertyNames } from './rows.js';

type Location = PackagedBanks['locations'][number];

/** A place field and the role that fills it. */
interface PlaceField {
    property: SchemaProperty;
    role: string;
}

/** A country field of an entity and the place fields that follow it. */
interface PlaceGroup {
    country: SchemaProperty;
    places: ReadonlyArray<PlaceField>;
}

/** The bank locations by upper-case country code, by upper-case city and by the country of their BIC. */
const locationIndex = lazy(() => {
    const locations = packagedBanks().locations;
    return {
        byCountry: new Map(locations.map((location) => [location.country.toUpperCase(), location])),
        byCity: new Map(locations.map((location) => [location.city.toUpperCase(), location]))
    };
});

/**
 * The location a fixed place value names: a city of the bank, or the country of a BIC (its letters 5 and 6).
 *
 * @param role the place field's role
 * @param value its value
 * @returns the location, or undefined when the value names none
 */
function locationNamedBy(role: string, value: JsonValue | undefined): Location | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }
    const { byCity, byCountry } = locationIndex();
    if (role === 'city') {
        return byCity.get(value.trim().toUpperCase());
    }
    return role === 'bic' && /^[A-Z]{6}/u.test(value) ? byCountry.get(value.slice(4, 6)) : undefined;
}

/**
 * The country field a place field follows: for a place of the record itself the matching country field, for
 * a place of another party (a bank) only a country field that shares a context word with it or its entity.
 *
 * @param entity the place field's entity
 * @param property the place field
 * @param role its planned role
 * @param countries the entity's country fields
 * @returns the country field, or undefined when the field follows none
 */
function countryOf(
    entity: SchemaEntity,
    property: SchemaProperty,
    role: string,
    countries: ReadonlyArray<SchemaProperty>
): SchemaProperty | undefined {
    const { leafRoles, contextLeafRoles } = semanticRules().geography;
    if (leafRoles.has(role)) {
        return matchingCountry(property, countries);
    }
    const shared = contextLeafRoles.has(role)
        ? countries.filter((country) => sharedContext(property, country, entity.name) > 0)
        : [];
    return shared.length > 0 ? matchingCountry(property, shared) : undefined;
}

/**
 * The country fields of an entity and the place fields each one anchors. A country field is planned with
 * the geography anchor role, or is named as a country code and has no other role; a place field is
 * planned with a geography leaf role.
 *
 * @param entity the entity
 * @param classifications planned roles by `EntitySet.Property`
 * @returns the groups, one per country field with place fields
 */
function placeGroups(
    entity: SchemaEntity,
    classifications: ReadonlyMap<string, SemanticClassification>
): ReadonlyArray<PlaceGroup> {
    const { anchorRole } = semanticRules().geography;
    const roleOf = (property: SchemaProperty): string | undefined =>
        classifications.get(semanticPropertyKey(entity.entitySetName, property.name))?.role;
    const countries = entity.properties.filter((property) => {
        const role = roleOf(property);
        return (
            property.primitiveType === 'string' &&
            (role === anchorRole || ((role === undefined || role === 'unknown') && isCountryCodeField(property)))
        );
    });
    const places = new Map<SchemaProperty, PlaceField[]>();
    for (const property of entity.properties) {
        const role = roleOf(property);
        const country = role === undefined ? undefined : countryOf(entity, property, role, countries);
        if (country && role !== undefined && !countries.includes(property)) {
            places.set(country, [...(places.get(country) ?? []), { property, role }]);
        }
    }
    return [...places].map(([country, fields]) => ({ country, places: fields }));
}

/** What anchoring the geography of rows reads. */
export interface RowGeographyAnchoring {
    graph: SchemaGraph;
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>;
    existingData: Readonly<Record<string, ExistingMockData>>;
    /** Planned roles by `EntitySet.Property`. */
    classifications: ReadonlyMap<string, SemanticClassification>;
    seed: number;
    /** Properties whose values another entity supplied, by entity set: never written, read as given. */
    projectedProperties?: ReadonlyMap<string, ReadonlySet<string>>;
    /** The host's sample dataset, whose role samples take precedence as in generation. */
    sampleDataset?: SyntheticSampleDataset;
}

/** The rows after anchoring and the properties whose values were written, by entity set. */
export interface RowGeographyResult {
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>;
    written: ReadonlyMap<string, ReadonlySet<string>>;
}

/** One row being anchored and what may be written in it. */
interface RowAnchoring {
    input: RowGeographyAnchoring;
    entity: SchemaEntity;
    row: Record<string, JsonValue>;
    rowIndex: number;
    /** Whether a field of this row may be written. */
    writable: (property: SchemaProperty) => boolean;
    written: Set<string>;
}

/**
 * Write a value when the field accepts it and it differs from the current one.
 *
 * @param anchoring the row
 * @param property the field
 * @param value the value
 */
function write(anchoring: RowAnchoring, property: SchemaProperty, value: JsonValue): void {
    if (value !== anchoring.row[property.name] && propertyValueIsValid(property, value)) {
        anchoring.row[property.name] = value;
        anchoring.written.add(property.name);
    }
}

/**
 * Anchor the place fields of one country field in one row. A free country follows a fixed place value
 * that names a location; every free place field is then drawn from the location of the row's country, or
 * left empty when no location knows that country.
 *
 * @param anchoring the row
 * @param group the country field and its place fields
 */
function anchorGroup(anchoring: RowAnchoring, group: PlaceGroup): void {
    const { input, entity, row, rowIndex, writable } = anchoring;
    if (writable(group.country)) {
        const named = group.places
            .filter(({ property }) => !writable(property))
            .map(({ property, role }) => locationNamedBy(role, row[property.name]))
            .find((location) => location !== undefined);
        if (named) {
            write(anchoring, group.country, named.country);
        }
    }
    const country = row[group.country.name];
    if (typeof country !== 'string' || country.trim() === '') {
        return;
    }
    const location = locationIndex().byCountry.get(country.trim().toUpperCase());
    const context = location && {
        ...semanticRowContext(sha256Uint32(`${input.seed}:${entity.entitySetName}:${rowIndex}`), input.sampleDataset),
        location
    };
    for (const { property, role } of group.places.filter((place) => writable(place.property))) {
        const hash = sha256Uint32(`${input.seed}:${entity.entitySetName}:${property.name}:${rowIndex}`);
        const value = context ? semanticValue(role, property, context, hash, rowIndex) : undefined;
        write(anchoring, property, value ?? (property.nullable ? null : ''));
    }
}

/**
 * Make the place fields of every generated row follow one country: city, region, postal code, telephone
 * numbers, bank and BIC, and time zone come from the location record of the row's country, whichever
 * entity or reference supplied that country. A country field another entity or the caller fixed decides;
 * a free country follows a fixed city or BIC. Place fields of a country no location knows are left empty
 * rather than claiming another country. Supplied rows, keys, enumerations, relationship ends and
 * projected cells are never written.
 *
 * @param input the rows, the plan and what is fixed
 * @returns the rows and the properties written, by entity set
 * @example
 * const { resources } = anchorRowGeography({ graph, resources, existingData, classifications, seed: 1 });
 */
export function anchorRowGeography(input: RowGeographyAnchoring): RowGeographyResult {
    const output: Record<string, ReadonlyArray<MockDataRow>> = { ...input.resources };
    const written = new Map<string, Set<string>>();
    for (const entity of input.graph.entities) {
        const rows = input.resources[entity.entitySetName];
        const groups = rows ? placeGroups(entity, input.classifications) : [];
        if (!rows || groups.length === 0) {
            continue;
        }
        const fixed = protectedPropertyNames(input.graph, entity);
        input.projectedProperties?.get(entity.entitySetName)?.forEach((name) => fixed.add(name));
        const generated = generatedRowFlags(entity, rows, input.existingData);
        const entityWritten = new Set<string>();
        output[entity.entitySetName] = Object.freeze(
            rows.map((source, rowIndex) => {
                const anchoring: RowAnchoring = {
                    input,
                    entity,
                    row: { ...source },
                    rowIndex,
                    writable: (property) => generated[rowIndex] && !fixed.has(property.name),
                    written: new Set()
                };
                groups.forEach((group) => anchorGroup(anchoring, group));
                anchoring.written.forEach((name) => entityWritten.add(name));
                return anchoring.written.size > 0 ? Object.freeze(anchoring.row) : source;
            })
        );
        if (entityWritten.size > 0) {
            written.set(entity.entitySetName, entityWritten);
        }
    }
    return { resources: Object.freeze(output), written };
}

import { createHash } from 'node:crypto';
import type {
    ConceptBank,
    ExistingMockData,
    JsonValue,
    MockDataGeneratorDiagnostic,
    MockDataGeneratorOptions,
    MockDataRow,
    MockDataTarget,
    SemanticClassification,
    ValueTier
} from '../types.js';
import { VALUE_TIER } from '../types.js';
import type { SchemaEntity, SchemaGraph, SchemaProperty, SchemaRelationship } from '../schema/graph.js';
import { semanticPropertyKey } from '../semantics/classifier.js';
import { semanticRoleKeyCardinality } from '../semantics/role-registry.js';
import { authoredRows, publishedRows } from './authored.js';
import { semanticRowContext, semanticValue, type SemanticRowContext } from '../semantics/value-banks.js';
import { applySemanticCoherence } from './coherence.js';
import { conceptValue } from './concept-values.js';
import { propertyValueIsValid } from './constraints.js';
import { inferredCoherenceRules } from './temporal-plan.js';

function routedRole(classification: SemanticClassification | undefined): string | undefined {
    if (
        !classification ||
        classification.role === 'unknown' ||
        classification.confidence < (classification.routeThreshold ?? 0.5)
    ) {
        return undefined;
    }
    return classification.role;
}

function stableNumber(value: string): number {
    return createHash('sha256').update(value).digest().readUInt32BE(0);
}

function humanize(value: string): string {
    return value
        .replace(/([a-z\d])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^./, (character) => character.toUpperCase());
}

// Words that only say a field is an identifier; they do not name what it identifies.
const IDENTIFIER_WORDS = new Set(['id', 'uuid', 'guid', 'key', 'code', 'no', 'nr', 'num', 'number']);
const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Upper-case initials of the words of a technical name, identifier words left out: `SettlementTypeCode`
 * gives `ST`, `TravelID` gives `T`.
 *
 * @param name technical name
 * @param maximum most letters to keep
 * @returns initials, at least one letter
 */
function nameInitials(name: string, maximum: number): string {
    const words = humanize(name)
        .split(' ')
        .filter((word) => /^\p{L}/u.test(word));
    const meaningful = words.filter((word) => !IDENTIFIER_WORDS.has(word.toLowerCase()));
    const letters = (meaningful.length > 0 ? meaningful : words).map((word) => word[0]?.toUpperCase() ?? '').join('');
    return (letters || 'X').slice(0, Math.max(1, maximum));
}

/**
 * A code-shaped value of at most `maximumLength` characters: initials of the name and a zero-padded
 * ordinal (`ST001`), or a single letter or digit for one-character columns.
 *
 * @param name technical name the initials come from
 * @param ordinal 1-based ordinal
 * @param maximumLength declared maximum length, if any
 * @returns the code
 */
function codeShaped(name: string, ordinal: number, maximumLength?: number): string {
    if (maximumLength !== undefined && maximumLength <= 0) {
        return '';
    }
    if (maximumLength === 1) {
        return CODE_ALPHABET[(ordinal - 1) % CODE_ALPHABET.length] ?? 'A';
    }
    const length = Math.min(maximumLength ?? 6, 6);
    const prefix = nameInitials(name, Math.max(1, Math.min(3, length - 1)));
    const digits = Math.max(1, length - prefix.length);
    return `${prefix}${String(ordinal % 10 ** digits).padStart(digits, '0')}`.slice(0, length);
}

function uniqueEnumValues(property: SchemaProperty): ReadonlyArray<string | number | boolean> {
    return [...new Set(property.enumValues ?? [])];
}

function binaryOrdinal(ordinal: number, maximumLength?: number): string {
    if (maximumLength !== undefined && maximumLength < 4) {
        return '';
    }
    const hexadecimal = ordinal.toString(16).padStart(2, '0');
    return Buffer.from(hexadecimal.length % 2 === 0 ? hexadecimal : `0${hexadecimal}`, 'hex').toString('base64');
}

function numericStringKey(length: number, ordinal: number): string {
    const capacity = 10n ** BigInt(length);
    const baseline = length === 1 ? 0n : 10n ** BigInt(length - 1);
    return ((baseline + BigInt(ordinal)) % capacity).toString().padStart(length, '0');
}

interface GovernedStringKeyDomain {
    cardinality: number;
    /**
     * The key of an ordinal below `cardinality`. `offset` rotates the domain so unrelated entity sets
     * do not share keys; formats that ignore it keep one fixed domain.
     */
    value: (ordinal: number, offset?: number) => string;
}

function cappedPower(base: number, exponent: number): number {
    let result = 1;
    for (let index = 0; index < exponent && result < 1_001; index += 1) {
        result = Math.min(1_001, result * base);
    }
    return result;
}

/**
 * Keep governed key formatting and declared capacity on the same domain definition.
 *
 * @param property
 */
function governedStringKeyDomain(property: SchemaProperty): GovernedStringKeyDomain | undefined {
    const words = new Set(
        property.name
            .replace(/([a-z\d])([A-Z])/g, '$1 $2')
            .replace(/[_-]+/g, ' ')
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean)
    );
    if (words.has('bank') && words.has('statement') && words.has('short') && words.has('id')) {
        const length = Math.min(property.maxLength ?? 8, 8);
        if (length === 0) {
            return { cardinality: 0, value: () => '' };
        }
        const cardinality = cappedPower(10, length);
        return {
            cardinality,
            value: (ordinal) => (length === 8 ? String(20_260_001 + ordinal) : numericStringKey(length, ordinal))
        };
    }
    if (words.has('serial')) {
        const length = Math.min(property.maxLength ?? 18, 18);
        if (length === 0) {
            return { cardinality: 0, value: () => '' };
        }
        let prefix = '';
        if (length >= 3) {
            prefix = 'SN';
        } else if (length === 2) {
            prefix = 'S';
        }
        const suffixLength = length - prefix.length;
        const cardinality = cappedPower(36, suffixLength);
        return {
            cardinality,
            value: (ordinal) =>
                `${prefix}${(ordinal % cardinality).toString(36).toUpperCase().padStart(suffixLength, '0')}`
        };
    }
    if ([...words].some((word) => ['customer', 'supplier', 'proposal', 'order', 'document'].includes(word))) {
        const length = Math.min(property.maxLength ?? 10, 10);
        if (length === 0) {
            return { cardinality: 0, value: () => '' };
        }
        const cardinality = cappedPower(10, length);
        return { cardinality, value: (ordinal) => numericStringKey(length, ordinal) };
    }
    return readableStringKeyDomain(property, words);
}

/**
 * The typed key format of a string key no other rule governs, for columns of at least four characters:
 * an identifier (`...ID`, `...Number`) takes a zero-padded number (`10000001`), anything else a code of
 * the name's initials and a zero-padded ordinal (`ST0001`). Every format leaves room for at least 1,000
 * distinct keys; shorter columns keep the compact base-36 keys.
 *
 * @param property the key property
 * @param words the lower-case words of its name
 * @returns the key domain, or undefined for columns shorter than four characters
 */
function readableStringKeyDomain(
    property: SchemaProperty,
    words: ReadonlySet<string>
): GovernedStringKeyDomain | undefined {
    if (property.maxLength !== undefined && property.maxLength < 4) {
        return undefined;
    }
    const nameWords = [...words];
    const last = nameWords.at(-1) ?? '';
    const length = Math.min(property.maxLength ?? 8, 10);
    if (['id', 'number', 'no', 'nr', 'num'].includes(last)) {
        // A rotation of the numbers from 10^(length-1): distinct for every ordinal below the cardinality.
        const span = 9 * 10 ** (length - 1);
        return {
            cardinality: cappedPower(10, length - 1),
            value: (ordinal, offset = 0) => numericStringKey(length, (offset + ordinal) % span)
        };
    }
    const prefix = nameInitials(property.name, Math.min(3, length - 3));
    const digits = length - prefix.length;
    return {
        cardinality: cappedPower(10, digits),
        value: (ordinal, offset = 0) => `${prefix}${String((offset + ordinal) % 10 ** digits).padStart(digits, '0')}`
    };
}

function integerRange(
    property: SchemaProperty,
    preferredMinimum: number,
    preferredMaximum: number
): Readonly<{ minimum: number; maximum: number }> {
    const facetMinimum = property.numericMinimum ?? Number.MIN_SAFE_INTEGER;
    const facetMaximum = property.numericMaximum ?? Number.MAX_SAFE_INTEGER;
    const minimum = Math.max(facetMinimum, preferredMinimum);
    const maximum = Math.min(facetMaximum, preferredMaximum);
    return minimum <= maximum ? { minimum, maximum } : { minimum: facetMinimum, maximum: facetMaximum };
}

function keyValue(property: SchemaProperty, ordinal: number, seed: number, scope: string): JsonValue {
    const values = uniqueEnumValues(property);
    if (values.length > 0) {
        return values[ordinal % values.length];
    }
    switch (property.primitiveType) {
        case 'int': {
            const range = integerRange(property, 1, Number.MAX_SAFE_INTEGER);
            return range.minimum + ordinal;
        }
        case 'decimal': {
            const precision = Math.min(property.precision ?? 15, 15);
            const scale = Math.min(property.scale ?? 0, precision);
            return Number((ordinal / 10 ** scale).toFixed(scale));
        }
        case 'bool':
            return ordinal % 2 === 1;
        case 'guid': {
            const value = createHash('sha256').update(`${seed}:${scope}:${ordinal}`).digest('hex');
            return `${value.slice(0, 8)}-${value.slice(8, 12)}-4${value.slice(13, 16)}-a${value.slice(
                17,
                20
            )}-${value.slice(20, 32)}`;
        }
        case 'date':
            return new Date(Date.UTC(2020, 0, 1 + (stableNumber(`${seed}:${scope}:date-key`) % 1_825) + ordinal))
                .toISOString()
                .slice(0, 10);
        case 'datetime':
        case 'datetimeoffset':
            return new Date(
                Date.UTC(2020, 0, 1 + (stableNumber(`${seed}:${scope}:date-key`) % 1_825), 0, 0, ordinal)
            ).toISOString();
        case 'time': {
            const hours = Math.floor(ordinal / 3_600);
            const minutes = Math.floor((ordinal % 3_600) / 60);
            const seconds = ordinal % 60;
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
                2,
                '0'
            )}`;
        }
        case 'binary':
            return binaryOrdinal(ordinal, property.maxLength);
        case 'string': {
            const governed = governedStringKeyDomain(property);
            if (governed) {
                return governed.value(ordinal, stableNumber(`${seed}:${scope}`));
            }
            const seedHex = createHash('sha256').update(`${seed}:${scope}`).digest('hex').slice(0, 16);
            if (property.maxLength === undefined) {
                return `K${seedHex}${ordinal.toString(36)}`;
            }
            const capacity = 36n ** BigInt(property.maxLength);
            const value = (BigInt(`0x${seedHex}`) + BigInt(ordinal)) % capacity;
            return value.toString(36).toUpperCase().padStart(property.maxLength, '0');
        }
        default:
            throw new TypeError('Unsupported primitive key type');
    }
}

interface KeyGenerationProfile {
    scope: string;
    property: SchemaProperty;
    shared: boolean;
}

function propertyReference(entitySetName: string, propertyName: string): string {
    return `${entitySetName}\u0000${propertyName}`;
}

function commonKeyProperty(properties: ReadonlyArray<SchemaProperty>): SchemaProperty | undefined {
    const first = properties[0];
    if (!first || properties.some(({ primitiveType }) => primitiveType !== first.primitiveType)) {
        return undefined;
    }
    const constrainedEnums = properties.filter(({ enumValues }) => enumValues !== undefined);
    const enumValues =
        constrainedEnums.length === 0
            ? undefined
            : uniqueEnumValues(constrainedEnums[0]).filter((value) =>
                  properties.every((property) => propertyValueIsValid(property, value))
              );
    if (enumValues?.length === 0) {
        return undefined;
    }
    const maximumLengths = properties.flatMap(({ maxLength }) => (maxLength === undefined ? [] : [maxLength]));
    const numericMinimums = properties.flatMap(({ numericMinimum }) =>
        numericMinimum === undefined ? [] : [numericMinimum]
    );
    const numericMaximums = properties.flatMap(({ numericMaximum }) =>
        numericMaximum === undefined ? [] : [numericMaximum]
    );
    const numericMinimum = numericMinimums.length === 0 ? undefined : Math.max(...numericMinimums);
    const numericMaximum = numericMaximums.length === 0 ? undefined : Math.min(...numericMaximums);
    if (numericMinimum !== undefined && numericMaximum !== undefined && numericMinimum > numericMaximum) {
        return undefined;
    }
    const decimalScale =
        first.primitiveType === 'decimal' ? Math.min(...properties.map(({ scale }) => scale ?? 0)) : first.scale;
    const decimalPrecisionBounds =
        first.primitiveType === 'decimal'
            ? properties.flatMap(({ precision, scale }) =>
                  precision === undefined ? [] : [precision - ((scale ?? 0) - (decimalScale ?? 0))]
              )
            : [];
    const decimalPrecision =
        decimalPrecisionBounds.length === 0 ? first.precision : Math.min(...decimalPrecisionBounds);
    if (first.primitiveType === 'decimal' && decimalPrecision !== undefined && decimalPrecision < 1) {
        return undefined;
    }
    return {
        ...first,
        maxLength: maximumLengths.length === 0 ? undefined : Math.min(...maximumLengths),
        precision: decimalPrecision,
        scale: decimalScale,
        numericMinimum,
        numericMaximum,
        enumValues
    };
}

function relationshipSignature(relationship: SchemaRelationship): string {
    return `${relationship.fromEntitySet}->${relationship.toEntitySet}:${relationship.mappings
        .map(({ sourceProperty, targetProperty }) => `${sourceProperty}->${targetProperty}`)
        .sort()
        .join('|')}`;
}

const DRAFT_KEY_NAMES = new Set(['draftuuid', 'isactiveentity', 'hasactiveentity', 'hasdraftentity']);

/**
 * Orient navigation edges as child-to-parent dependencies for generation and validation.
 *
 * @param graph
 */
export function generationRelationships(graph: SchemaGraph): ReadonlyArray<SchemaRelationship> {
    const entities = new Map(graph.entities.map((entity) => [entity.entitySetName, entity]));
    const oriented = graph.relationships.map((relationship) => {
        if (relationship.provenance !== 'inferred') {
            return relationship;
        }
        const sourceKeys =
            entities
                .get(relationship.fromEntitySet)
                ?.properties.filter(({ isKey, name }) => isKey && !DRAFT_KEY_NAMES.has(name.toLowerCase()))
                .map(({ name }) => name) ?? [];
        const mappedSourceProperties = new Set(relationship.mappings.map(({ sourceProperty }) => sourceProperty));
        const usesCompleteSourceKey =
            sourceKeys.length > 0 &&
            sourceKeys.length === mappedSourceProperties.size &&
            sourceKeys.every((name) => mappedSourceProperties.has(name));
        if (!usesCompleteSourceKey) {
            return relationship;
        }
        return {
            ...relationship,
            fromEntitySet: relationship.toEntitySet,
            toEntitySet: relationship.fromEntitySet,
            mappings: relationship.mappings.map(({ sourceProperty, targetProperty }) => ({
                sourceProperty: targetProperty,
                targetProperty: sourceProperty
            }))
        };
    });
    const selected = new Map<string, SchemaRelationship>();
    for (const relationship of oriented) {
        const signature = relationshipSignature(relationship);
        const current = selected.get(signature);
        if (!current || (current.provenance === 'inferred' && relationship.provenance !== 'inferred')) {
            selected.set(signature, relationship);
        }
    }
    return Object.freeze([...selected.values()]);
}

function relationshipKeyProfiles(
    graph: SchemaGraph,
    connectDirectKeyMappings = false
): ReadonlyMap<string, KeyGenerationProfile> {
    const entities = new Map(graph.entities.map((entity) => [entity.entitySetName, entity]));
    const groupedTargets = new Map<string, Set<string>>();
    const directKeyMappings: Array<readonly [string, string]> = [];
    // Every foreign key receives the referenced key's values verbatim, so each key must be generated
    // inside the facets of all the properties that reference it.
    const referencingProperties = new Map<string, SchemaProperty[]>();
    for (const relationship of generationRelationships(graph)) {
        const sourceEntity = entities.get(relationship.fromEntitySet);
        const targetEntity = entities.get(relationship.toEntitySet);
        for (const { sourceProperty, targetProperty } of relationship.mappings) {
            if (!targetEntity?.properties.some(({ name, isKey }) => isKey && name === targetProperty)) {
                continue;
            }
            const source = propertyReference(relationship.fromEntitySet, sourceProperty);
            const target = propertyReference(relationship.toEntitySet, targetProperty);
            const referencing = sourceEntity?.properties.find(({ name }) => name === sourceProperty);
            if (referencing) {
                referencingProperties.set(target, [...(referencingProperties.get(target) ?? []), referencing]);
            }
            const targets = groupedTargets.get(source) ?? new Set<string>();
            targets.add(target);
            groupedTargets.set(source, targets);
            if (sourceEntity?.properties.some(({ name, isKey }) => isKey && name === sourceProperty)) {
                directKeyMappings.push([source, propertyReference(relationship.toEntitySet, targetProperty)]);
            }
        }
    }
    const parents = new Map<string, string>();
    const find = (reference: string): string => {
        const parent = parents.get(reference) ?? reference;
        if (parent === reference) {
            parents.set(reference, reference);
            return reference;
        }
        const root = find(parent);
        parents.set(reference, root);
        return root;
    };
    const union = (left: string, right: string): void => {
        const leftRoot = find(left);
        const rightRoot = find(right);
        if (leftRoot !== rightRoot) {
            parents.set(rightRoot, leftRoot < rightRoot ? leftRoot : rightRoot);
            parents.set(leftRoot, leftRoot < rightRoot ? leftRoot : rightRoot);
        }
    };
    for (const [source, targets] of groupedTargets) {
        const targetReferences = [...targets];
        if (targetReferences.length < 2) {
            continue;
        }
        targetReferences.forEach((reference) => union(source, reference));
    }
    if (connectDirectKeyMappings) {
        directKeyMappings.forEach(([source, target]) => union(source, target));
    }
    const components = new Map<string, string[]>();
    for (const reference of parents.keys()) {
        const root = find(reference);
        const component = components.get(root) ?? [];
        component.push(reference);
        components.set(root, component);
    }
    const profiles = new Map<string, KeyGenerationProfile>();
    const propertyAt = (reference: string): SchemaProperty | undefined => {
        const [entitySetName, propertyName] = reference.split('\u0000');
        return entities.get(entitySetName)?.properties.find(({ name }) => name === propertyName);
    };
    for (const references of components.values()) {
        if (references.length < 2) {
            continue;
        }
        const properties = references.flatMap((reference) => {
            const property = propertyAt(reference);
            return property ? [property] : [];
        });
        if (properties.length !== references.length) {
            continue;
        }
        const property = commonKeyProperty(properties);
        if (!property) {
            continue;
        }
        const sortedReferences = [...references].sort();
        const scope = `relationship:${createHash('sha256').update(sortedReferences.join('|')).digest('hex')}`;
        const referencing = sortedReferences.flatMap((reference) => referencingProperties.get(reference) ?? []);
        const narrowed = narrowedKeyProperty(property, referencing);
        sortedReferences.forEach((reference) => profiles.set(reference, { scope, property: narrowed, shared: true }));
    }
    for (const [reference, referencing] of referencingProperties) {
        const property = propertyAt(reference);
        if (profiles.has(reference) || !property) {
            continue;
        }
        const narrowed = narrowedKeyProperty(property, referencing);
        if (narrowed !== property) {
            const [entitySetName, propertyName] = reference.split('\u0000');
            // The scope stays the key's own, so only keys that must narrow change their values.
            profiles.set(reference, {
                scope: `entity:${entitySetName}:${propertyName}`,
                property: narrowed,
                shared: false
            });
        }
    }
    return profiles;
}

/**
 * Restrict a key's generation facets to those of the foreign keys that copy its values.
 *
 * @param property the key, or the shared profile of keys generated together
 * @param referencing the foreign-key properties whose values are drawn from the key
 * @returns the narrowed property, or the input itself when no referencing facet is tighter or the
 * facets share no value; relationship assignment then keeps incompatible values out of the foreign key
 */
function narrowedKeyProperty(property: SchemaProperty, referencing: ReadonlyArray<SchemaProperty>): SchemaProperty {
    if (referencing.length === 0) {
        return property;
    }
    const narrowed = commonKeyProperty([property, ...referencing]);
    if (
        !narrowed ||
        (narrowed.maxLength === property.maxLength &&
            narrowed.precision === property.precision &&
            narrowed.scale === property.scale &&
            narrowed.numericMinimum === property.numericMinimum &&
            narrowed.numericMaximum === property.numericMaximum &&
            JSON.stringify(narrowed.enumValues) === JSON.stringify(property.enumValues))
    ) {
        return property;
    }
    return narrowed;
}

function keyProfile(
    entity: SchemaEntity,
    property: SchemaProperty,
    profiles: ReadonlyMap<string, KeyGenerationProfile>
): KeyGenerationProfile {
    return (
        profiles.get(propertyReference(entity.entitySetName, property.name)) ?? {
            scope: `entity:${entity.entitySetName}:${property.name}`,
            property,
            shared: false
        }
    );
}

/**
 * The typed floor of a string: a label of the field (or its entity) with the row number, as long as it
 * fits the declared length, else a code of the field's initials. Codes and short columns always take
 * the code shape. Nothing here claims a meaning the field was not given.
 *
 * @param entity the entity
 * @param property the string property
 * @param rowIndex zero-based row
 * @param hash stable per-cell hash
 * @returns the value
 */
function stringValue(entity: SchemaEntity, property: SchemaProperty, rowIndex: number, hash: number): string {
    const evidence = `${property.name} ${property.label ?? ''}`.toLocaleLowerCase();
    const ordinal = rowIndex + 1;
    const fits = (value: string): boolean => property.maxLength === undefined || value.length <= property.maxLength;

    if (evidence.includes('code') || (property.maxLength !== undefined && property.maxLength <= 4)) {
        return codeShaped(property.name, evidence.includes('code') ? (hash % 999) + 1 : ordinal, property.maxLength);
    }
    let labels: string[];
    if (evidence.includes('name')) {
        labels = [`${humanize(entity.name)} ${ordinal}`];
    } else if (evidence.includes('description')) {
        labels = [`${humanize(entity.name)} description ${ordinal}`, `Description ${ordinal}`];
    } else {
        const words = humanize(property.name).split(' ');
        labels = [`${words.join(' ')} ${ordinal}`, `${words.at(-1) ?? 'Value'} ${ordinal}`];
    }
    return labels.find(fits) ?? codeShaped(property.name, ordinal, property.maxLength);
}

/**
 * One generated value together with the tier that produced it.
 *
 * @param entity the entity the value belongs to
 * @param property the property being filled
 * @param rowIndex the zero-based row
 * @param seed the generation seed
 * @param role the routed semantic role, when one was accepted
 * @param rowContext the coherent per-row context shared by the value banks
 * @param semanticKeys whether recognised roles may supply key values
 * @param keyOrdinal the planned ordinal for a key property
 * @param generationProfile the key profile shared across a relationship
 * @returns the value and the tier that wrote it
 */
function sourcedValueFor(
    entity: SchemaEntity,
    property: SchemaProperty,
    rowIndex: number,
    seed: number,
    role: string | undefined,
    rowContext: SemanticRowContext,
    semanticKeys: boolean,
    keyOrdinal?: number,
    generationProfile?: KeyGenerationProfile
): { value: JsonValue; tier: ValueTier } {
    const hash = stableNumber(`${seed}:${entity.entitySetName}:${property.name}:${rowIndex}`);
    if (property.isKey && keyOrdinal !== undefined) {
        const profile = generationProfile ?? keyProfile(entity, property, new Map());
        if (semanticKeys && !property.enumValues) {
            const semanticKeyOrdinal = stableNumber(`${seed}:${profile.scope}`) + keyOrdinal;
            const semanticKeyContext = semanticRowContext(
                semanticKeyOrdinal,
                rowContext.dataset,
                rowContext.ibanCountry
            );
            const semanticKeyHash = stableNumber(`${seed}:${profile.scope}:${role ?? property.name}`) + keyOrdinal;
            const semanticKey = semanticValue(role, property, semanticKeyContext, semanticKeyHash, keyOrdinal);
            // The profile carries the facets of every property that shares or copies this key.
            if (
                semanticKey !== undefined &&
                propertyValueIsValid(property, semanticKey) &&
                propertyValueIsValid(profile.property, semanticKey)
            ) {
                return { value: semanticKey, tier: VALUE_TIER.recognised };
            }
        }
        return { value: keyValue(profile.property, keyOrdinal, seed, profile.scope), tier: VALUE_TIER.typed };
    }
    if (property.enumValues && property.enumValues.length > 0) {
        return {
            value: property.enumValues[rowIndex % property.enumValues.length],
            tier: VALUE_TIER.declared
        };
    }
    const governedValue = semanticValue(role, property, rowContext, hash, rowIndex);
    if (governedValue !== undefined && propertyValueIsValid(property, governedValue)) {
        return { value: governedValue, tier: VALUE_TIER.recognised };
    }
    // A boolean's type enumerates its whole domain, as a declared enumeration does, so its value is
    // drawn from what the schema declares rather than from the typed floor.
    if (property.primitiveType === 'bool') {
        return { value: typedValue(entity, property, rowIndex, seed, hash), tier: VALUE_TIER.declared };
    }
    return { value: typedValue(entity, property, rowIndex, seed, hash), tier: VALUE_TIER.typed };
}

/**
 * The typed floor: a value that respects the declared shape of the property and never declines.
 *
 * @param entity the entity the value belongs to
 * @param property the property being filled
 * @param rowIndex the zero-based row
 * @param seed the generation seed
 * @param hash the stable per-cell hash
 * @returns a value of the property's primitive type
 */
function typedValue(
    entity: SchemaEntity,
    property: SchemaProperty,
    rowIndex: number,
    seed: number,
    hash: number
): JsonValue {
    switch (property.primitiveType) {
        case 'int': {
            const range = integerRange(property, 0, 9_999);
            return range.minimum + (hash % (range.maximum - range.minimum + 1));
        }
        case 'decimal': {
            // Sized by the facets but kept to at most four integer digits and four fraction digits, so
            // an undeclared or wide decimal reads as an ordinary quantity rather than a 13-digit figure.
            const precision = Math.min(property.precision ?? 8, 15);
            const scale = Math.min(property.scale ?? 2, precision, 4);
            const integerDigits = Math.min(Math.max(0, precision - Math.min(property.scale ?? 2, precision)), 4);
            const maximumScaled = Math.min(Number.MAX_SAFE_INTEGER, 10 ** (integerDigits + scale) - 1);
            return Number(((hash % (maximumScaled + 1)) / 10 ** scale).toFixed(scale));
        }
        case 'bool':
            return hash % 2 === 0;
        case 'guid': {
            const value = createHash('sha256')
                .update(`${seed}:${entity.entitySetName}:${property.name}:${rowIndex}`)
                .digest('hex');
            return `${value.slice(0, 8)}-${value.slice(8, 12)}-4${value.slice(13, 16)}-a${value.slice(
                17,
                20
            )}-${value.slice(20, 32)}`;
        }
        case 'date':
            return new Date(Date.UTC(2020 + (hash % 6), hash % 12, (hash % 27) + 1)).toISOString().slice(0, 10);
        case 'datetime':
        case 'datetimeoffset':
            return new Date(Date.UTC(2020 + (hash % 6), hash % 12, (hash % 27) + 1, hash % 24)).toISOString();
        case 'time':
            return `${String(hash % 24).padStart(2, '0')}:${String(hash % 60).padStart(2, '0')}:00`;
        case 'binary': {
            // MaxLength bounds the encoded text, and base64 emits four characters per three bytes.
            const bytes = Buffer.from(`${entity.name}:${rowIndex + 1}`);
            const allowedBytes =
                property.maxLength === undefined ? bytes.length : Math.floor(property.maxLength / 4) * 3;
            return bytes.subarray(0, allowedBytes).toString('base64');
        }
        case 'string':
            return stringValue(entity, property, rowIndex, hash);
        default:
            throw new TypeError('Unsupported primitive property type');
    }
}

function finiteKeyCardinality(property: SchemaProperty): number | undefined {
    if (property.enumValues) {
        return uniqueEnumValues(property).length;
    }
    if (property.primitiveType === 'bool') {
        return 2;
    }
    if (
        property.primitiveType === 'int' &&
        property.numericMinimum !== undefined &&
        property.numericMaximum !== undefined
    ) {
        const range = integerRange(property, 1, property.numericMaximum);
        return Math.min(1_001, range.maximum - range.minimum + 1);
    }
    if (property.primitiveType === 'string' && property.maxLength !== undefined) {
        if (property.maxLength === 0) {
            return 0;
        }
        return governedStringKeyDomain(property)?.cardinality ?? cappedPower(36, property.maxLength);
    }
    if (property.primitiveType === 'string') {
        return governedStringKeyDomain(property)?.cardinality;
    }
    if (property.primitiveType === 'decimal' && property.precision !== undefined) {
        return property.precision >= 4 ? 1_001 : 10 ** property.precision;
    }
    if (property.primitiveType === 'time') {
        return 1_001;
    }
    if (property.primitiveType === 'binary' && property.maxLength !== undefined) {
        if (property.maxLength === 0) {
            return 0;
        }
        return property.maxLength < 4 ? 1 : 1_001;
    }
    return undefined;
}

function keyPlan(
    entity: SchemaEntity,
    requestedRows: number,
    profiles: ReadonlyMap<string, KeyGenerationProfile>,
    classifications: ReadonlyMap<string, SemanticClassification>,
    semanticKeys: boolean
): { rowCount: number; ordinals: ReadonlyMap<string, (rowIndex: number) => number> } {
    const keys = entity.properties
        .map((property, index) => ({ property, index, profile: keyProfile(entity, property, profiles) }))
        .filter(({ property }) => property.isKey)
        .sort((left, right) => {
            if (left.profile.shared !== right.profile.shared) {
                return left.profile.shared ? -1 : 1;
            }
            return left.profile.shared
                ? Number(!left.property.name.toLowerCase().includes('serial')) -
                      Number(!right.property.name.toLowerCase().includes('serial')) ||
                      left.profile.scope.localeCompare(right.profile.scope)
                : left.index - right.index;
        });
    const cardinalities = keys.map(({ property, profile }) => ({
        property,
        cardinality:
            (semanticKeys && !profile.property.enumValues
                ? semanticRoleKeyCardinality(
                      routedRole(classifications.get(semanticPropertyKey(entity.entitySetName, property.name))),
                      property
                  )
                : undefined) ?? finiteKeyCardinality(profile.property)
    }));
    const everyKeyFinite =
        cardinalities.length > 0 && cardinalities.every(({ cardinality }) => cardinality !== undefined);
    const capacity = everyKeyFinite
        ? cardinalities.reduce((product, { cardinality }) => Math.min(1_001, product * (cardinality as number)), 1)
        : requestedRows;
    let stride = 1;
    const ordinals = new Map<string, (rowIndex: number) => number>();
    for (const { property, cardinality } of cardinalities) {
        if (cardinality !== undefined && cardinality > 0) {
            const currentStride = stride;
            // A triangular mixed-radix permutation spreads small samples across all
            // dimensions. The lower digits determine the offset, so each original
            // digit can be recovered in order and complete tuple uniqueness is retained.
            ordinals.set(
                property.name,
                (rowIndex) => (Math.floor(rowIndex / currentStride) + (rowIndex % currentStride)) % cardinality
            );
            stride *= cardinality;
        } else if (cardinality === undefined) {
            ordinals.set(property.name, (rowIndex) => rowIndex);
        }
    }
    return { rowCount: Math.min(requestedRows, capacity), ordinals };
}

/** Slot counts per writing tier, keyed by entity set and then property. */
export type ValueTierTally = Map<string, Map<string, Map<ValueTier, number>>>;

export interface DeterministicGenerationResult {
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>;
    diagnostics: ReadonlyArray<MockDataGeneratorDiagnostic>;
    valueTiers: ValueTierTally;
}

/**
 * Records one generated cell against the tier that wrote it.
 *
 * @param tally the running tally
 * @param resourceName the entity set the cell belongs to
 * @param propertyName the property the cell belongs to
 * @param tier the tier that produced the value
 */
export function recordValueTier(
    tally: ValueTierTally,
    resourceName: string,
    propertyName: string,
    tier: ValueTier
): void {
    const properties = tally.get(resourceName) ?? new Map<string, Map<ValueTier, number>>();
    const tiers = properties.get(propertyName) ?? new Map<ValueTier, number>();
    tiers.set(tier, (tiers.get(tier) ?? 0) + 1);
    properties.set(propertyName, tiers);
    tally.set(resourceName, properties);
}

/**
 * Reassigns every recorded cell of one property to a different tier, for the passes that rewrite
 * values after the first generation sweep.
 *
 * @param tally the running tally
 * @param resourceName the entity set the property belongs to
 * @param propertyName the property whose cells were rewritten
 * @param tier the tier that rewrote them
 */
export function retagValueTier(
    tally: ValueTierTally,
    resourceName: string,
    propertyName: string,
    tier: ValueTier
): void {
    const tiers = tally.get(resourceName)?.get(propertyName);
    if (!tiers) {
        return;
    }
    const slots = [...tiers.values()].reduce((sum, count) => sum + count, 0);
    tiers.clear();
    if (slots > 0) {
        tiers.set(tier, slots);
    }
}

function authoritativeTargetRows(
    graph: SchemaGraph,
    relationship: SchemaGraph['relationships'][number],
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    existingData: Readonly<Record<string, ExistingMockData>>
): ReadonlyArray<MockDataRow> | undefined {
    const initialRows = existingData[relationship.toEntitySet]?.initialRows;
    const supplied =
        initialRows?.present === true &&
        (initialRows.source === 'json' || (initialRows.source === 'contributor' && initialRows.enumerable));
    return supplied
        ? publishedRows(graph, relationship.toEntitySet, resources, existingData)
        : resources[relationship.toEntitySet];
}

function relationshipAssignmentCandidates(
    relationship: SchemaGraph['relationships'][number],
    targetRows: ReadonlyArray<MockDataRow> | undefined,
    sourceEntity: SchemaEntity | undefined
): ReadonlyArray<Readonly<Record<string, JsonValue>>> {
    if (!targetRows || targetRows.length === 0) {
        const properties = new Map(sourceEntity?.properties.map((property) => [property.name, property]));
        return relationship.mappings.every(({ sourceProperty }) => properties.get(sourceProperty)?.nullable === true)
            ? [
                  Object.freeze(
                      Object.fromEntries(relationship.mappings.map(({ sourceProperty }) => [sourceProperty, null]))
                  )
              ]
            : [];
    }
    const sourceProperties = new Map(sourceEntity?.properties.map((property) => [property.name, property]));
    // A parent value that violates the foreign key's own facets (a longer code, another type) can
    // never be copied into it; such parents are not candidates for this row.
    const candidates = targetRows.flatMap((targetRow) => {
        const entries = relationship.mappings.map(
            ({ sourceProperty, targetProperty }) => [sourceProperty, targetRow[targetProperty]] as const
        );
        return entries.some(([sourceProperty, value]) => {
            const property = sourceProperties.get(sourceProperty);
            return value === undefined || (property !== undefined && !propertyValueIsValid(property, value));
        })
            ? []
            : [Object.freeze(Object.fromEntries(entries))];
    });
    return candidates.length === 0 ? relationshipAssignmentCandidates(relationship, [], sourceEntity) : candidates;
}

function sameJsonValue(left: JsonValue, right: JsonValue): boolean {
    return Object.is(left, right) || JSON.stringify(left) === JSON.stringify(right);
}

interface IndexedRelationshipDomain {
    candidates: ReadonlyArray<Readonly<Record<string, JsonValue>>>;
    propertyNames: ReadonlyArray<string>;
    indexes: Map<string, ReadonlyMap<string, ReadonlyArray<Readonly<Record<string, JsonValue>>>>>;
}

interface RelationshipSearchBudget {
    steps: number;
    exhausted: boolean;
}

const MAX_RELATIONSHIP_SEARCH_STEPS = 2_000_000;

function valueSignature(value: JsonValue): string {
    return `${typeof value}:${JSON.stringify(value)}`;
}

function assignmentSignature(
    assignment: Readonly<Record<string, JsonValue>>,
    propertyNames: ReadonlyArray<string>
): string {
    return propertyNames.map((name) => `${name}=${valueSignature(assignment[name])}`).join('|');
}

function compareText(left: string, right: string): number {
    if (left < right) {
        return -1;
    }
    if (left > right) {
        return 1;
    }
    return 0;
}

function domainSignature(domain: IndexedRelationshipDomain): string {
    return `${domain.propertyNames.join('\u0000')}\u0001${domain.candidates
        .map((candidate) => assignmentSignature(candidate, domain.propertyNames))
        .join('\u0002')}`;
}

function compareDomains(left: IndexedRelationshipDomain, right: IndexedRelationshipDomain): number {
    return compareText(domainSignature(left), domainSignature(right));
}

function indexedRelationshipDomain(
    candidates: ReadonlyArray<Readonly<Record<string, JsonValue>>>
): IndexedRelationshipDomain {
    const propertyNames = Object.keys(candidates[0] ?? {}).sort(compareText);
    return {
        candidates: [...candidates].sort((left, right) =>
            compareText(assignmentSignature(left, propertyNames), assignmentSignature(right, propertyNames))
        ),
        propertyNames,
        indexes: new Map()
    };
}

function domainsOverlap(left: IndexedRelationshipDomain, right: IndexedRelationshipDomain): boolean {
    return left.propertyNames.some((name) => right.propertyNames.includes(name));
}

function connectedDomainComponents(
    domains: ReadonlyArray<IndexedRelationshipDomain>
): ReadonlyArray<ReadonlyArray<IndexedRelationshipDomain>> {
    const remaining = new Set([...domains].sort(compareDomains));
    const components: IndexedRelationshipDomain[][] = [];
    while (remaining.size > 0) {
        const first = remaining.values().next().value as IndexedRelationshipDomain;
        remaining.delete(first);
        const component = [first];
        for (let index = 0; index < component.length; index += 1) {
            const current = component[index];
            for (const candidate of [...remaining]) {
                if (domainsOverlap(current, candidate)) {
                    remaining.delete(candidate);
                    component.push(candidate);
                }
            }
        }
        components.push(component);
    }
    return components.sort((left, right) => compareDomains(left[0], right[0]));
}

function orderConnectedDomains(domains: ReadonlyArray<IndexedRelationshipDomain>): IndexedRelationshipDomain[] {
    const remaining = [...domains];
    remaining.sort((left, right) => {
        const leftDegree = domains.filter((candidate) => candidate !== left && domainsOverlap(left, candidate)).length;
        const rightDegree = domains.filter(
            (candidate) => candidate !== right && domainsOverlap(right, candidate)
        ).length;
        return (
            rightDegree - leftDegree || left.candidates.length - right.candidates.length || compareDomains(left, right)
        );
    });
    const ordered = [remaining.shift() as IndexedRelationshipDomain];
    const assignedNames = new Set(ordered[0].propertyNames);
    while (remaining.length > 0) {
        remaining.sort((left, right) => {
            const leftOverlap = left.propertyNames.filter((name) => assignedNames.has(name)).length;
            const rightOverlap = right.propertyNames.filter((name) => assignedNames.has(name)).length;
            return (
                rightOverlap - leftOverlap ||
                left.candidates.length - right.candidates.length ||
                compareDomains(left, right)
            );
        });
        const next = remaining.shift() as IndexedRelationshipDomain;
        next.propertyNames.forEach((name) => assignedNames.add(name));
        ordered.push(next);
    }
    return ordered;
}

function compatibleDomainCandidates(
    domain: IndexedRelationshipDomain,
    assignment: Readonly<Record<string, JsonValue>>,
    budget: RelationshipSearchBudget
): ReadonlyArray<Readonly<Record<string, JsonValue>>> {
    const sharedNames = domain.propertyNames.filter((name) => Object.prototype.hasOwnProperty.call(assignment, name));
    if (sharedNames.length === 0) {
        return domain.candidates;
    }
    const indexKey = sharedNames.join('\u0000');
    let index = domain.indexes.get(indexKey);
    if (!index) {
        const mutable = new Map<string, Array<Readonly<Record<string, JsonValue>>>>();
        for (const candidate of domain.candidates) {
            budget.steps += 1;
            if (budget.steps > MAX_RELATIONSHIP_SEARCH_STEPS) {
                budget.exhausted = true;
                return [];
            }
            const signature = assignmentSignature(candidate, sharedNames);
            const matches = mutable.get(signature) ?? [];
            matches.push(candidate);
            mutable.set(signature, matches);
        }
        index = new Map([...mutable].map(([signature, matches]) => [signature, Object.freeze(matches)]));
        domain.indexes.set(indexKey, index);
    }
    return index.get(assignmentSignature(assignment, sharedNames)) ?? [];
}

function findCompatibleRelationshipAssignment(
    domains: ReadonlyArray<IndexedRelationshipDomain>,
    rowIndex: number,
    budget: RelationshipSearchBudget,
    accept: (assignment: Readonly<Record<string, JsonValue>>) => boolean
): Readonly<Record<string, JsonValue>> | undefined {
    const ordered = connectedDomainComponents(domains).flatMap((component) => orderConnectedDomains(component));
    const assignment: Record<string, JsonValue> = {};
    const visit = (domainIndex: number): boolean => {
        if (domainIndex === ordered.length) {
            return accept(assignment);
        }
        const candidates = compatibleDomainCandidates(ordered[domainIndex], assignment, budget);
        for (let offset = 0; offset < candidates.length && !budget.exhausted; offset += 1) {
            budget.steps += 1;
            if (budget.steps > MAX_RELATIONSHIP_SEARCH_STEPS) {
                budget.exhausted = true;
                return false;
            }
            const candidate = candidates[(rowIndex + offset) % candidates.length];
            const entries = Object.entries(candidate);
            const added = entries.filter(([name]) => !Object.prototype.hasOwnProperty.call(assignment, name));
            entries.forEach(([name, value]) => (assignment[name] = value));
            if (visit(domainIndex + 1)) {
                return true;
            }
            added.forEach(([name]) => delete assignment[name]);
        }
        return false;
    };
    return visit(0) ? Object.freeze({ ...assignment }) : undefined;
}

/**
 * Validate every generated relationship against the final authoritative parent domains.
 *
 * @param graph
 * @param resources
 * @param existingData
 */
export function assertRelationshipIntegrity(
    graph: SchemaGraph,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    existingData: Readonly<Record<string, ExistingMockData>> = {}
): void {
    const failure = relationshipIntegrityFailures(graph, resources, existingData).find(({ supplied }) => !supplied);
    if (failure) {
        throw new TypeError(
            `Generated relationship ${failure.relationship.fromEntitySet}.${failure.relationship.name}->${failure.relationship.toEntitySet} is not referentially valid ` +
                `(sourceRows=${resources[failure.relationship.fromEntitySet]?.length ?? 0}, targetRows=${failure.targetRows})`
        );
    }
}

/**
 * Every source row whose relationship values resolve to no target row. A reference the caller
 * supplied is published as written, so it is reported as `supplied` rather than treated as a
 * generation failure; every generated reference must resolve.
 *
 * @param graph - Service schema.
 * @param resources - Final rows by entity set.
 * @param existingData - Rows the caller supplied, by entity set.
 * @returns The unresolved references, in relationship and row order.
 */
export function relationshipIntegrityFailures(
    graph: SchemaGraph,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    existingData: Readonly<Record<string, ExistingMockData>> = {}
): ReadonlyArray<{ relationship: SchemaRelationship; rowIndex: number; supplied: boolean; targetRows: number }> {
    const failures: Array<{
        relationship: SchemaRelationship;
        rowIndex: number;
        supplied: boolean;
        targetRows: number;
    }> = [];
    for (const relationship of generationRelationships(graph)) {
        const targetRows = authoritativeTargetRows(graph, relationship, resources, existingData) ?? [];
        const suppliedRows = authoredRows(existingData[relationship.fromEntitySet]);
        for (const [rowIndex, sourceRow] of (resources[relationship.fromEntitySet] ?? []).entries()) {
            const sourceValues = relationship.mappings.map(({ sourceProperty }) => sourceRow[sourceProperty]);
            if (sourceValues.every((value) => value === null)) {
                continue;
            }
            const resolved = targetRows.some((targetRow) =>
                relationship.mappings.every(({ sourceProperty, targetProperty }) =>
                    sameJsonValue(sourceRow[sourceProperty], targetRow[targetProperty])
                )
            );
            if (!resolved) {
                const supplied =
                    rowIndex < suppliedRows.length &&
                    relationship.mappings.every(
                        ({ sourceProperty }) =>
                            Object.hasOwn(suppliedRows[rowIndex], sourceProperty) &&
                            sameJsonValue(suppliedRows[rowIndex][sourceProperty], sourceRow[sourceProperty])
                    );
                failures.push({ relationship, rowIndex, supplied, targetRows: targetRows.length });
            }
        }
    }
    return failures;
}

function rowCount(target: MockDataTarget, entity: SchemaEntity, options: MockDataGeneratorOptions): number {
    if (target.kind === 'singleton') {
        return 1;
    }
    if (typeof options.rowsPerEntity === 'number') {
        return options.rowsPerEntity;
    }
    return options.rowsPerEntity?.[target.name] ?? options.rowsPerEntity?.[entity.name] ?? 5;
}

/**
 * Check a complete key tuple only when the schema declares key properties.
 *
 * @param row - Generated row.
 * @param keys - Declared key properties.
 * @param seenKeys - Key tuples already emitted for the resource.
 * @param resourceName - Resource name for diagnostics.
 */
function assertUniqueKeyTuple(
    row: Readonly<Record<string, JsonValue>>,
    keys: ReadonlyArray<SchemaProperty>,
    seenKeys: Set<string>,
    resourceName: string
): void {
    if (keys.length === 0) {
        return;
    }
    const signature = JSON.stringify(keys.map(({ name }) => row[name]));
    if (seenKeys.has(signature)) {
        throw new TypeError(`Deterministic generation produced a duplicate key for ${resourceName}`);
    }
    seenKeys.add(signature);
}

export function generateDeterministicResources(
    graph: SchemaGraph,
    targets: ReadonlyArray<MockDataTarget>,
    options: MockDataGeneratorOptions,
    classifications: ReadonlyMap<string, SemanticClassification> = new Map(),
    existingData: Readonly<Record<string, ExistingMockData>> = {},
    conceptBank?: (id: string) => ConceptBank | undefined
): DeterministicGenerationResult {
    const entities = new Map(graph.entities.map((entity) => [entity.entitySetName, entity]));
    const generationProfiles = relationshipKeyProfiles(graph, options.pipeline === 'semantic-v2');
    const resources: Record<string, Array<Record<string, JsonValue>>> = {};
    const diagnostics: MockDataGeneratorDiagnostic[] = [];
    const valueTiers: ValueTierTally = new Map();
    for (const target of targets) {
        const entity = entities.get(target.name);
        if (!entity) {
            continue;
        }
        const requestedRows = rowCount(target, entity, options);
        const plannedKeys = keyPlan(
            entity,
            requestedRows,
            generationProfiles,
            classifications,
            options.pipeline === 'semantic-v2'
        );
        if (plannedKeys.rowCount < requestedRows) {
            diagnostics.push(
                Object.freeze({
                    code: 'ROW_COUNT_REDUCED_UNSATISFIABLE_KEY_DOMAIN',
                    severity: 'warning',
                    message: `Requested ${requestedRows} rows but the declared key domain supports ${plannedKeys.rowCount}.`,
                    target: target.name
                })
            );
        }
        const reconciledProperties = new Set<string>();
        const rows = Array.from({ length: plannedKeys.rowCount }, (_unused, rowIndex) => {
            const seed = options.seed ?? 1;
            const rowContext = semanticRowContext(
                stableNumber(`${seed}:${entity.entitySetName}:${rowIndex}`),
                options.sampleDataset,
                options.syntheticScenario?.ibanCountry
            );
            return Object.fromEntries(
                entity.properties.map((property) => {
                    const decision = classifications.get(semanticPropertyKey(entity.entitySetName, property.name));
                    const bank =
                        decision?.source === 'concept' && decision.concept
                            ? conceptBank?.(decision.concept.id)
                            : undefined;
                    const fromConcept = bank ? conceptValue(bank, entity, property, rowIndex, seed) : undefined;
                    if (fromConcept !== undefined && propertyValueIsValid(property, fromConcept)) {
                        recordValueTier(valueTiers, target.name, property.name, VALUE_TIER.recognised);
                        return [property.name, fromConcept];
                    }
                    const sourced = sourcedValueFor(
                        entity,
                        property,
                        rowIndex,
                        seed,
                        routedRole(classifications.get(semanticPropertyKey(entity.entitySetName, property.name))),
                        rowContext,
                        options.pipeline === 'semantic-v2',
                        plannedKeys.ordinals.get(property.name)?.(rowIndex),
                        property.isKey ? keyProfile(entity, property, generationProfiles) : undefined
                    );
                    recordValueTier(valueTiers, target.name, property.name, sourced.tier);
                    return [property.name, sourced.value];
                })
            );
        });
        const coherentRows = applySemanticCoherence(
            entity,
            rows,
            options.seed ?? 1,
            new Set(
                entity.properties
                    .filter(
                        (property) =>
                            options.pipeline === 'semantic-v2' && (property.isKey || property.enumValues?.length)
                    )
                    .map(({ name }) => name)
            ),
            inferredCoherenceRules(
                target.name,
                options.syntheticScenario?.coherence?.[target.name],
                options.syntheticScenario?.temporalConstraints
            ),
            reconciledProperties
        ).map((row) => ({ ...row }));
        // A coherence rule that supplies a matching code and its text is producing recognised
        // values, not the typed placeholder the first sweep wrote.
        for (const propertyName of reconciledProperties) {
            retagValueTier(valueTiers, target.name, propertyName, VALUE_TIER.recognised);
        }
        const keys = entity.properties.filter(({ isKey }) => isKey);
        const seenKeys = new Set<string>();
        resources[target.name] =
            keys.length === 0
                ? coherentRows
                : coherentRows.filter((row) => {
                      const signature = JSON.stringify(keys.map(({ name }) => row[name]));
                      if (seenKeys.has(signature)) {
                          return false;
                      }
                      seenKeys.add(signature);
                      return true;
                  });
        if (resources[target.name].length < coherentRows.length) {
            diagnostics.push(
                Object.freeze({
                    code: 'ROW_COUNT_REDUCED_UNSATISFIABLE_KEY_DOMAIN',
                    severity: 'warning',
                    message: `The routed value provider emitted only ${resources[target.name].length} distinct key tuples for ${coherentRows.length} planned rows.`,
                    target: target.name
                })
            );
        }
    }
    const baseResources = Object.fromEntries(
        Object.entries(resources).map(([name, rows]) => [name, rows.map((row) => ({ ...row }))])
    );
    const relationshipsBySource = new Map<string, SchemaGraph['relationships'][number][]>();
    generationRelationships(graph).forEach((relationship) => {
        const relationships = relationshipsBySource.get(relationship.fromEntitySet) ?? [];
        relationships.push(relationship);
        relationshipsBySource.set(relationship.fromEntitySet, relationships);
    });
    const diagnosticKeys = new Set(diagnostics.map(({ code, target }) => `${code}:${target ?? ''}`));
    const addDiagnostic = (diagnostic: MockDataGeneratorDiagnostic): void => {
        const key = `${diagnostic.code}:${diagnostic.target ?? ''}`;
        if (!diagnosticKeys.has(key)) {
            diagnosticKeys.add(key);
            diagnostics.push(Object.freeze(diagnostic));
        }
    };
    const sourceNames = [...relationshipsBySource.keys()].sort();
    const maximumPasses = Math.max(1, sourceNames.length + 1);
    for (let pass = 0; pass < maximumPasses; pass += 1) {
        let changed = false;
        for (const sourceName of sourceNames) {
            const relationships = relationshipsBySource.get(sourceName) ?? [];
            const sourceRows = resources[sourceName] ?? [];
            const sourceEntity = entities.get(sourceName);
            if (!sourceEntity || sourceRows.length === 0) {
                continue;
            }
            const domains = relationships.map((relationship) =>
                indexedRelationshipDomain(
                    relationshipAssignmentCandidates(
                        relationship,
                        authoritativeTargetRows(graph, relationship, resources, existingData),
                        sourceEntity
                    )
                )
            );
            const budget: RelationshipSearchBudget = { steps: 0, exhausted: false };
            const keys = sourceEntity.properties.filter(({ isKey }) => isKey);
            const seenKeys = new Set<string>();
            const sourceBaseRows = (baseResources[sourceName] ?? []).slice(0, sourceRows.length);
            const resolvedRows = sourceBaseRows.flatMap((baseRow, rowIndex) => {
                const assignment = findCompatibleRelationshipAssignment(domains, rowIndex, budget, (candidate) => {
                    const candidateRow = { ...baseRow, ...candidate };
                    const candidateSignature = JSON.stringify(keys.map(({ name }) => candidateRow[name]));
                    return !seenKeys.has(candidateSignature);
                });
                if (!assignment) {
                    return [];
                }
                const row = { ...baseRow, ...assignment };
                const signature = JSON.stringify(keys.map(({ name: keyName }) => row[keyName]));
                if (seenKeys.has(signature)) {
                    return [];
                }
                seenKeys.add(signature);
                return [row];
            });
            if (budget.exhausted) {
                addDiagnostic({
                    code: 'ROW_COUNT_REDUCED_RELATIONSHIP_SEARCH_LIMIT',
                    severity: 'warning',
                    message: `Relationship planning reached its bounded search limit and retained ${resolvedRows.length} rows.`,
                    target: sourceName
                });
            }
            if (resolvedRows.length < sourceRows.length) {
                const missingReferenceDomain = domains.some(({ candidates }) => candidates.length === 0);
                addDiagnostic({
                    code: missingReferenceDomain
                        ? 'ROW_COUNT_REDUCED_UNSATISFIABLE_REFERENCE_DOMAIN'
                        : 'ROW_COUNT_REDUCED_UNSATISFIABLE_RELATIONSHIP_CONSTRAINTS',
                    severity: 'warning',
                    message: missingReferenceDomain
                        ? `A required parent domain is empty; retained ${resolvedRows.length} of ${sourceRows.length} rows.`
                        : `Relationship and key constraints retained ${resolvedRows.length} of ${sourceRows.length} rows.`,
                    target: sourceName
                });
            }
            if (JSON.stringify(resolvedRows) !== JSON.stringify(sourceRows)) {
                resources[sourceName] = resolvedRows;
                changed = true;
            }
        }
        if (!changed) {
            break;
        }
    }
    for (const [resourceName, rows] of Object.entries(resources)) {
        const entity = entities.get(resourceName);
        if (!entity) {
            continue;
        }
        const relationshipProperties = new Set(
            (relationshipsBySource.get(resourceName) ?? []).flatMap((relationship) =>
                relationship.mappings.map(({ sourceProperty }) => sourceProperty)
            )
        );
        entity.properties
            .filter((property) => options.pipeline === 'semantic-v2' && (property.isKey || property.enumValues?.length))
            .forEach(({ name }) => relationshipProperties.add(name));
        resources[resourceName] = applySemanticCoherence(
            entity,
            rows,
            options.seed ?? 1,
            relationshipProperties,
            inferredCoherenceRules(
                resourceName,
                options.syntheticScenario?.coherence?.[resourceName],
                options.syntheticScenario?.temporalConstraints
            )
        ).map((row) => ({ ...row }));
    }
    const frozenResources = Object.freeze(
        Object.fromEntries(
            Object.entries(resources).map(([name, rows]) => {
                const entity = entities.get(name);
                if (entity) {
                    const keys = entity.properties.filter(({ isKey }) => isKey);
                    const seenKeys = new Set<string>();
                    for (const row of rows) {
                        for (const property of entity.properties) {
                            if (!propertyValueIsValid(property, row[property.name])) {
                                throw new TypeError(`Deterministic value violates ${name}.${property.name}`);
                            }
                        }
                        assertUniqueKeyTuple(row, keys, seenKeys, name);
                    }
                }
                return [name, Object.freeze(rows.map((row) => Object.freeze(row)))];
            })
        )
    );
    // Foreign keys are decided by relational assignment against the rows that were actually
    // generated, so their cells belong to no tier's value bank.
    for (const relationship of generationRelationships(graph)) {
        for (const { sourceProperty } of relationship.mappings) {
            retagValueTier(valueTiers, relationship.fromEntitySet, sourceProperty, VALUE_TIER.structural);
        }
    }
    assertRelationshipIntegrity(graph, frozenResources, existingData);
    return Object.freeze({
        resources: frozenResources,
        diagnostics: Object.freeze(diagnostics),
        valueTiers
    });
}

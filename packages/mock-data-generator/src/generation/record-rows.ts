import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../schema/graph.js';
import { semanticPropertyKey } from '../semantics/classifier.js';
import { semanticRules } from '../semantics/rule-store.js';
import type { ExistingMockData, JsonValue, MockDataRow } from '../types.js';
import { generatedRowFlags } from './authored.js';
import { displayName } from './code-list-metadata.js';
import { currencyFractionDigits } from './coherence.js';
import { propertyValueIsValid } from './constraints.js';
import { protectedPropertyNames } from './rows.js';
import { valueInFieldForm } from './facet-form.js';

/** The role whose value counts the minor-unit digits of a currency. */
const DECIMAL_PLACES_ROLE = 'decimal_places';

/** What aligning record rows reads. */
export interface RecordRowAlignment {
    graph: SchemaGraph;
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>;
    existingData: Readonly<Record<string, ExistingMockData>>;
    /** Planned roles by `EntitySet.Property`. */
    plannedRoles: Readonly<Record<string, string>>;
    /** Properties another step fixed, by entity set: never written. */
    fixedProperties?: ReadonlyMap<string, ReadonlySet<string>>;
    /** Display locale of record names; English by default. */
    locale?: string;
}

/**
 * The single key of an entity when it is a code of a record the rule store names (a country, a currency): the
 * entity's rows are then records of that kind, one per code.
 *
 * @param entity the entity
 * @param roleOf planned role of a property
 * @returns the key and its role, or undefined
 */
function recordKey(
    entity: SchemaEntity,
    roleOf: (property: SchemaProperty) => string | undefined
): { key: SchemaProperty; role: string; source: 'region' | 'currency' } | undefined {
    const keys = entity.properties.filter(({ isKey }) => isKey);
    const key = keys.length === 1 ? keys[0] : undefined;
    const role = key ? roleOf(key) : undefined;
    const source = role === undefined ? undefined : semanticRules().codeTexts.recordNames.get(role);
    return key && role && (source === 'region' || source === 'currency') ? { key, role, source } : undefined;
}

/**
 * The value a field of a record row takes from the row's code: the code itself for a field of the same role,
 * the record's name for the role that names it, and the minor-unit digits of a currency for a decimal-places
 * field. Other fields are not the record's.
 *
 * @param fieldRole the field's planned role
 * @param record the record key's role and name source
 * @param record.role the key's role
 * @param record.source the source of record names
 * @param code the row's code
 * @param locale display locale
 * @returns the value, or undefined when the field is not the record's or the record has no such value
 */
function recordValue(
    fieldRole: string | undefined,
    record: { role: string; source: 'region' | 'currency' },
    code: string,
    locale: string
): JsonValue | undefined {
    if (fieldRole === record.role) {
        return code;
    }
    if (fieldRole !== undefined && fieldRole === semanticRules().codeTexts.nameRoleOf.get(record.role)) {
        const name = displayName(locale, record.source, code);
        return name && name.toUpperCase() !== code.toUpperCase() ? name : undefined;
    }
    if (fieldRole === DECIMAL_PLACES_ROLE && record.source === 'currency') {
        return currencyFractionDigits(code);
    }
    return undefined;
}

/**
 * Make each row of a record entity describe one record: when an entity's single key is a country or currency
 * code, the other fields of the same role hold that code, the field of the role that names it holds its name,
 * and a decimal-places field of a currency holds the currency's minor-unit digits, each in the form the
 * field's facets give. A value the field does not accept (length, digits) is left as it is. Supplied rows, protected and fixed properties are never written.
 *
 * @param input the rows, the plan and what is fixed
 * @returns the rows
 * @example
 * const resources = alignRecordRows({ graph, resources, existingData, plannedRoles });
 */
export function alignRecordRows(input: RecordRowAlignment): Readonly<Record<string, ReadonlyArray<MockDataRow>>> {
    const { graph, existingData, plannedRoles, fixedProperties } = input;
    const locale = input.locale ?? 'en';
    const output: Record<string, ReadonlyArray<MockDataRow>> = { ...input.resources };
    for (const entity of graph.entities) {
        const roleOf = (property: SchemaProperty): string | undefined =>
            plannedRoles[semanticPropertyKey(entity.entitySetName, property.name)];
        const record = recordKey(entity, roleOf);
        const rows = output[entity.entitySetName];
        if (!record || !rows) {
            continue;
        }
        const fixed = protectedPropertyNames(graph, entity);
        fixedProperties?.get(entity.entitySetName)?.forEach((name) => fixed.add(name));
        const fields = entity.properties.filter((property) => !fixed.has(property.name));
        const generated = generatedRowFlags(entity, rows, existingData);
        output[entity.entitySetName] = Object.freeze(
            rows.map((row, index) => {
                const code = row[record.key.name];
                if (!generated[index] || typeof code !== 'string' || code === '') {
                    return row;
                }
                const updates = fields.flatMap((field) => {
                    const role = roleOf(field);
                    const recorded = recordValue(role, record, code, locale);
                    const value = typeof recorded === 'string' ? valueInFieldForm(field, role, recorded) : recorded;
                    return value !== undefined && value !== row[field.name] && propertyValueIsValid(field, value)
                        ? [[field.name, value] as const]
                        : [];
                });
                return updates.length > 0 ? Object.freeze({ ...row, ...Object.fromEntries(updates) }) : row;
            })
        );
    }
    return Object.freeze(output);
}

import type { SchemaGraph, SchemaProperty } from '../schema/graph.js';
import { inFacetForm, stringFacets } from '../spec/facets.js';
import type { ExistingMockData, MockDataRow } from '../types.js';
import { sha256Uint32 } from '../hash.js';
import { semanticPropertyKey } from '../semantics/classifier.js';
import { semanticRules } from '../semantics/rule-store.js';
import { generatedRowFlags } from './authored.js';
import { propertyValueIsValid } from './constraints.js';
import { codeShaped } from './deterministic.js';
import { protectedPropertyNames } from './rows.js';
import { semanticValueIsValid } from './semantic-plan.js';
import { semanticRoleDefinition } from '../semantics/role-registry.js';
import { countryNumericCode } from '../spec/iso3166.js';

/**
 * A string in the form its field holds: the form its facets give, or, for a country code in a digit-sequence
 * field, the country's ISO 3166-1 numeric code.
 *
 * @param field the field
 * @param role the field's planned role
 * @param value the value
 * @returns the value in the field's form, or undefined when the field cannot hold it
 */
export function valueInFieldForm(field: SchemaProperty, role: string | undefined, value: string): string | undefined {
    const form = inFacetForm(field, value);
    if (form !== undefined || role === undefined || !stringFacets(field).digits) {
        return form;
    }
    return semanticRoleDefinition(role)?.validator === 'country' ? countryNumericCode(value) : undefined;
}

/** What putting values in the form of their facets reads. */
export interface FacetFormInput {
    graph: SchemaGraph;
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>;
    existingData: Readonly<Record<string, ExistingMockData>>;
    /** Planned roles by `EntitySet.Property`; a form the role rejects is not written. */
    plannedRoles: Readonly<Record<string, string>>;
    /** Properties another step fixed, by entity set: never written. */
    fixedProperties?: ReadonlyMap<string, ReadonlySet<string>>;
}

/**
 * Put every generated string in the form its field's facets give: upper case, ISO 3166-1 numeric country codes, or
 * zero-padded digit sequences. Supplied rows, keys, enumerations, relationship ends, fixed properties and forms the
 * planned role rejects are not written.
 *
 * @param input the rows and what is fixed
 * @returns the rows
 */
export function putInFacetForm(input: FacetFormInput): Readonly<Record<string, ReadonlyArray<MockDataRow>>> {
    const { graph, existingData, plannedRoles, fixedProperties } = input;
    const output: Record<string, ReadonlyArray<MockDataRow>> = { ...input.resources };
    for (const entity of graph.entities) {
        const rows = output[entity.entitySetName];
        const fixed = protectedPropertyNames(graph, entity);
        fixedProperties?.get(entity.entitySetName)?.forEach((name) => fixed.add(name));
        const fields = entity.properties.filter((property) => {
            const { digits, upperCase } = stringFacets(property);
            return (digits || upperCase) && !fixed.has(property.name);
        });
        if (!rows || fields.length === 0) {
            continue;
        }
        const generated = generatedRowFlags(entity, rows, existingData);
        output[entity.entitySetName] = Object.freeze(
            rows.map((row, index) => {
                if (!generated[index]) {
                    return row;
                }
                const updates = fields.flatMap((field) => {
                    const value = row[field.name];
                    if (typeof value !== 'string') {
                        return [];
                    }
                    // Only letters in a digit sequence are replaced; a text that upper case would make too long
                    // keeps its value.
                    const ordinal =
                        (sha256Uint32(`${entity.entitySetName}:${field.name}:${index}`) %
                            semanticRules().typedFloor.codeOrdinals) +
                        1;
                    const digits = stringFacets(field).digits;
                    const role = plannedRoles[semanticPropertyKey(entity.entitySetName, field.name)];
                    const form =
                        valueInFieldForm(field, role, value) ??
                        (digits ? codeShaped(field.name, ordinal, field.maxLength, true) : value);
                    return form !== value &&
                        propertyValueIsValid(field, form) &&
                        (role === undefined || semanticValueIsValid(role, field, form))
                        ? [[field.name, form] as const]
                        : [];
                });
                return updates.length > 0 ? Object.freeze({ ...row, ...Object.fromEntries(updates) }) : row;
            })
        );
    }
    return Object.freeze(output);
}

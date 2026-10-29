import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../schema/graph.js';
import type { JsonValue, MockDataGeneratorDiagnostic, MockDataRow } from '../types.js';
import { currencyFractionDigits } from './coherence.js';
import { propertyValueIsValid } from './constraints.js';
import { effectiveValueListParameters, fitDisplayText, valueListDisplayLinks } from './value-list-context.js';
import { SAP_V2_SEMANTICS_CURRENCY_CODE, SAP_V2_TERM, VOCABULARY_TERM_SUFFIX } from '../spec/odata.js';
import { isProtectedProperty, pushUniqueDiagnostic } from './rows.js';
import { MOCKGEN_ERROR_CODE, MockGenError } from '../errors.js';

function currencyProperty(entity: SchemaEntity): SchemaProperty | undefined {
    return entity.codeList === 'currency'
        ? entity.properties.find((property) => property.links?.scale || property.links?.standardCode)
        : undefined;
}

/**
 * Whether a field is the display text that a value list copies from its value help. Such a text
 * belongs to the value-help tuple, so it mirrors the value help rather than any format provider.
 *
 * @param graph schema graph
 * @param entity owning entity
 * @param field candidate field
 * @returns true when a resolvable value-list display link writes the field
 */
function isValueListDisplayText(graph: SchemaGraph, entity: SchemaEntity, field: SchemaProperty): boolean {
    const properties = new Map(entity.properties.map((property) => [property.name, property]));
    return entity.properties.some((owner) => {
        const collection = owner.links?.valueListCollection;
        if (!collection || owner.links?.text !== field.name) {
            return false;
        }
        const targetEntity = graph.entities.find(({ entitySetName }) => entitySetName === collection);
        return valueListDisplayLinks(owner, effectiveValueListParameters(owner), properties, targetEntity).length > 0;
    });
}

/**
 * Whether a field's value is owned elsewhere and must not be rewritten by a format provider: keys,
 * declared enumerations, relationship fields, value-list parameters and value-list display texts.
 *
 * @param graph schema graph
 * @param entity owning entity
 * @param field candidate field
 * @returns true when the field is protected
 */
export function assignmentIsProtected(graph: SchemaGraph, entity: SchemaEntity, field: SchemaProperty): boolean {
    return (
        isProtectedProperty(graph, entity, field) ||
        entity.properties.some((owner) =>
            owner.links?.valueListParameters?.some(({ localProperty }) => localProperty === field.name)
        ) ||
        isValueListDisplayText(graph, entity, field)
    );
}

/**
 * Fill declared currency code-list companions, not application-specific descriptive samples.
 *
 * @param graph
 * @param resources
 * @param diagnostics
 * @param locale
 */
export function applyCurrencyMetadata(
    graph: SchemaGraph,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    diagnostics: MockDataGeneratorDiagnostic[],
    locale = 'en'
): Readonly<Record<string, ReadonlyArray<MockDataRow>>> {
    const generated = { ...resources };
    const names = new Intl.DisplayNames(locale, { type: 'currency', fallback: 'none' });
    for (const entity of graph.entities) {
        const codes = entity.properties.filter(
            (property) =>
                property === currencyProperty(entity) ||
                (property.links?.text &&
                    property.annotations.some(
                        ({ term, value }) =>
                            (term === SAP_V2_TERM.semantics && value === SAP_V2_SEMANTICS_CURRENCY_CODE) ||
                            (term.toLowerCase().endsWith(VOCABULARY_TERM_SUFFIX.isCurrency) && value !== false)
                    ))
        );
        const rows = resources[entity.entitySetName];
        if (codes.length === 0 || !rows) {
            continue;
        }
        const fields = new Map(entity.properties.map((property) => [property.name, property]));
        generated[entity.entitySetName] = rows.map((row) => {
            const updated = { ...row };
            for (const code of codes) {
                const standard = code.links?.standardCode;
                const standardField = standard ? fields.get(standard) : undefined;
                const mappedCode = standard ? row[standard] : undefined;
                const hasKnownMapping =
                    typeof mappedCode === 'string' &&
                    /^[A-Z]{3}$/u.test(mappedCode) &&
                    names.of(mappedCode) !== undefined;
                const currency =
                    hasKnownMapping || (standardField && assignmentIsProtected(graph, entity, standardField))
                        ? mappedCode
                        : row[code.name];
                if (typeof currency !== 'string' || !/^[A-Z]{3}$/u.test(currency)) {
                    continue;
                }
                const textField = code.links?.text ? fields.get(code.links.text) : undefined;
                const currencyName = names.of(currency);
                const expected: ReadonlyArray<readonly [string | undefined, JsonValue | undefined]> = [
                    [code.links?.scale, currencyFractionDigits(currency)],
                    [code.links?.standardCode, currency],
                    [code.links?.text, textField ? fitDisplayText(textField, currencyName) : currencyName]
                ];
                for (const [name, value] of expected) {
                    const field = name ? fields.get(name) : undefined;
                    if (!field || assignmentIsProtected(graph, entity, field)) {
                        continue;
                    }
                    if (value !== undefined && propertyValueIsValid(field, value)) {
                        updated[field.name] = value;
                    } else {
                        pushUniqueDiagnostic(diagnostics, {
                            code: 'CURRENCY_METADATA_UNSUPPORTED',
                            severity: 'warning',
                            target: `${entity.entitySetName}.${field.name}`,
                            message: 'The declared currency code-list field cannot be supplied by the format provider.'
                        });
                    }
                }
            }
            return Object.freeze(updated);
        });
    }
    return Object.freeze(generated);
}

/**
 * Validate actual currency formatting relationships without matching a sample catalog.
 *
 * @param graph
 * @param resources
 */
export function assertCurrencyMetadata(
    graph: SchemaGraph,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>
): void {
    for (const entity of graph.entities) {
        const code = currencyProperty(entity);
        if (!code) {
            continue;
        }
        for (const row of resources[entity.entitySetName] ?? []) {
            const standard = code.links?.standardCode;
            const currency = standard ? row[standard] : row[code.name];
            if (typeof currency !== 'string' || !/^[A-Z]{3}$/u.test(currency)) {
                throw new MockGenError(
                    MOCKGEN_ERROR_CODE.METADATA_INVALID,
                    `Invalid currency formatting code in ${entity.entitySetName}.${code.name}`
                );
            }
            const scale = code.links?.scale;
            const scaleField = entity.properties.find(({ name }) => name === scale);
            // ISO 4217 minor units are the authority, matching what applyCurrencyMetadata writes; CLDR display
            // digits (Intl.NumberFormat) differ for codes such as HUF and IQD. Codes without a minor unit are not checked.
            const expectedScale = currencyFractionDigits(currency);
            if (
                (scale && (!Number.isInteger(row[scale]) || Number(row[scale]) < 0 || Number(row[scale]) > 4)) ||
                (scale &&
                    expectedScale !== undefined &&
                    !assignmentIsProtected(graph, entity, scaleField ?? code) &&
                    row[scale] !== expectedScale)
            ) {
                throw new MockGenError(
                    MOCKGEN_ERROR_CODE.METADATA_INVALID,
                    `Invalid currency formatting metadata in ${entity.entitySetName}`
                );
            }
        }
    }
}

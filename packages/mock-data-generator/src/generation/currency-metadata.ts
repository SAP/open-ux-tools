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
        const codes = currencyCodeProperties(entity);
        const rows = resources[entity.entitySetName];
        if (codes.length === 0 || !rows) {
            continue;
        }
        const context: CurrencyFillContext = {
            graph,
            entity,
            fields: new Map(entity.properties.map((property) => [property.name, property])),
            names,
            diagnostics
        };
        generated[entity.entitySetName] = rows.map((row) => {
            const updated = { ...row };
            for (const code of codes) {
                fillCurrencyCompanions(context, code, row, updated);
            }
            return Object.freeze(updated);
        });
    }
    return Object.freeze(generated);
}

/** What filling the currency companions of one entity's rows reads and reports to. */
interface CurrencyFillContext {
    graph: SchemaGraph;
    entity: SchemaEntity;
    fields: ReadonlyMap<string, SchemaProperty>;
    names: Intl.DisplayNames;
    diagnostics: MockDataGeneratorDiagnostic[];
}

/**
 * The currency code fields of an entity: the code-list currency property, and texted fields annotated as
 * currency codes.
 *
 * @param entity the entity
 * @returns the currency code fields
 */
function currencyCodeProperties(entity: SchemaEntity): SchemaProperty[] {
    return entity.properties.filter(
        (property) =>
            property === currencyProperty(entity) ||
            (property.links?.text &&
                property.annotations.some(
                    ({ term, value }) =>
                        (term === SAP_V2_TERM.semantics && value === SAP_V2_SEMANTICS_CURRENCY_CODE) ||
                        (term.toLowerCase().endsWith(VOCABULARY_TERM_SUFFIX.isCurrency) && value !== false)
                ))
    );
}

/**
 * The currency a row's code field stands for: the mapped standard code when it is known or protected, else
 * the code field's own value.
 *
 * @param context the entity being filled
 * @param code the currency code field
 * @param row the row
 * @returns the row's currency value, of any type
 */
function rowCurrency(context: CurrencyFillContext, code: SchemaProperty, row: MockDataRow): JsonValue | undefined {
    const standard = code.links?.standardCode;
    const standardField = standard ? context.fields.get(standard) : undefined;
    const mappedCode = standard ? row[standard] : undefined;
    const hasKnownMapping =
        typeof mappedCode === 'string' && /^[A-Z]{3}$/u.test(mappedCode) && context.names.of(mappedCode) !== undefined;
    return hasKnownMapping || (standardField && assignmentIsProtected(context.graph, context.entity, standardField))
        ? mappedCode
        : row[code.name];
}

/**
 * Write the scale, standard code and text that a row's currency code implies into its unprotected companions,
 * reporting each companion that cannot hold its value.
 *
 * @param context the entity being filled
 * @param code the currency code field
 * @param row the row as generated
 * @param updated receives the companion values
 */
function fillCurrencyCompanions(
    context: CurrencyFillContext,
    code: SchemaProperty,
    row: MockDataRow,
    updated: Record<string, JsonValue>
): void {
    const { graph, entity, fields, names } = context;
    const currency = rowCurrency(context, code, row);
    if (typeof currency !== 'string' || !/^[A-Z]{3}$/u.test(currency)) {
        return;
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
            pushUniqueDiagnostic(context.diagnostics, {
                code: 'CURRENCY_METADATA_UNSUPPORTED',
                severity: 'warning',
                target: `${entity.entitySetName}.${field.name}`,
                message: 'The declared currency code-list field cannot be supplied by the format provider.'
            });
        }
    }
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
            assertCurrencyRow(graph, entity, code, row);
        }
    }
}

/**
 * Validate one row's currency code and, when declared, its scale against ISO 4217.
 *
 * @param graph schema graph
 * @param entity the currency code-list entity
 * @param code its currency property
 * @param row the row
 * @throws {MockGenError} when the code or scale is invalid
 */
function assertCurrencyRow(graph: SchemaGraph, entity: SchemaEntity, code: SchemaProperty, row: MockDataRow): void {
    const standard = code.links?.standardCode;
    const currency = standard ? row[standard] : row[code.name];
    if (typeof currency !== 'string' || !/^[A-Z]{3}$/u.test(currency)) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.METADATA_INVALID,
            `Invalid currency formatting code in ${entity.entitySetName}.${code.name}`
        );
    }
    const scale = code.links?.scale;
    if (!scale) {
        return;
    }
    const scaleField = entity.properties.find(({ name }) => name === scale);
    // ISO 4217 minor units are the authority, matching what applyCurrencyMetadata writes; CLDR display
    // digits (Intl.NumberFormat) differ for codes such as HUF and IQD. Codes without a minor unit are not checked.
    const expectedScale = currencyFractionDigits(currency);
    if (
        !Number.isInteger(row[scale]) ||
        Number(row[scale]) < 0 ||
        Number(row[scale]) > 4 ||
        (expectedScale !== undefined &&
            !assignmentIsProtected(graph, entity, scaleField ?? code) &&
            row[scale] !== expectedScale)
    ) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.METADATA_INVALID,
            `Invalid currency formatting metadata in ${entity.entitySetName}`
        );
    }
}

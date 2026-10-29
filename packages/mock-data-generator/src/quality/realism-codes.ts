import type { SchemaGraph, SchemaProperty } from '../schema/graph.js';
import { semanticRules } from '../semantics/rule-store.js';
import type { JsonValue, MockDataRow } from '../types.js';
import { propertyNamed, textWords } from './field-words.js';
import { generatedRows, OutcomeCollector, REALISM_CHECK } from './realism-types.js';
import type { CheckOutcome, RealismInput } from './realism-types.js';

/**
 * The checks' vocabulary and thresholds.
 *
 * @returns the rule store's `realismChecks`
 */
const rules = (): ReturnType<typeof semanticRules>['realismChecks'] => semanticRules().realismChecks;

/**
 * Whether a value looks like a code: capitals, digits, underscores or hyphens, at most the rule store's code
 * length.
 *
 * @param value the value
 * @returns true for a code shape
 */
function codeShaped(value: string): boolean {
    return value.length <= rules().maximumCodeLength && /^[A-Z\d_-]+$/u.test(value);
}

/**
 * Whether a field holds human-readable text by its name: its last name word is a text form word.
 *
 * @param property schema property
 * @returns true for name, description and text fields
 */
function isTextForm(property: SchemaProperty): boolean {
    return rules().textFieldWords.has(textWords(property.name).at(-1) ?? '');
}

/**
 * The rows' texts of one code are a single text, and the text is not the code itself when the text field is
 * longer than the code field.
 *
 * @param rows generated rows
 * @param code code property
 * @param text text property the code links to
 * @returns the examined pair count and the failing texts
 */
function linkedTextFailures(
    rows: ReadonlyArray<MockDataRow>,
    code: SchemaProperty,
    text: SchemaProperty
): { checked: number; failing: JsonValue[] } {
    const pairs = rows
        .map((row) => [row[code.name], row[text.name]] as const)
        .filter(
            ([codeValue, textValue]) =>
                codeValue != null && codeValue !== '' && typeof textValue === 'string' && textValue !== ''
        );
    const textsByCode = new Map<string, Set<JsonValue>>();
    for (const [codeValue, textValue] of pairs) {
        const key = JSON.stringify(codeValue);
        textsByCode.set(key, (textsByCode.get(key) ?? new Set()).add(textValue));
    }
    const failing = pairs
        .filter(
            ([codeValue, textValue]) =>
                (textsByCode.get(JSON.stringify(codeValue))?.size ?? 0) > 1 ||
                (textValue === codeValue && (text.maxLength ?? Infinity) > (code.maxLength ?? 0))
        )
        .map(([, textValue]) => textValue);
    return { checked: pairs.length, failing };
}

/**
 * Which values of a text column are codes, when codes fill the column: the share of code-shaped values
 * reaches the rule store's `codeShare`. A column of words with the odd code in it passes.
 *
 * @param values the column's non-empty values
 * @returns per value, whether it is a code in a column that codes fill
 * @example
 * codeFilledText(['Q', '30', '14', '7', 'Gold tier']); // [true, true, true, true, false]
 */
export function codeFilledText(values: ReadonlyArray<string>): boolean[] {
    const flags = values.map((value) => codeShaped(value));
    const filled = values.length > 0 && flags.filter(Boolean).length / values.length >= rules().codeShare;
    return flags.map((flag) => filled && flag);
}

/**
 * Whether a field named as a text can be checked for holding codes: a string longer than a code, with no
 * declared enumeration.
 *
 * @param property schema property
 * @returns true for checkable text-form fields
 */
export function holdsTextByName(property: SchemaProperty): boolean {
    return (
        property.primitiveType === 'string' &&
        isTextForm(property) &&
        (property.maxLength ?? Infinity) > 4 &&
        !property.enumValues?.length
    );
}

/**
 * The texts of codes are a function of the code (one code, one text), and texts are not codes. Checked
 * for every declared text link (`Common.Text`, `sap:text`) within an entity, and for every field named as
 * a text (`…Name`, `…Description`) whose values look like codes.
 *
 * @param input check input
 * @returns findings per text field
 */
export function checkCodeTexts(input: RealismInput): CheckOutcome {
    const collector = new OutcomeCollector(REALISM_CHECK.codeText);
    for (const entity of input.graph.entities) {
        const rows = generatedRows(input, entity.entitySetName);
        const linkedTexts = new Set<string>();
        for (const code of entity.properties) {
            const text = code.links?.text ? propertyNamed(entity, code.links.text) : undefined;
            if (text?.primitiveType !== 'string') {
                continue;
            }
            linkedTexts.add(text.name);
            collector.field({
                entitySet: entity.entitySetName,
                property: text.name,
                ...linkedTextFailures(rows, code, text),
                related: `${entity.entitySetName}.${code.name}`
            });
        }
        for (const property of entity.properties.filter(
            (field) => !linkedTexts.has(field.name) && holdsTextByName(field)
        )) {
            const values = rows
                .map((row) => row[property.name])
                .filter((value): value is string => typeof value === 'string' && value !== '');
            const codes = codeFilledText(values);
            collector.field({
                entitySet: entity.entitySetName,
                property: property.name,
                checked: values.length,
                failing: values.filter((_, index) => codes[index])
            });
        }
    }
    return collector.outcome();
}

/**
 * Properties that a relationship maps or that another property names as its unit or currency: their
 * values are shared by design and may be constant.
 *
 * @param graph service schema
 * @returns `entitySet.property` keys
 */
function sharedByDesign(graph: SchemaGraph): Set<string> {
    const shared = new Set<string>();
    for (const relationship of graph.relationships) {
        for (const { sourceProperty, targetProperty } of relationship.mappings) {
            shared.add(`${relationship.fromEntitySet}.${sourceProperty}`);
            shared.add(`${relationship.toEntitySet}.${targetProperty}`);
        }
    }
    for (const entity of graph.entities) {
        for (const property of entity.properties) {
            for (const target of [property.links?.unit, property.links?.currency]) {
                if (target) {
                    shared.add(`${entity.entitySetName}.${target}`);
                }
            }
        }
    }
    return shared;
}

/**
 * Non-key, non-enumerated text and number columns that hold one value in every row: a field that tells
 * nothing apart.
 *
 * @param input check input
 * @returns findings per field
 */
export function checkConstantColumns(input: RealismInput): CheckOutcome {
    const collector = new OutcomeCollector(REALISM_CHECK.constantColumn);
    const shared = sharedByDesign(input.graph);
    for (const entity of input.graph.entities) {
        const rows = generatedRows(input, entity.entitySetName);
        for (const property of entity.properties) {
            const eligible =
                !property.isKey &&
                !property.enumValues?.length &&
                ['string', 'int', 'decimal'].includes(property.primitiveType) &&
                !shared.has(`${entity.entitySetName}.${property.name}`);
            const values = eligible
                ? rows.map((row) => row[property.name]).filter((value) => value != null && value !== '')
                : [];
            const constant =
                values.length >= rules().minimumPatternRows &&
                new Set(values.map((value) => JSON.stringify(value))).size === 1;
            collector.field({
                entitySet: entity.entitySetName,
                property: property.name,
                checked: values.length,
                failing: constant ? values : []
            });
        }
    }
    return collector.outcome();
}

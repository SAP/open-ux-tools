import type { SchemaGraph, SchemaProperty } from '../schema/graph.js';
import { semanticRules } from '../semantics/rule-store.js';
import { standardFallbackTest } from '../spec/standard-mockserver.js';
import type { JsonValue } from '../types.js';
import { phrase, serviceIdentifiers, serviceNamePhrases, subjectWords, textWords } from './field-words.js';
import { generatedRows, OutcomeCollector, REALISM_CHECK } from './realism-types.js';
import type { CheckOutcome, RealismInput } from './realism-types.js';

/** A text that ends in a separate number: the stem and the number. */
const NUMBERED = /^(.*\S)\s+(\d+)$/u;
/**
 * The checks' vocabulary and thresholds.
 *
 * @returns the rule store's `realismChecks`
 */
const rules = (): ReturnType<typeof semanticRules>['realismChecks'] => semanticRules().realismChecks;

/**
 * The string values of a property that the generator chose: declared enumeration members are the
 * service's own domain, and standard mock server fallback values, the field's own or one a value list copied
 * into it, say that nothing knew the field, so both are skipped. The fallback is counted on its own.
 *
 * @param graph service schema
 * @param property schema property
 * @param values the column
 * @returns the strings to check
 */
function chosenStrings(
    graph: SchemaGraph,
    property: SchemaProperty,
    values: ReadonlyArray<JsonValue | undefined>
): string[] {
    const members = new Set((property.enumValues ?? []).map(String));
    const isFallback = standardFallbackTest(graph);
    return values.filter(
        (value): value is string =>
            typeof value === 'string' && value !== '' && !members.has(value) && !isFallback(value)
    );
}

/**
 * The prefixes of a column that are followed by several different numbers (`No 1`, `No 2`, `No 3`): the
 * column counts up a prefix instead of holding values.
 *
 * @param numbered the column's values split into prefix and number
 * @returns the counted prefixes
 */
function countedStems(numbered: ReadonlyArray<RegExpExecArray | null>): Set<string> {
    const numbers = new Map<string, Set<string>>();
    for (const match of numbered) {
        if (match && /\p{L}/u.test(match[1])) {
            numbers.set(match[1], (numbers.get(match[1]) ?? new Set()).add(match[2]));
        }
    }
    return new Set(
        [...numbers].filter(([, found]) => found.size >= rules().minimumCountedNumbers).map(([stem]) => stem)
    );
}

/**
 * Which values of a column are placeholders: a multi-word name the service uses followed by a number
 * (`Unit Price 1` where a field is labelled `Unit Price`), or a name the service uses that the column counts
 * up (`Remark 1`, `Remark 2`, `Remark 3` where a field is named `Remark`). A counted prefix that names
 * nothing in the service (`Floor 1`, `Floor 2`, `Floor 3`) is data.
 *
 * @param names the service's name phrases ({@link serviceNamePhrases})
 * @param values the column's string values
 * @returns per value, whether it is a placeholder
 */
export function placeholderFlags(names: ReadonlySet<string>, values: ReadonlyArray<string>): boolean[] {
    const numbered = values.map((value) => NUMBERED.exec(value));
    const counted = countedStems(numbered);
    return numbered.map((match) => {
        const stem = match?.[1] ?? '';
        return names.has(phrase(stem)) && (counted.has(stem) || textWords(stem).length >= rules().minimumEchoedWords);
    });
}

/**
 * Text values that are placeholders ({@link placeholderFlags}).
 *
 * @param input check input
 * @returns findings per field
 */
export function checkPlaceholders(input: RealismInput): CheckOutcome {
    const collector = new OutcomeCollector(REALISM_CHECK.placeholder);
    const names = serviceNamePhrases(input.graph);
    for (const entity of input.graph.entities) {
        const rows = generatedRows(input, entity.entitySetName);
        for (const property of entity.properties.filter(({ primitiveType }) => primitiveType === 'string')) {
            const values = chosenStrings(
                input.graph,
                property,
                rows.map((row) => row[property.name])
            );
            const flags = placeholderFlags(names, values);
            collector.field({
                entitySet: entity.entitySetName,
                property: property.name,
                checked: values.length,
                failing: values.filter((_value, index) => flags[index])
            });
        }
    }
    return collector.outcome();
}

/**
 * Whether a value is the exact name of something in the service, or the multi-word name or label of a
 * property: a field name leaking into the data.
 *
 * @param graph service schema
 * @returns the test
 */
export function nameLeakTest(graph: SchemaGraph): (value: string) => boolean {
    const identifiers = serviceIdentifiers(graph);
    const labels = new Set(
        graph.entities.flatMap((entity) =>
            entity.properties.flatMap(({ name, label }) => [phrase(name), label ? phrase(label) : ''])
        )
    );
    return (value) =>
        textWords(value).length >= rules().minimumSharedWords && (identifiers.has(value) || labels.has(phrase(value)));
}

/**
 * Values that leak a service name ({@link nameLeakTest}).
 *
 * @param input check input
 * @returns findings per field
 */
export function checkNameLeaks(input: RealismInput): CheckOutcome {
    const collector = new OutcomeCollector(REALISM_CHECK.nameLeak);
    const leaks = nameLeakTest(input.graph);
    for (const entity of input.graph.entities) {
        const rows = generatedRows(input, entity.entitySetName);
        for (const property of entity.properties.filter(({ primitiveType }) => primitiveType === 'string')) {
            const values = chosenStrings(
                input.graph,
                property,
                rows.map((row) => row[property.name])
            );
            collector.field({
                entitySet: entity.entitySetName,
                property: property.name,
                checked: values.length,
                failing: values.filter(leaks)
            });
        }
    }
    return collector.outcome();
}

interface TextField {
    entitySet: string;
    property: SchemaProperty;
    subject: Set<string>;
    values: string[];
    texts: Set<string>;
}

/**
 * Pairs of fields the schema itself connects: a relationship maps one to the other, or one is the
 * declared text of the other.
 *
 * @param graph service schema
 * @returns `entitySet.property` keys of connected fields, both directions
 */
function connectedFields(graph: SchemaGraph): Set<string> {
    const connected = new Set<string>();
    const connect = (left: string, right: string): void => {
        connected.add(`${left}|${right}`);
        connected.add(`${right}|${left}`);
    };
    for (const relationship of graph.relationships) {
        for (const { sourceProperty, targetProperty } of relationship.mappings) {
            connect(`${relationship.fromEntitySet}.${sourceProperty}`, `${relationship.toEntitySet}.${targetProperty}`);
        }
    }
    for (const entity of graph.entities) {
        for (const property of entity.properties) {
            if (property.links?.text) {
                connect(`${entity.entitySetName}.${property.name}`, `${entity.entitySetName}.${property.links.text}`);
            }
        }
    }
    return connected;
}

/**
 * Fields about unrelated subjects that share several multi-word values: one generic list filled both
 * (`Valve repair` as a bank category description and as a payment type group name). Fields whose subject
 * words overlap, or that the schema connects, may share values.
 *
 * @param input check input
 * @returns findings per field, naming one unrelated field it shares values with
 */
export function checkSharedTexts(input: RealismInput): CheckOutcome {
    const collector = new OutcomeCollector(REALISM_CHECK.sharedText);
    const connected = connectedFields(input.graph);
    const fields: TextField[] = input.graph.entities.flatMap((entity) => {
        const rows = generatedRows(input, entity.entitySetName);
        return entity.properties
            .filter(({ primitiveType, isKey }) => primitiveType === 'string' && !isKey)
            .map((property) => {
                const values = chosenStrings(
                    input.graph,
                    property,
                    rows.map((row) => row[property.name])
                );
                return {
                    entitySet: entity.entitySetName,
                    property,
                    subject: subjectWords(property),
                    values,
                    texts: new Set(values.filter((value) => textWords(value).length >= rules().minimumSharedWords))
                };
            });
    });
    // A field named only by form words (`name`, `descr`) is about its entity, like every such field of it.
    const sameEntityWithoutSubject = (left: TextField, right: TextField): boolean =>
        left.entitySet === right.entitySet && (left.subject.size === 0 || right.subject.size === 0);
    const unrelated = (left: TextField, right: TextField): boolean =>
        left.property.name !== right.property.name &&
        !sameEntityWithoutSubject(left, right) &&
        [...left.subject].every((word) => !right.subject.has(word)) &&
        !connected.has(`${left.entitySet}.${left.property.name}|${right.entitySet}.${right.property.name}`);
    for (const field of fields) {
        const partner = fields.find(
            (other) =>
                other !== field &&
                unrelated(field, other) &&
                [...field.texts].filter((text) => other.texts.has(text)).length >= rules().minimumSharedValues
        );
        const shared = partner ? field.values.filter((value) => partner.texts.has(value)) : [];
        collector.field({
            entitySet: field.entitySet,
            property: field.property.name,
            checked: field.values.length,
            failing: shared,
            related: partner ? `${partner.entitySet}.${partner.property.name}` : undefined
        });
    }
    return collector.outcome();
}

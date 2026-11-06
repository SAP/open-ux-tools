import { phrase, serviceNamePhrases, textWords } from '../quality/field-words.js';
import { codeFilledText, holdsTextByName } from '../quality/realism-codes.js';
import { nameLeakTest } from '../quality/realism-text.js';
import { semanticRules } from '../semantics/rule-store.js';
import type { SchemaGraph, SchemaProperty } from '../schema/graph.js';
import type { ExistingMockData, JsonValue, MockDataGeneratorDiagnostic, MockDataRow } from '../types.js';
import { generatedRowFlags } from './authored.js';
import { codeTextPairs } from './code-texts.js';
import { protectedPropertyNames } from './rows.js';
import { undoChangesBreakingFinalChecks } from './final-checks.js';

/** The rows after the guard and how many generated cells it withheld. */
export interface RealismGuardResult {
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>;
    withheld: number;
}

/**
 * Properties another property names as its unit or currency: their values come from code lists.
 *
 * @param graph service schema
 * @param entitySet entity set name
 * @returns the property names
 */
function unitAndCurrencyTargets(graph: SchemaGraph, entitySet: string): Set<string> {
    const entity = graph.entities.find(({ entitySetName }) => entitySetName === entitySet);
    return new Set(
        (entity?.properties ?? []).flatMap(({ links }) =>
            [links?.unit, links?.currency].filter((target): target is string => Boolean(target))
        )
    );
}

/** A text that ends in a separate number: the stem and the number. */
const NUMBERED = /^(.*\S)\s+(\d+)$/u;

/**
 * Which values of a column echo a name of the service followed by a number: the name has several words
 * (`Unit Price 1`), or the column counts it up (`Line 1`, `Line 2`, `Line 3` where the service names a
 * line). A number after a word the service does not use (`Floor 3`) is a value, not an echo. The word and
 * count limits are the rule store's `realismGuard` parameters.
 *
 * @param names the service's name phrases
 * @param values the column's values
 * @returns per value, whether it echoes a service name
 */
function echoFlags(names: ReadonlySet<string>, values: ReadonlyArray<string>): boolean[] {
    const { minimumEchoedWords, minimumCountedNumbers } = semanticRules().realismGuard;
    const numbered = values.map((value) => NUMBERED.exec(value));
    const numbers = new Map<string, Set<string>>();
    for (const match of numbered) {
        if (match) {
            numbers.set(match[1], (numbers.get(match[1]) ?? new Set()).add(match[2]));
        }
    }
    return numbered.map((match) => {
        const stem = match?.[1];
        return (
            stem !== undefined &&
            names.has(phrase(stem)) &&
            (textWords(stem).length >= minimumEchoedWords || (numbers.get(stem)?.size ?? 0) >= minimumCountedNumbers)
        );
    });
}

interface GuardVocabulary {
    names: ReadonlySet<string>;
    leaks: (value: string) => boolean;
}

/**
 * The generated cells of one string column that only look like data: an echoed or leaked service name, or,
 * in a field named as a text that is no code's text, a code where codes fill the column.
 *
 * @param rows the entity's rows
 * @param generated per row, whether generation wrote it
 * @param property the column
 * @param linkedText whether the column holds the text of a code of the entity
 * @param vocabulary the service's names
 * @returns the row indexes of the failing cells
 */
function unrealisticCells(
    rows: ReadonlyArray<MockDataRow>,
    generated: ReadonlyArray<boolean>,
    property: SchemaProperty,
    linkedText: boolean,
    vocabulary: GuardVocabulary
): number[] {
    const cells = rows
        .map((row, index) => ({ index, value: row[property.name] }))
        .filter(
            (cell): cell is { index: number; value: string } =>
                generated[cell.index] && typeof cell.value === 'string' && cell.value !== ''
        );
    const values = cells.map(({ value }) => value);
    const echoes = echoFlags(vocabulary.names, values);
    const codes = !linkedText && holdsTextByName(property) ? codeFilledText(values) : [];
    return cells
        .filter(({ value }, position) => echoes[position] || codes[position] || vocabulary.leaks(value))
        .map(({ index }) => index);
}

/**
 * Withhold generated string values that only look like data: a field or entity name of the service
 * (the name of another field written into a type field), a service name followed by a number
 * ({@link echoFlags}), or codes filling a field named as a text ({@link codeFilledText}). Whatever tier wrote them (value bank, model or typed floor), such a cell is set to
 * null when the field may be empty and to the empty string otherwise, and each field is reported once.
 *
 * Supplied rows, keys, declared enumerations, relationship ends and unit or currency fields keep their
 * values: they come from the caller, the schema or the related rows. A withheld value that leaves a field
 * its planned role rejects, or a row outside its value-list tuple, is put back
 * ({@link undoChangesBreakingFinalChecks}), so the guard never aborts a generation.
 *
 * @param graph service schema
 * @param resources the final rows
 * @param existingData the caller's existing rows
 * @param roles planned semantic roles by field
 * @param diagnostics receives one `REALISM_VALUE_WITHHELD` entry per field
 * @returns the rows and the number of withheld cells
 */
export function withholdUnrealisticValues(
    graph: SchemaGraph,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    existingData: Readonly<Record<string, ExistingMockData>>,
    roles: Readonly<Record<string, string>>,
    diagnostics: MockDataGeneratorDiagnostic[]
): RealismGuardResult {
    const vocabulary: GuardVocabulary = { names: serviceNamePhrases(graph), leaks: nameLeakTest(graph) };
    const output: Record<string, ReadonlyArray<MockDataRow>> = { ...resources };
    const candidates: Array<{ entitySetName: string; property: string; indices: ReadonlyArray<number> }> = [];
    for (const entity of graph.entities) {
        const rows = resources[entity.entitySetName] ?? [];
        const generated = generatedRowFlags(entity, rows, existingData);
        const fixed = protectedPropertyNames(graph, entity);
        unitAndCurrencyTargets(graph, entity.entitySetName).forEach((name) => fixed.add(name));
        const replacements = new Map<number, Record<string, JsonValue>>();
        // The text of a code follows its code through code-text coherence, which may repeat a code that has no words.
        const linkedTexts = new Set(codeTextPairs(entity).map(({ text }) => text.name));
        for (const property of entity.properties.filter(
            ({ primitiveType, name }) => primitiveType === 'string' && !fixed.has(name)
        )) {
            const failing = unrealisticCells(rows, generated, property, linkedTexts.has(property.name), vocabulary);
            failing.forEach((index) =>
                replacements.set(index, { ...replacements.get(index), [property.name]: property.nullable ? null : '' })
            );
            if (failing.length > 0) {
                candidates.push({ entitySetName: entity.entitySetName, property: property.name, indices: failing });
            }
        }
        if (replacements.size > 0) {
            output[entity.entitySetName] = rows.map((row, index) => {
                const replacement = replacements.get(index);
                return replacement ? Object.freeze({ ...row, ...replacement }) : row;
            });
        }
    }
    const checked = undoChangesBreakingFinalChecks(graph, resources, output, existingData, roles);
    let withheld = 0;
    for (const { entitySetName, property, indices } of candidates) {
        const kept = checked.resources[entitySetName] ?? [];
        const count = indices.filter((index) => kept[index] !== resources[entitySetName]?.[index]).length;
        if (count > 0) {
            withheld += count;
            diagnostics.push({
                code: 'REALISM_VALUE_WITHHELD',
                severity: 'info',
                target: `${entitySetName}.${property}`,
                message: `${count} generated values only named the service, counted up a prefix or put codes in a text; they were left empty.`
            });
        }
    }
    return { resources: checked.resources, withheld };
}

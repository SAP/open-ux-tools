import type { SchemaProperty } from '../../src/schema/graph.js';

// The model output filters of generation/sft.ts as they were before their patterns moved to the semantic
// rule store (commit 22235d92be), kept verbatim as the oracle of the filter equivalence test.
function normalizedText(value: string): string {
    return value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US');
}

function escapedRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

/**
 * Whether a proposed value repeats the prompt's instructions instead of holding content. Such a value
 * shows the model lost track of the task, so the other values of its row are not trusted either.
 *
 * @param property the field
 * @param value proposed value
 * @returns true for an instruction echo
 */
export function oracleIsInstructionEcho(property: SchemaProperty, value: unknown): boolean {
    if (typeof value !== 'string') {
        return false;
    }
    const normalized = normalizedText(value);
    if (
        /\b(?:return|output|provide|respond|generate)\b.{0,80}\bjson\s+array\b/u.test(normalized) ||
        /\bjson\s+array\b.{0,100}\b(?:with|containing)\b.{0,80}\b(?:object|row|key|field)s?\b/u.test(normalized)
    ) {
        return true;
    }
    const fieldPattern = [property.name, property.label, property.description]
        .filter((candidate): candidate is string => Boolean(candidate))
        .map((candidate) => escapedRegExp(normalizedText(candidate)))
        .join('|');
    return (
        fieldPattern.length > 0 &&
        new RegExp(
            `^(?:the\\s+)?["']?(?:${fieldPattern})["']?\\s+(?:key|field)\\b.*\\b(?:should|must|contain|include|return)\\b`,
            'u'
        ).test(normalized)
    );
}

export function oracleIsNarrativePlaceholder(property: SchemaProperty, value: string): boolean {
    const normalized = normalizedText(value);
    const fieldNames = [property.name, property.label, property.description]
        .filter((candidate): candidate is string => Boolean(candidate))
        .map(normalizedText);
    if (fieldNames.includes(normalized)) {
        return true;
    }
    if (
        /^(?:n\/?a|none|null|unknown|tbd|todo|placeholder|lorem(?: ipsum)?|sample(?: text)?|test(?: value)?|value|text)$/u.test(
            normalized
        )
    ) {
        return true;
    }
    if (/^(?:\/{1,2}|[a-z][a-z0-9+.-]*:\/\/)[^\s]+$/u.test(normalized)) {
        return true;
    }
    const jsonArrayInstruction =
        /\b(?:return|output|provide|respond|generate)\b.{0,80}\bjson\s+array\b/u.test(normalized) ||
        /\bjson\s+array\b.{0,100}\b(?:with|containing)\b.{0,80}\b(?:object|row|key|field)s?\b/u.test(normalized);
    if (jsonArrayInstruction) {
        return true;
    }
    const fieldPattern = fieldNames.map(escapedRegExp).join('|');
    return (
        fieldPattern.length > 0 &&
        (new RegExp(`^(?:${fieldPattern})\\s+(?:value|text|description|placeholder)$`, 'u').test(normalized) ||
            new RegExp(
                `^(?:the\\s+)?["']?(?:${fieldPattern})["']?\\s+(?:key|field)\\b.*\\b(?:should|must|contain|include|return)\\b`,
                'u'
            ).test(normalized) ||
            new RegExp(`^(?:${fieldPattern})\\s+(?:#\\s*)?\\d+(?:st|nd|rd|th)?$`, 'u').test(normalized))
    );
}

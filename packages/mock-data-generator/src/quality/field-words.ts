import { identifierTokens } from '../naming.js';
import { semanticRules } from '../semantics/rule-store.js';
import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../schema/graph.js';

/**
 * Whether a word names the form of a field rather than what it is about (`Unit Category Description` is
 * about a unit category): a text or identifier form word of the rule store's `realismChecks`. Two fields
 * that share only such words are not about the same thing.
 *
 * @param word a lower-case word
 * @returns true for a form word
 */
function isFormWord(word: string): boolean {
    const { textFormWords, identifierFormWords } = semanticRules().realismChecks;
    return textFormWords.has(word) || identifierFormWords.has(word);
}

/**
 * Lowercase words of a free text, split at camel case, digits kept, punctuation dropped.
 *
 * @param text identifier, label or value
 * @returns the words in order
 * @example
 * textWords('International Fax Number'); // ['international', 'fax', 'number']
 * textWords('SearchTerm1'); // ['search', 'term1']
 */
export function textWords(text: string): string[] {
    return text
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean)
        .flatMap((part) => identifierTokens(part));
}

/**
 * A text reduced to its lowercase words joined by single spaces, for comparing names, labels and values.
 *
 * @param text identifier, label or value
 * @returns the normalised phrase
 */
export function phrase(text: string): string {
    return textWords(text).join(' ');
}

/**
 * The words that say what a field is about: its name and label words without form words.
 *
 * @param property schema property
 * @returns the subject words
 */
export function subjectWords(property: SchemaProperty): Set<string> {
    const words = [...textWords(property.name), ...(property.label ? textWords(property.label) : [])];
    return new Set(words.filter((word) => !isFormWord(word) && !/^\d+$/u.test(word)));
}

/**
 * Every phrase the service uses to name something (property, entity and entity set names, labels and
 * descriptions), and every trailing run of words of each, so `Unit Price` also yields `price`.
 *
 * @param graph service schema
 * @returns the phrases
 */
export function serviceNamePhrases(graph: SchemaGraph): Set<string> {
    const phrases = new Set<string>();
    const add = (text: string | undefined): void => {
        const words = text ? textWords(text) : [];
        for (let start = 0; start < words.length; start++) {
            phrases.add(words.slice(start).join(' '));
        }
    };
    for (const entity of graph.entities) {
        add(entity.name);
        add(entity.entitySetName);
        for (const property of entity.properties) {
            add(property.name);
            add(property.label);
            add(property.description);
        }
    }
    return phrases;
}

/**
 * The exact names the service declares (properties, entities, entity sets).
 *
 * @param graph service schema
 * @returns the names
 */
export function serviceIdentifiers(graph: SchemaGraph): Set<string> {
    return new Set(
        graph.entities.flatMap((entity) => [
            entity.name,
            entity.entitySetName,
            ...entity.properties.map(({ name }) => name)
        ])
    );
}

/**
 * Whether an annotation of a property has the given term name, whatever namespace alias the document uses
 * (`SAP__common.Text`, `Common.Text` and `com.sap.vocabularies.Common.v1.Text` all have the name `Text`).
 *
 * @param property schema property
 * @param termName unqualified term name
 * @returns true when the property carries the term
 */
export function hasTerm(property: SchemaProperty, termName: string): boolean {
    return property.annotations.some(({ term }) => term === termName || term.endsWith(`.${termName}`));
}

/**
 * A property of an entity by name.
 *
 * @param entity schema entity
 * @param name property name
 * @returns the property, if declared
 */
export function propertyNamed(entity: SchemaEntity, name: string): SchemaProperty | undefined {
    return entity.properties.find((property) => property.name === name);
}

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { PrimitiveType } from '../../src/schema/graph.js';
import { parseServiceMetadata } from '../../src/schema/parse-metadata.js';
import { lexicalRoleForText } from '../../src/semantics/lexical-fallback.js';
import { packagedRoleRegistry } from '../../src/semantics/role-registry.js';
import {
    semanticRules,
    SEMANTIC_RULE_STORE_PATH,
    packagedSemanticRules,
    parseSemanticRuleStore
} from '../../src/semantics/rule-store.js';
import { oracleLexicalRoleForText } from './lexical-rules-oracle.js';

const storeDocument = (): Record<string, unknown> =>
    JSON.parse(readFileSync(new URL(`../../${SEMANTIC_RULE_STORE_PATH}`, import.meta.url), 'utf8')) as Record<
        string,
        unknown
    >;

const TYPES: ReadonlyArray<PrimitiveType> = ['string', 'int', 'decimal', 'date', 'datetime', 'time', 'bool', 'guid'];

/**
 * Every word a rule, the glossary or the old rule chain names, so single words and pairs reach every rule.
 *
 * @returns the vocabulary, in a stable order
 */
function ruleVocabulary(): ReadonlyArray<string> {
    const words = new Set<string>(['measure', 'equipment', 'zone', 'item', 'items', 'abc', 'no']);
    for (const rule of semanticRules().lexicalRules) {
        if (rule.kind === 'first-word') {
            rule.words.forEach((word) => words.add(word));
        } else {
            rule.all.forEach((group) => group.forEach((word) => words.add(word)));
            rule.none.forEach((word) => words.add(word));
            rule.lastWord?.forEach((word) => words.add(word));
        }
    }
    for (const { abbreviation, word } of semanticRules().sapAbbreviations) {
        words.add(abbreviation);
        words.add(word);
    }
    return [...words].sort();
}

const pascal = (word: string): string => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`;

/**
 * Names of every property, label and description of the package fixtures, with their declared type.
 *
 * @returns name and type pairs
 */
function fixtureNames(): ReadonlyArray<readonly [string, PrimitiveType]> {
    const fixtures: ReadonlyArray<readonly ['edmx' | 'csn', string, '2.0' | '4.0']> = [
        ['edmx', './travel-v2.metadata.xml', '2.0'],
        ['edmx', './finance-manage.metadata.xml', '2.0'],
        ['edmx', './synthetic-finance.metadata.xml', '4.0'],
        ['csn', './fixtures/bookshop.csn.json', '4.0']
    ];
    return fixtures.flatMap(([format, file, odataVersion]) => {
        const graph = parseServiceMetadata(
            { format, content: readFileSync(new URL(file, import.meta.url), 'utf8') },
            { urlPath: '/odata/v4/catalog', odataVersion }
        );
        return graph.entities.flatMap(({ properties }) =>
            properties.flatMap((property) =>
                [property.name, property.label, property.description]
                    .filter((text): text is string => Boolean(text))
                    .map((text) => [text, property.primitiveType] as const)
            )
        );
    });
}

/**
 * A deterministic pseudo-random sequence (a 32-bit linear congruential generator).
 *
 * @param seed start value
 * @returns the next-value function
 */
function sequence(seed: number): () => number {
    let state = seed;
    return () => {
        state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
        return state;
    };
}

describe('semantic rule store', () => {
    describe('lexical rule engine', () => {
        const vocabulary = ruleVocabulary();
        const mismatches = (cases: Iterable<readonly [string, PrimitiveType]>): string[] => {
            const found: string[] = [];
            for (const [text, type] of cases) {
                const expected = oracleLexicalRoleForText(text, type);
                const actual = lexicalRoleForText(text, type);
                if (expected !== actual) {
                    found.push(`${text} (${type}): ${String(expected)} became ${String(actual)}`);
                }
            }
            return found;
        };

        it('routes every fixture field name, label and description as the former rule chain did', () => {
            // Given every name, label and description of the package fixtures, with its declared type and
            // the common column types
            const cases = fixtureNames().flatMap(([text, type]) =>
                [type, 'string', 'int', 'decimal'].map((candidate) => [text, candidate as PrimitiveType] as const)
            );
            // When the rule store's engine and the former chain route them
            // Then they agree on every case
            expect(cases.length).toBeGreaterThan(1_000);
            expect(mismatches(cases)).toEqual([]);
        });

        it('routes every rule word, alone and in every ordered pair, as the former rule chain did', () => {
            // Given each rule word alone and each ordered pair, spelled in Pascal case and in upper-case snake case
            const cases: Array<readonly [string, PrimitiveType]> = [];
            for (const first of vocabulary) {
                for (const type of TYPES) {
                    cases.push([pascal(first), type], [first.toUpperCase(), type]);
                }
                for (const second of vocabulary) {
                    for (const type of TYPES) {
                        cases.push([`${pascal(first)}${pascal(second)}`, type]);
                    }
                    cases.push([`${first.toUpperCase()}_${second.toUpperCase()}`, 'string']);
                }
            }
            // When the rule store's engine and the former chain route them
            // Then they agree on every case
            expect(mismatches(cases)).toEqual([]);
        });

        it("routes each rule's own words, with every alternative and every excluded word, as the former rule chain did", () => {
            // Given, for each rule, its required words in every combination of alternatives, alone, followed
            // by each excluded word, and followed by each word of the vocabulary
            const cases: Array<readonly [string, PrimitiveType]> = [];
            const add = (words: ReadonlyArray<string>): void => {
                for (const type of TYPES) {
                    cases.push([words.map(pascal).join(''), type]);
                }
            };
            for (const rule of semanticRules().lexicalRules) {
                if (rule.kind === 'first-word') {
                    const words = [...rule.words];
                    words.forEach((first) => words.forEach((second) => add([first, second])));
                    continue;
                }
                let combinations: string[][] = [[]];
                for (const group of rule.all) {
                    combinations = combinations.flatMap((combination) =>
                        [...group].map((word) => [...combination, word])
                    );
                }
                for (const words of combinations) {
                    const required = rule.lastWord ? [...words, ...rule.lastWord] : words;
                    add(required);
                    rule.none.forEach((excluded) => add([...required, excluded]));
                    vocabulary.forEach((extra) => add([...words, extra]));
                }
            }
            // When the rule store's engine and the former chain route them
            // Then they agree on every case
            expect(mismatches(cases)).toEqual([]);
        });

        it('routes seeded three- and four-word names as the former rule chain did', () => {
            // Given 40,000 seeded names of three or four rule words
            const next = sequence(20_261_028);
            const cases: Array<readonly [string, PrimitiveType]> = [];
            for (let index = 0; index < 40_000; index += 1) {
                const length = 3 + (next() % 2);
                const name = Array.from({ length }, () => pascal(vocabulary[next() % vocabulary.length])).join('');
                cases.push([name, TYPES[next() % TYPES.length]]);
            }
            // When the rule store's engine and the former chain route them
            // Then they agree on every case
            expect(mismatches(cases)).toEqual([]);
        });
    });

    describe('adjacent word rules', () => {
        it('reads first and last names only as one compound', () => {
            // Given names with last and name together, apart, and a full name after a change qualifier
            // Then only the compound is a last name, and the full name is a full name
            expect(lexicalRoleForText('LastName', 'string')).toBe('person_last_name');
            expect(lexicalRoleForText('LastChangedByUserName', 'string')).not.toBe('person_last_name');
            expect(lexicalRoleForText('LastChangedByUserFullName', 'string')).toBe('person_full_name');
            expect(lexicalRoleForText('FirstApprovedByName', 'string')).not.toBe('person_first_name');
        });
    });

    describe('packaged store', () => {
        it('digests the exact bytes it parsed', () => {
            // Given the packaged store file
            const bytes = readFileSync(new URL(`../../${SEMANTIC_RULE_STORE_PATH}`, import.meta.url));
            // Then the exported digest is the SHA-256 of those bytes
            expect(packagedSemanticRules().sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
        });

        it('names only roles of the role registry', () => {
            // Given every role the store routes to or names in its policy
            const roles = new Set<string>();
            for (const rule of semanticRules().lexicalRules) {
                if (rule.kind === 'words') {
                    roles.add(rule.role);
                } else {
                    rule.words.forEach((word) => roles.add(word));
                }
            }
            semanticRules().dataElements.forEach(({ role }) => roles.add(role));
            semanticRules().metadataRoles.vocabularyTerms.forEach(({ role }) => roles.add(role));
            semanticRules().metadataRoles.sapSemantics.forEach((role) => roles.add(role));
            const { authoritative, lexicalBlocked, applicationDomain, refinableTo } = semanticRules().rolePolicy;
            [authoritative, lexicalBlocked, applicationDomain].forEach((set) => set.forEach((role) => roles.add(role)));
            refinableTo.forEach((targets, role) => [role, ...targets].forEach((name) => roles.add(name)));
            // Then each is a registered role
            expect([...roles].filter((role) => !Object.hasOwn(packagedRoleRegistry().roles, role))).toEqual([]);
        });

        it('keeps the former data-element map', () => {
            // Given data elements the former map routed
            // Then the store routes them to the same roles
            expect(semanticRules().roleByDataElement.get('LAND1')).toBe('country');
            expect(semanticRules().roleByDataElement.get('TELFX')).toBe('phone');
            expect(semanticRules().roleByDataElement.get('SWIFT')).toBe('bic');
            expect(semanticRules().roleByDataElement.size).toBe(82);
        });

        it('routes data elements by their documented meaning', () => {
            // Then a bank name is a bank name, an ISO unit an ISO unit, and a district not a city
            expect(semanticRules().roleByDataElement.get('BANKA')).toBe('bank_name');
            expect(semanticRules().roleByDataElement.get('ISOCD_UNIT')).toBe('unit_of_measure_iso');
            expect(semanticRules().roleByDataElement.get('AD_CITY2')).toBeUndefined();
            expect(semanticRules().roleByDataElement.get('ORT02')).toBeUndefined();
        });

        it('expands only the abbreviations it marks as applied', () => {
            // Then the applied glossary is exactly the abbreviations no rule distinguishes from their word
            expect([...semanticRules().lexicalAbbreviations]).toEqual([
                ['qty', 'quantity'],
                ['cnvrsn', 'conversion'],
                ['dcmls', 'decimals'],
                ['tran', 'transaction'],
                ['waers', 'currency']
            ]);
        });
    });

    describe('parser', () => {
        it.each([
            [
                'an unknown top-level key',
                (doc: Record<string, unknown>) => ({ ...doc, extra: true }),
                /unexpected keys/
            ],
            ['another format version', (doc: Record<string, unknown>) => ({ ...doc, version: 2 }), /unsupported/],
            [
                'a rule with an unknown key',
                (doc: Record<string, unknown>) => ({
                    ...doc,
                    lexicalRules: [{ role: 'email', any: ['email'], typo: 1 }]
                }),
                /unexpected keys: typo/
            ],
            [
                'a rule without conditions',
                (doc: Record<string, unknown>) => ({ ...doc, lexicalRules: [{ role: 'email' }] }),
                /needs all, any or lastWord/
            ],
            [
                'a rule naming an expanded abbreviation',
                (doc: Record<string, unknown>) => ({ ...doc, lexicalRules: [{ role: 'quantity', any: ['qty'] }] }),
                /expanded abbreviation qty/
            ],
            [
                'an unknown primitive type',
                (doc: Record<string, unknown>) => ({
                    ...doc,
                    lexicalRules: [{ role: 'email', any: ['email'], primitiveTypes: ['text'] }]
                }),
                /unknown primitive type/
            ],
            [
                'an upper-case rule word',
                (doc: Record<string, unknown>) => ({ ...doc, lexicalRules: [{ role: 'email', any: ['Email'] }] }),
                /lower-case words/
            ],
            [
                'a repeated data element',
                (doc: Record<string, unknown>) => ({
                    ...doc,
                    dataElements: [
                        { dataElement: 'LAND1', role: 'country', source: 'test' },
                        { dataElement: 'LAND1', role: 'region', source: 'test' }
                    ]
                }),
                /repeat a data element/
            ],
            [
                'a threshold outside 0..1',
                (doc: Record<string, unknown>) => ({
                    ...doc,
                    thresholds: {
                        ...(doc.thresholds as object),
                        route: { value: 1.5, notes: 'test' }
                    }
                }),
                /from 0 to 1/
            ],
            [
                'a lifecycle state missing a role',
                (doc: Record<string, unknown>) => {
                    const groups = doc.vdmFieldGroups as Record<string, Record<string, unknown>>;
                    return {
                        ...doc,
                        vdmFieldGroups: {
                            ...groups,
                            lifecycle: { ...groups.lifecycle, states: [{ available: true }] }
                        }
                    };
                },
                /every lifecycle role a boolean/
            ],
            [
                'a generation range whose maximum is below its minimum',
                (doc: Record<string, unknown>) => ({
                    ...doc,
                    generationRanges: {
                        ...(doc.generationRanges as object),
                        streetNumber: { minimum: 10, maximum: 9 }
                    }
                }),
                /generationRanges\.streetNumber must be an integer range/
            ]
        ])('rejects %s', (_case, mutate, message) => {
            // Given the packaged document with one defect
            const document = mutate(storeDocument());
            // When it is parsed
            // Then the parser names the defect
            expect(() => parseSemanticRuleStore(document)).toThrow(message);
        });

        it('accepts the packaged document', () => {
            // Given the packaged document
            // When it is parsed again
            const store = parseSemanticRuleStore(storeDocument());
            // Then it has the same rules as the loaded store
            expect(store.lexicalRules).toHaveLength(semanticRules().lexicalRules.length);
        });
    });
});

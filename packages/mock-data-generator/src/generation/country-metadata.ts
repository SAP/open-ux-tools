import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../schema/graph.js';
import type { MockDataGeneratorDiagnostic, MockDataRow, SemanticClassification } from '../types.js';
import { semanticPropertyKey } from '../semantics/classifier.js';
import { propertyValueIsValid } from './constraints.js';
import { assignmentIsProtected } from './currency-metadata.js';
import { SAP_V2_SEMANTICS_COUNTRY, SAP_V2_TERM, VOCABULARY_TERM_SUFFIX } from '../spec/odata.js';
import { pushUniqueDiagnostic } from './rows.js';

function isCountryCodeProperty(
    entity: SchemaEntity,
    property: SchemaProperty,
    classifications?: ReadonlyMap<string, SemanticClassification>
): boolean {
    if (classifications?.get(semanticPropertyKey(entity.entitySetName, property.name))?.role === 'country') {
        return true;
    }
    return property.annotations.some(({ term, value }) => {
        const normalizedTerm = term.toLowerCase();
        return (
            (normalizedTerm === SAP_V2_TERM.semantics &&
                typeof value === 'string' &&
                value.toLowerCase() === SAP_V2_SEMANTICS_COUNTRY) ||
            (normalizedTerm.endsWith(VOCABULARY_TERM_SUFFIX.isCountry) && value !== false && value !== 'false')
        );
    });
}

function regionName(names: Intl.DisplayNames, value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }
    const code = value.trim().toUpperCase();
    if (!/^[A-Z]{2}$/u.test(code)) {
        return undefined;
    }
    try {
        return names.of(code);
    } catch (error) {
        // `Intl.DisplayNames.of` rejects a code it does not support with a RangeError.
        if (error instanceof RangeError) {
            return undefined;
        }
        throw error;
    }
}

function countryProperties(
    entity: SchemaEntity,
    classifications?: ReadonlyMap<string, SemanticClassification>
): ReadonlyArray<SchemaProperty> {
    return entity.properties.filter(
        (property) => property.links?.text && isCountryCodeProperty(entity, property, classifications)
    );
}

/**
 * Fill linked country-name companions from their generated country codes.
 *
 * @param graph
 * @param resources
 * @param diagnostics
 * @param locale
 * @param classifications
 */
export function applyCountryMetadata(
    graph: SchemaGraph,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    diagnostics: MockDataGeneratorDiagnostic[],
    locale = 'en',
    classifications?: ReadonlyMap<string, SemanticClassification>
): Readonly<Record<string, ReadonlyArray<MockDataRow>>> {
    const generated = { ...resources };
    const names = new Intl.DisplayNames(locale, { type: 'region', fallback: 'none' });
    for (const entity of graph.entities) {
        const codes = countryProperties(entity, classifications);
        const rows = resources[entity.entitySetName];
        if (codes.length === 0 || !rows) {
            continue;
        }
        const fields = new Map(entity.properties.map((property) => [property.name, property]));
        generated[entity.entitySetName] = rows.map((row) => {
            const updated = { ...row };
            for (const code of codes) {
                const textName = code.links?.text;
                const textField = textName ? fields.get(textName) : undefined;
                if (!textField || assignmentIsProtected(graph, entity, textField)) {
                    continue;
                }
                const countryCode = row[code.name];
                const display = regionName(names, countryCode);
                if (display !== undefined && propertyValueIsValid(textField, display)) {
                    updated[textField.name] = display;
                    continue;
                }
                pushUniqueDiagnostic(diagnostics, {
                    code: 'COUNTRY_METADATA_UNSUPPORTED',
                    severity: 'warning',
                    target: `${entity.entitySetName}.${textField.name}`,
                    message: 'The declared country code-list field cannot be supplied by the format provider.'
                });
            }
            return Object.freeze(updated);
        });
    }
    return Object.freeze(generated);
}

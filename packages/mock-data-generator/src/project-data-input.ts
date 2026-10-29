import { MOCKGEN_ERROR_CODE, MockGenError } from './errors.js';
import { isRecord } from './guards.js';
import { t } from './i18n.js';
import type { GenerateProjectDataInput } from './project-data.js';
import { METADATA_FORMATS } from './schema/parse-metadata.js';
import type { StandaloneGenerationOptions } from './standalone.js';
import type {
    ExistingInitialRows,
    ExistingMockData,
    MockDataGeneratorOptions,
    MockDataRow,
    MockDataServiceIdentity,
    MockDataTarget
} from './types.js';

const ODATA_VERSIONS: ReadonlyArray<MockDataServiceIdentity['odataVersion']> = ['2.0', '4.0'];
const TARGET_KINDS: ReadonlyArray<MockDataTarget['kind']> = ['entity-set', 'singleton'];
const GENERATION_MODES: ReadonlyArray<NonNullable<MockDataGeneratorOptions['mode']>> = [
    'auto',
    'deterministic',
    'learned'
];
// Keyed by every generation option, so adding an option to the type without listing it fails to compile.
const OPTION_NAMES: ReadonlySet<string> = new Set(
    Object.keys({
        sampleDataset: true,
        syntheticScenario: true,
        rowsPerEntity: true,
        seed: true,
        locale: true,
        mode: true,
        sftTimeoutMs: true,
        sftBudgetMs: true,
        sftModelRows: true,
        sftPriorityTargets: true,
        sftDeadlineMs: true,
        referenceDate: true,
        windowYears: true
    } satisfies Record<keyof MockDataGeneratorOptions, true>)
);

/** What a value failed to be, by the translation key of its message. */
type Expectation =
    | 'mustBeString'
    | 'mustBeObject'
    | 'mustBeList'
    | 'mustBeBoolean'
    | 'mustBeOneOf'
    | 'unsupportedOption'
    | 'signalNotAllowed';

/**
 * Throw the validation error for one JSON path.
 *
 * @param path JSON path of the invalid value
 * @param expectation what the value must be
 * @param values the accepted values, for `mustBeOneOf`
 * @throws {MockGenError} always, with code `REQUEST_INVALID`
 */
function fail(path: string, expectation: Expectation, values?: ReadonlyArray<string>): never {
    throw new MockGenError(
        MOCKGEN_ERROR_CODE.REQUEST_INVALID,
        t(`request.${expectation}`, { path, values: values?.join(', ') })
    );
}

/**
 * @param value value to check
 * @param path JSON path of the value
 * @returns the value as a string
 */
function requiredString(value: unknown, path: string): string {
    return typeof value === 'string' ? value : fail(path, 'mustBeString');
}

/**
 * @param value value to check
 * @param path JSON path of the value
 * @returns the value as an object
 */
function requiredRecord(value: unknown, path: string): Record<string, unknown> {
    return isRecord(value) ? value : fail(path, 'mustBeObject');
}

/**
 * @param value value to check
 * @param allowed accepted values
 * @param path JSON path of the value
 * @returns the value narrowed to the accepted values
 */
function oneOf<T extends string>(value: unknown, allowed: ReadonlyArray<T>, path: string): T {
    const match = allowed.find((candidate) => candidate === value);
    return match ?? fail(path, 'mustBeOneOf', allowed);
}

/**
 * @param value the request.service value
 * @returns the validated service identity
 */
function parseService(value: unknown): MockDataServiceIdentity {
    const service = requiredRecord(value, 'request.service');
    if (service.alias !== undefined && typeof service.alias !== 'string') {
        fail('request.service.alias', 'mustBeString');
    }
    return {
        urlPath: requiredString(service.urlPath, 'request.service.urlPath'),
        ...(service.alias === undefined ? {} : { alias: service.alias }),
        odataVersion: oneOf(service.odataVersion, ODATA_VERSIONS, 'request.service.odataVersion')
    };
}

/**
 * @param value the request.targets value
 * @returns the validated targets
 */
function parseTargets(value: unknown): ReadonlyArray<MockDataTarget> {
    if (!Array.isArray(value)) {
        return fail('request.targets', 'mustBeList');
    }
    return value.map((entry: unknown, index) => {
        const target = requiredRecord(entry, `request.targets[${index}]`);
        return {
            name: requiredString(target.name, `request.targets[${index}].name`),
            kind: oneOf(target.kind, TARGET_KINDS, `request.targets[${index}].kind`)
        };
    });
}

/**
 * @param value value to check
 * @param path JSON path of the value
 * @returns the value as a boolean
 */
function requiredBoolean(value: unknown, path: string): boolean {
    return typeof value === 'boolean' ? value : fail(path, 'mustBeBoolean');
}

/**
 * @param value rows supplied for one entity set
 * @param path JSON path of the rows
 * @returns the rows, each checked to be an object
 */
function parseRows(value: unknown, path: string): ReadonlyArray<MockDataRow> {
    if (!Array.isArray(value)) {
        return fail(path, 'mustBeList');
    }
    // Row values are JSON from the parsed file; each row is checked to be an object, and its fields are
    // checked against the schema by the generator.
    return value.map((row: unknown, index) => requiredRecord(row, `${path}[${index}]`) as MockDataRow);
}

/**
 * @param value the initialRows value of one entity set
 * @param path JSON path of the value
 * @returns the validated initial rows
 */
function parseInitialRows(value: unknown, path: string): ExistingInitialRows {
    const initialRows = requiredRecord(value, path);
    switch (initialRows.source) {
        case 'none':
            return { source: 'none', present: false };
        case 'json':
            return { source: 'json', present: true, rows: parseRows(initialRows.rows, `${path}.rows`) };
        case 'contributor':
            return requiredBoolean(initialRows.enumerable, `${path}.enumerable`)
                ? {
                      source: 'contributor',
                      present: true,
                      enumerable: true,
                      rows: parseRows(initialRows.rows, `${path}.rows`)
                  }
                : { source: 'contributor', present: true, enumerable: false };
        default:
            return fail(`${path}.source`, 'mustBeOneOf', ['none', 'json', 'contributor']);
    }
}

/**
 * @param value the request.existingData value
 * @returns the validated existing data by entity set
 */
function parseExistingData(value: unknown): Readonly<Record<string, ExistingMockData>> {
    const existingData = requiredRecord(value, 'request.existingData');
    return Object.fromEntries(
        Object.entries(existingData).map(([name, entry]) => {
            const path = `request.existingData.${name}`;
            const existing = requiredRecord(entry, path);
            const contributor = requiredRecord(existing.contributor, `${path}.contributor`);
            return [
                name,
                {
                    contributor: requiredBoolean(contributor.present, `${path}.contributor.present`)
                        ? {
                              present: true,
                              hasInitialData: requiredBoolean(
                                  contributor.hasInitialData,
                                  `${path}.contributor.hasInitialData`
                              )
                          }
                        : { present: false },
                    initialRows: parseInitialRows(existing.initialRows, `${path}.initialRows`)
                } satisfies ExistingMockData
            ];
        })
    );
}

/**
 * @param value the options value
 * @returns the options, with names, mode and locale checked
 */
function parseOptions(value: unknown): StandaloneGenerationOptions {
    const options = requiredRecord(value, 'options');
    const unknownName = Object.keys(options).find((name) => !OPTION_NAMES.has(name));
    if (unknownName !== undefined) {
        fail(`options.${unknownName}`, 'unsupportedOption');
    }
    if (options.mode !== undefined) {
        oneOf(options.mode, GENERATION_MODES, 'options.mode');
    }
    if (options.locale !== undefined) {
        requiredString(options.locale, 'options.locale');
    }
    // Only the option names, mode and locale are checked here: numeric bounds, the sample dataset and the
    // synthetic scenario are validated by the generator before use, so the remaining values pass through.
    return options as StandaloneGenerationOptions;
}

/**
 * Validate an untrusted request document (for example the CLI's request.json) and return it typed.
 * Option values that the generator validates itself (numeric bounds, datasets, scenarios) pass through unchanged.
 * An abort signal cannot be expressed in JSON, so a supplied `request.signal` is rejected.
 *
 * @param value the parsed JSON document
 * @returns the validated project data input
 * @throws {MockGenError} with code `REQUEST_INVALID`, naming the JSON path of the first invalid value
 * @example
 * const input = parseGenerateProjectDataInput(JSON.parse(await readFile('request.json', 'utf8')));
 */
export function parseGenerateProjectDataInput(value: unknown): GenerateProjectDataInput {
    if (!isRecord(value)) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.REQUEST_INVALID, t('request.documentNotObject'));
    }
    const request = requiredRecord(value.request, 'request');
    if (request.signal !== undefined) {
        fail('request.signal', 'signalNotAllowed');
    }
    const metadata = requiredRecord(request.metadata, 'request.metadata');
    return {
        projectRoot: requiredString(value.projectRoot, 'projectRoot'),
        dataDirectory: requiredString(value.dataDirectory, 'dataDirectory'),
        request: {
            metadata: {
                format: oneOf(metadata.format, METADATA_FORMATS, 'request.metadata.format'),
                content: requiredString(metadata.content, 'request.metadata.content')
            },
            service: parseService(request.service),
            targets: parseTargets(request.targets),
            existingData: parseExistingData(request.existingData)
        },
        ...(value.options === undefined ? {} : { options: parseOptions(value.options) }),
        ...(value.resourceRoot === undefined
            ? {}
            : { resourceRoot: requiredString(value.resourceRoot, 'resourceRoot') })
    };
}

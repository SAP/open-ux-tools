import { createHash } from 'node:crypto';
import type { JsonValue, SftFieldRequest, SftGenerationInput, SftGenerator } from '../types.js';

export type JsonValueKind = 'string' | 'number' | 'boolean';

export interface SftGrammarField {
    name: string;
    valueKind: JsonValueKind;
    nullable: boolean;
    maxLength?: number;
    /**
     * Type-exact number format. When set, a number takes no exponent, `integer` numbers take digits
     * only, and the digit counts and range below bound the value; when absent, any JSON number is
     * accepted.
     */
    numberFormat?: SftNumberFormat;
    /**
     * Within this many characters of `maxLength`, the string may finish its current word but not
     * start another one it would have to cut off. 0 or absent disables the steering.
     */
    steerWithin?: number;
}

export interface SftNumberFormat {
    integer: boolean;
    /** Digits before the decimal point. */
    maxIntegerDigits: number;
    /** Digits after the decimal point; 0 for integers. */
    maxFractionDigits: number;
    minimum?: number;
    maximum?: number;
}

/**
 * JSON punctuation the runtime enforces outside strings: `any` whitespace (legacy), `compact`
 * (`{"A":"x","B":1}`) or `spaced` (`{"A": "x", "B": 1}`, the separators of the training rows).
 */
export type JsonSeparators = 'any' | 'compact' | 'spaced';

export interface ConstrainedTextGenerationInput {
    prompt: string;
    grammar: ReadonlyArray<SftGrammarField>;
    seed: number;
    temperature: number;
    topP: number;
    repetitionPenalty: number;
    noRepeatNgramSize: number;
    maxNewTokens: number;
    /** JSON punctuation enforced outside strings; `any` when absent. */
    separators?: JsonSeparators;
}

export interface ConstrainedTextGenerator {
    generate(input: ConstrainedTextGenerationInput, signal: AbortSignal): Promise<string>;
    /**
     * One completion of the same prompt per seed, decoded together. A row that does not complete
     * within `maxNewTokens`, or before `signal` aborts, is undefined; cancellation returns the rows
     * completed so far instead of throwing.
     */
    generateBatch?(
        input: ConstrainedTextGenerationInput,
        seeds: ReadonlyArray<number>,
        signal: AbortSignal
    ): Promise<ReadonlyArray<string | undefined>>;
    dispose?(): Promise<void> | void;
}

export interface PilotSamplingOptions {
    temperature: number;
    topP: number;
    repetitionPenalty: number;
    noRepeatNgramSize: number;
    maxNewTokens: number;
}

export interface CreatePilotSftGeneratorOptions {
    fingerprint: string;
    textGenerator: ConstrainedTextGenerator;
    sampling: PilotSamplingOptions;
    budgetMs?: number;
    maxFieldsPerPrompt?: number;
    /** Prompt format supported by the model artifact, independently of the planner contract. */
    promptContractVersion?: 1 | 2;
    /**
     * How the runtime calls the model (see `RUNTIME_CONTRACT_2`). 1, the default, is the original
     * contract: free whitespace, any JSON number, one call with every field under the semantic
     * planner, rows decoded one at a time, and only complete rows returned.
     */
    runtimeContract?: 1 | 2;
    /** Contract 2 only: punctuation outside strings; `spaced` when absent. */
    separators?: Exclude<JsonSeparators, 'any'>;
    /**
     * Contract 2 only: completed answers by request, so an identical request (same model, prompt,
     * grammar, sampling and seed) returns the same values without running the model again. No
     * answers are kept when absent.
     */
    completionStore?: SftCompletionStore;
}

/** Completed model answers keyed by a hash of everything that determines them. */
export interface SftCompletionStore {
    get(key: string): string | undefined;
    set(key: string, completion: string): void;
}

/**
 * A bounded in-memory completion store; the oldest entries leave first.
 *
 * @param maximumEntries entries kept
 * @returns the store
 */
export function createMemoryCompletionStore(maximumEntries = 20_000): SftCompletionStore {
    const entries = new Map<string, string>();
    return Object.freeze({
        get: (key: string) => entries.get(key),
        set: (key: string, completion: string) => {
            entries.delete(key);
            entries.set(key, completion);
            if (entries.size > maximumEntries) {
                const oldest = entries.keys().next();
                if (!oldest.done) {
                    entries.delete(oldest.value);
                }
            }
        }
    });
}

const PROCESS_COMPLETION_STORE = createMemoryCompletionStore();

/**
 * The completion store shared by the generators of this process: a regeneration of the same service
 * gets the answers it already received, and its budget goes to the requests it has not seen.
 *
 * @returns the process-wide store
 */
export function processCompletionStore(): SftCompletionStore {
    return PROCESS_COMPLETION_STORE;
}

/**
 * Runtime contract 2, measured as parts of performance plan v2 (P1):
 * - canonical separators, fed by the runtime instead of sampled;
 * - type-exact numbers: integers take digits only within their type's range, decimals at most
 *   their precision and scale, no exponent;
 * - near a string's maximum length the model may finish a word but not start one;
 * - under the semantic planner, at most `maxFieldsPerPrompt` (default 8) fields per call, coupled
 *   fields kept in one call, and the token bound derived from the grammar;
 * - all rows of a call that share one prompt are decoded together;
 * - rows are returned with the fields that completed, for per-field acceptance by the caller.
 */
export const RUNTIME_CONTRACT_2_MAX_FIELDS_PER_CALL = 8;
// Within this many characters of the maximum length a string stops starting words (at most a
// quarter of the length, so short codes are unaffected).
const MAXIMUM_STEERING_CHARACTERS = 8;
const DEFAULT_DECIMAL_INTEGER_DIGITS = 15;
const DEFAULT_DECIMAL_FRACTION_DIGITS = 6;
const MAXIMUM_SAFE_INTEGER_DIGITS = 15;

const SYSTEM_PROMPT =
    'You generate realistic, internally consistent SAP business mock data as JSON. ' +
    'Output ONLY a JSON array of row objects. No markdown, no commentary, no code fences. ' +
    'Every object must have exactly the requested keys. Respect stated max lengths, ' +
    'value-help targets (values should look like they belong to the referenced entity), ' +
    'and foreign-key targets. Use plausible English business text (company names, ' +
    'person names, cities, descriptions) - never placeholder text, never random characters.';

const EXAMPLE_ROW: Readonly<Record<string, string | number>> = Object.freeze({
    WidgetID: 'W-1042',
    WidgetName: 'Northgate Assembly Kit',
    ManufacturerCity: 'Stuttgart',
    UnitPrice: 128.5,
    CreatedAt: '2026-03-11T00:00:00'
});

function fieldDescription(field: SftFieldRequest): string {
    const parts = [`${field.name}: ${field.primitiveType}`];
    if (field.isKey) {
        parts.push('[PRIMARY KEY]');
    }
    if (!field.nullable) {
        parts.push('[required]');
    }
    const declaredMaxLength = field.declaredMaxLength ?? field.maxLength;
    if (declaredMaxLength !== undefined) {
        parts.push(`maxLength=${declaredMaxLength}`);
    }
    if (field.precision !== undefined) {
        parts.push(`precision=${field.precision}`);
    }
    if (field.scale !== undefined) {
        parts.push(`scale=${field.scale}`);
    }
    if (field.label) {
        parts.push(`label=${JSON.stringify(field.label)}`);
    }
    if (field.semanticRole && field.semanticRole !== 'unknown') {
        parts.push(`semantics=${field.semanticRole}`);
    }
    if (field.description && field.description !== field.name) {
        parts.push(`guidance=${JSON.stringify(field.description)}`);
    }
    if (field.allowedDomain?.length) {
        parts.push(`enum=${JSON.stringify(field.allowedDomain)}`);
    }
    if (field.currencyOrUnitField) {
        parts.push(`currency/unit-code-field=${field.currencyOrUnitField}`);
    }
    for (const target of field.valueHelpTargets ?? []) {
        parts.push(`value-help-target=${target}`);
    }
    for (const target of field.foreignKeyTargets ?? []) {
        parts.push(`FK-target=${target}`);
    }
    for (const source of field.referencedBy ?? []) {
        parts.push(`referenced-by=${source}`);
    }
    return parts.join(', ');
}

function semanticFieldDescription(field: SftFieldRequest): string {
    const parts = [fieldDescription(field)];
    if (field.semanticRole && field.semanticRole !== 'unknown') {
        parts.push(`acceptedRole=${field.semanticRole}`);
    }
    if (field.allowedDomain && field.allowedDomain.length > 0) {
        parts.push(`allowedDomain=${JSON.stringify(field.allowedDomain)}`);
    }
    return parts.join(', ');
}

function fixedRowContext(
    row: Readonly<Record<string, JsonValue>> | undefined,
    fields: ReadonlyArray<SftFieldRequest>
): Readonly<Record<string, JsonValue>> {
    const requestedFields = new Set(fields.map(({ name }) => name));
    return Object.freeze(Object.fromEntries(Object.entries(row ?? {}).filter(([name]) => !requestedFields.has(name))));
}

/**
 * Render the row-completion prompt contract used by the successful pilot SFT model.
 *
 * @param input
 */
export function renderPilotSftPrompt(input: SftGenerationInput): string {
    const names = input.fields.map(({ name }) => name);
    const example = Object.fromEntries(Object.entries(EXAMPLE_ROW).slice(0, Math.min(5, names.length)));
    const entityName = input.entityName.replace(/Type$/, '');
    if (input.contractVersion === 2) {
        const fixedRow = fixedRowContext(input.fixedRows?.[0], input.fields);
        const userPrompt =
            `Entity: ${entityName}\n` +
            `Locale: ${input.locale ?? 'en'}\n` +
            `Generate 1 realistic row for this service entity.\n` +
            'Fields:\n' +
            input.fields.map((field) => `- ${semanticFieldDescription(field)}`).join('\n') +
            '\n\nExample of the kind of concrete, filled-in values expected (different entity, ' +
            'shown only to demonstrate the JSON shape and level of detail):\n' +
            `${JSON.stringify(example)}\n\n` +
            `Sibling group: ${input.siblingGroup ?? 'narrative'}\n` +
            `Fixed row: ${JSON.stringify(fixedRow)}\n` +
            `Accepted roles: ${JSON.stringify(input.acceptedRoles ?? {})}\n` +
            'Now return a JSON array of exactly 1 filled-in object (no "..." placeholders, ' +
            `no comments) with keys: ${names.join(', ')}`;
        return (
            `<|im_start|>system\n${SYSTEM_PROMPT}<|im_end|>\n` +
            `<|im_start|>user\n${userPrompt}<|im_end|>\n` +
            '<|im_start|>assistant\n'
        );
    }
    const userPrompt =
        `Entity: ${entityName}\n` +
        'Generate 1 realistic row for this service entity.\n' +
        'Fields:\n' +
        input.fields.map((field) => `- ${fieldDescription(field)}`).join('\n') +
        '\n\nExample of the kind of concrete, filled-in values expected (different entity, ' +
        'shown only to demonstrate the JSON shape and level of detail):\n' +
        `${JSON.stringify(example)}\n\n` +
        'Now return a JSON array of exactly 1 filled-in objects (no "..." placeholders, ' +
        `no comments) with keys: ${names.join(', ')}`;
    return (
        `<|im_start|>system\n${SYSTEM_PROMPT}<|im_end|>\n` +
        `<|im_start|>user\n${userPrompt}<|im_end|>\n` +
        '<|im_start|>assistant\n'
    );
}

/**
 * The type-exact number format of an integer or decimal field.
 *
 * @param field requested field
 * @returns number format, or undefined for non-numeric fields
 */
export function numberFormatOf(field: SftFieldRequest): SftNumberFormat | undefined {
    if (field.primitiveType === 'int') {
        const bound = Math.max(Math.abs(field.minimum ?? 0), Math.abs(field.maximum ?? 0));
        return Object.freeze({
            integer: true,
            maxIntegerDigits:
                bound > 0
                    ? Math.min(MAXIMUM_SAFE_INTEGER_DIGITS, String(Math.trunc(bound)).length)
                    : MAXIMUM_SAFE_INTEGER_DIGITS,
            maxFractionDigits: 0,
            ...(field.minimum === undefined ? {} : { minimum: field.minimum }),
            ...(field.maximum === undefined ? {} : { maximum: field.maximum })
        });
    }
    if (field.primitiveType !== 'decimal') {
        return undefined;
    }
    const scale = field.scale ?? DEFAULT_DECIMAL_FRACTION_DIGITS;
    const integerDigits =
        field.precision === undefined ? DEFAULT_DECIMAL_INTEGER_DIGITS : field.precision - (field.scale ?? 0);
    if (integerDigits <= 0) {
        // Every digit is a fraction digit: the integer part is 0.
        return Object.freeze({
            integer: false,
            maxIntegerDigits: 1,
            maxFractionDigits: scale,
            maximum: 1 - 10 ** -Math.max(1, scale)
        });
    }
    return Object.freeze({
        integer: false,
        maxIntegerDigits: Math.min(MAXIMUM_SAFE_INTEGER_DIGITS, integerDigits),
        maxFractionDigits: scale
    });
}

/**
 * The grammar of one call's fields.
 *
 * @param fields requested fields, in prompt order
 * @param exact contract 2: type-exact numbers and length steering
 * @returns grammar fields
 */
export function grammarFields(fields: ReadonlyArray<SftFieldRequest>, exact: boolean): ReadonlyArray<SftGrammarField> {
    return Object.freeze(
        fields.map((field) => {
            const numberFormat = exact ? numberFormatOf(field) : undefined;
            const steerWithin =
                exact && field.maxLength !== undefined
                    ? Math.min(MAXIMUM_STEERING_CHARACTERS, Math.floor(field.maxLength / 4))
                    : 0;
            return Object.freeze({
                name: field.name,
                valueKind: valueKind(field),
                nullable: field.nullable,
                ...(field.maxLength === undefined ? {} : { maxLength: field.maxLength }),
                ...(numberFormat ? { numberFormat } : {}),
                ...(steerWithin > 0 ? { steerWithin } : {})
            });
        })
    );
}

/**
 * An upper bound on the tokens of a completion under a grammar: every token carries at least one
 * character, so the longest text the grammar admits bounds the tokens. Escapes count two characters.
 *
 * @param grammar the call's grammar fields
 * @returns token bound
 */
export function grammarTokenBound(grammar: ReadonlyArray<SftGrammarField>): number {
    let characters = 2;
    for (const field of grammar) {
        // `"Name": ` plus `, ` between fields.
        characters += field.name.length + 6;
        if (field.valueKind === 'string') {
            characters += 2 + 2 * (field.maxLength ?? 80);
        } else if (field.numberFormat) {
            characters += 2 + field.numberFormat.maxIntegerDigits + field.numberFormat.maxFractionDigits;
        } else {
            characters += 24;
        }
    }
    return characters;
}

function valueKind(field: SftFieldRequest): JsonValueKind {
    if (field.primitiveType === 'int' || field.primitiveType === 'decimal') {
        return 'number';
    }
    if (field.primitiveType === 'bool') {
        return 'boolean';
    }
    return 'string';
}

function rowSeed(seed: number, entityName: string, rowIndex: number, chunkKey: string): number {
    return createHash('sha256').update(`${seed}:${entityName}:${rowIndex}:${chunkKey}`).digest().readUInt32BE(0);
}

/**
 * Split fields into calls of at most `maximum` fields, in field order, keeping each coupled group in
 * one call (a group larger than `maximum` is a call of its own).
 *
 * @param fields requested fields
 * @param maximum fields per call
 * @param groups coupled field names
 * @returns calls, each a list of fields
 */
export function chunkFields(
    fields: ReadonlyArray<SftFieldRequest>,
    maximum: number,
    groups: ReadonlyArray<ReadonlyArray<string>> = []
): ReadonlyArray<ReadonlyArray<SftFieldRequest>> {
    const groupOf = new Map<string, number>();
    groups.forEach((group, index) => group.forEach((name) => groupOf.set(name, index)));
    const units: SftFieldRequest[][] = [];
    const emitted = new Set<number>();
    for (const field of fields) {
        const group = groupOf.get(field.name);
        if (group === undefined) {
            units.push([field]);
        } else if (!emitted.has(group)) {
            emitted.add(group);
            units.push(fields.filter(({ name }) => groupOf.get(name) === group));
        }
    }
    const chunks: ReadonlyArray<SftFieldRequest>[] = [];
    let current: SftFieldRequest[] = [];
    for (const unit of units) {
        if (current.length > 0 && current.length + unit.length > maximum) {
            chunks.push(Object.freeze(current));
            current = [];
        }
        current.push(...unit);
    }
    if (current.length > 0) {
        chunks.push(Object.freeze(current));
    }
    return Object.freeze(chunks);
}

function firstJsonObject(text: string): Record<string, JsonValue> {
    const start = text.indexOf('{');
    if (start < 0) {
        throw new TypeError('SFT completion does not contain a JSON object');
    }
    let depth = 0;
    let quoted = false;
    let escaped = false;
    for (let index = start; index < text.length; index += 1) {
        const character = text[index];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (quoted && character === '\\') {
            escaped = true;
            continue;
        }
        if (character === '"') {
            quoted = !quoted;
            continue;
        }
        if (quoted) {
            continue;
        }
        if (character === '{') {
            depth += 1;
        }
        if (character === '}') {
            depth -= 1;
            if (depth === 0) {
                const parsed: unknown = JSON.parse(text.slice(start, index + 1));
                if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
                    throw new TypeError('SFT completion row must be an object');
                }
                return parsed as Record<string, JsonValue>;
            }
        }
    }
    throw new TypeError('SFT completion contains an unterminated JSON object');
}

function abortContext(parent: AbortSignal, budgetMs: number): { signal: AbortSignal; dispose(): void } {
    const controller = new AbortController();
    const abortFromParent = (): void => controller.abort(parent.reason);
    parent.addEventListener('abort', abortFromParent, { once: true });
    if (parent.aborted) {
        abortFromParent();
    }
    const timer = setTimeout(() => controller.abort(new Error('SFT generation timed out')), budgetMs);
    timer.unref();
    return {
        signal: controller.signal,
        dispose: (): void => {
            clearTimeout(timer);
            parent.removeEventListener('abort', abortFromParent);
        }
    };
}

async function abortable<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
    if (signal.aborted) {
        return Promise.reject(signal.reason);
    }
    return new Promise<T>((resolve, reject) => {
        const abort = (): void => reject(signal.reason);
        signal.addEventListener('abort', abort, { once: true });
        operation
            .then(resolve, reject)
            .finally(() => signal.removeEventListener('abort', abort))
            .catch(reject);
    });
}

function canSplitIncompleteCompletion(error: unknown, signal: AbortSignal): boolean {
    if (signal.aborted || !(error instanceof Error)) {
        return false;
    }
    return (
        error instanceof SyntaxError ||
        error.message.startsWith('SFT completion ') ||
        error.message === 'SFT generation ended before completing its JSON object'
    );
}

/**
 * Adapt a grammar-constrained causal text backend to the package's SFT row interface.
 *
 * @param options
 */
export function createPilotSftGenerator(options: CreatePilotSftGeneratorOptions): SftGenerator {
    const budgetMs = options.budgetMs ?? 90_000;
    const promptContractVersion = options.promptContractVersion ?? 1;
    const runtimeContract = options.runtimeContract ?? 1;
    if (promptContractVersion !== 1 && promptContractVersion !== 2) {
        throw new TypeError('SFT prompt contract version must be 1 or 2');
    }
    if (runtimeContract !== 1 && runtimeContract !== 2) {
        throw new TypeError('SFT runtime contract must be 1 or 2');
    }
    if (!Number.isFinite(budgetMs) || budgetMs <= 0) {
        throw new TypeError('SFT budget must be positive');
    }
    if (
        options.maxFieldsPerPrompt !== undefined &&
        (!Number.isSafeInteger(options.maxFieldsPerPrompt) || options.maxFieldsPerPrompt <= 0)
    ) {
        throw new TypeError('SFT maximum fields per prompt must be a positive integer');
    }
    const exact = runtimeContract === 2;
    const separators: JsonSeparators = exact ? (options.separators ?? 'spaced') : 'any';
    const store = exact ? options.completionStore : undefined;
    const completionKey = (request: ConstrainedTextGenerationInput, seed: number): string =>
        createHash('sha256')
            .update(
                JSON.stringify([
                    options.fingerprint,
                    request.prompt,
                    request.grammar,
                    request.temperature,
                    request.topP,
                    request.repetitionPenalty,
                    request.noRepeatNgramSize,
                    request.maxNewTokens,
                    request.separators ?? 'any',
                    seed
                ])
            )
            .digest('hex');
    return Object.freeze({
        fingerprint: options.fingerprint,
        generate: async (input: SftGenerationInput, signal: AbortSignal) => {
            const requestBudgetMs = input.budgetMs ?? budgetMs;
            if (!Number.isFinite(requestBudgetMs) || requestBudgetMs <= 0) {
                throw new TypeError('SFT request budget must be positive');
            }
            const context = abortContext(signal, Math.min(budgetMs, requestBudgetMs));
            let maxFieldsPerPrompt: number;
            if (input.contractVersion !== 2) {
                maxFieldsPerPrompt = options.maxFieldsPerPrompt ?? (input.fields.length >= 100 ? 8 : 3);
            } else if (exact) {
                maxFieldsPerPrompt = options.maxFieldsPerPrompt ?? RUNTIME_CONTRACT_2_MAX_FIELDS_PER_CALL;
            } else {
                maxFieldsPerPrompt = Math.max(1, input.fields.length);
            }
            const fieldChunks = chunkFields(
                input.fields,
                maxFieldsPerPrompt,
                exact ? (input.coupledFieldGroups ?? []) : []
            );
            const rows: Array<Record<string, JsonValue>> = Array.from({ length: input.rowCount }, () => ({}));
            let attempts = 0;
            let parsedResponses = 0;
            const promptFor = (fields: ReadonlyArray<SftFieldRequest>, rowIndex: number): string => {
                const fixedRow = input.fixedRows?.[rowIndex];
                return renderPilotSftPrompt({
                    ...input,
                    contractVersion: promptContractVersion,
                    fields,
                    ...(fixedRow === undefined ? {} : { fixedRows: [fixedRow] })
                });
            };
            const generationInput = (
                fields: ReadonlyArray<SftFieldRequest>,
                prompt: string,
                seed: number
            ): ConstrainedTextGenerationInput => {
                const grammar = grammarFields(fields, exact);
                return Object.freeze({
                    prompt,
                    grammar,
                    seed,
                    ...options.sampling,
                    ...(exact ? { maxNewTokens: grammarTokenBound(grammar), separators } : {})
                });
            };
            const parse = (completion: string, fields: ReadonlyArray<SftFieldRequest>): Record<string, JsonValue> => {
                const partial = firstJsonObject(completion);
                if (JSON.stringify(Object.keys(partial)) !== JSON.stringify(fields.map(({ name }) => name))) {
                    throw new TypeError('SFT completion keys do not match the requested grammar');
                }
                return partial;
            };
            const generateFields = async (
                fields: ReadonlyArray<SftFieldRequest>,
                rowIndex: number,
                chunkKey: string
            ): Promise<Record<string, JsonValue>> => {
                context.signal.throwIfAborted();
                attempts += 1;
                try {
                    const request = generationInput(
                        fields,
                        promptFor(fields, rowIndex),
                        rowSeed(input.seed, input.entityName, rowIndex, chunkKey)
                    );
                    const key = store ? completionKey(request, request.seed) : undefined;
                    const completion =
                        (key === undefined ? undefined : store?.get(key)) ??
                        (await abortable(options.textGenerator.generate(request, context.signal), context.signal));
                    const partial = parse(completion, fields);
                    if (key !== undefined) {
                        store?.set(key, completion);
                    }
                    parsedResponses += 1;
                    return partial;
                } catch (error) {
                    if (
                        input.contractVersion !== 2 &&
                        fields.length > 1 &&
                        canSplitIncompleteCompletion(error, context.signal)
                    ) {
                        const middle = Math.ceil(fields.length / 2);
                        const left = await generateFields(fields.slice(0, middle), rowIndex, `${chunkKey}.0`);
                        const right = await generateFields(fields.slice(middle), rowIndex, `${chunkKey}.1`);
                        return Object.freeze({ ...left, ...right });
                    }
                    throw error;
                }
            };
            // Rows share one prompt when no per-row context is rendered; they are then decoded together.
            const batchable = (fields: ReadonlyArray<SftFieldRequest>): boolean =>
                exact &&
                options.textGenerator.generateBatch !== undefined &&
                input.rowCount > 1 &&
                Array.from({ length: input.rowCount }, (_unused, rowIndex) => promptFor(fields, rowIndex)).every(
                    (prompt, _index, all) => prompt === all[0]
                );
            const generateBatch = async (fields: ReadonlyArray<SftFieldRequest>, chunkKey: string): Promise<void> => {
                const generateRows = options.textGenerator.generateBatch;
                if (!generateRows) {
                    throw new TypeError('SFT text generator does not decode rows together');
                }
                context.signal.throwIfAborted();
                const seeds = Array.from({ length: input.rowCount }, (_unused, rowIndex) =>
                    rowSeed(input.seed, input.entityName, rowIndex, chunkKey)
                );
                attempts += input.rowCount;
                const request = generationInput(fields, promptFor(fields, 0), seeds[0] ?? input.seed);
                const keys = seeds.map((seed) => completionKey(request, seed));
                const completions: Array<string | undefined> = keys.map((key) => store?.get(key));
                // Only the rows without a stored answer run through the model.
                const missing = completions.flatMap((completion, rowIndex) =>
                    completion === undefined ? [rowIndex] : []
                );
                if (missing.length > 0) {
                    const generatedRows = await generateRows.call(
                        options.textGenerator,
                        request,
                        missing.map((rowIndex) => seeds[rowIndex] ?? input.seed),
                        context.signal
                    );
                    missing.forEach((rowIndex, position) => {
                        completions[rowIndex] = generatedRows[position];
                    });
                }
                completions.forEach((completion, rowIndex) => {
                    if (completion === undefined) {
                        return;
                    }
                    try {
                        const partial = parse(completion, fields);
                        store?.set(keys[rowIndex] ?? '', completion);
                        parsedResponses += 1;
                        Object.assign(rows[rowIndex] ?? {}, partial);
                    } catch {
                        // An unparseable row keeps its fallback values; the others are kept.
                    }
                });
            };
            try {
                for (const [chunkIndex, fields] of fieldChunks.entries()) {
                    if (batchable(fields)) {
                        try {
                            await generateBatch(fields, String(chunkIndex));
                        } catch (error) {
                            signal.throwIfAborted();
                            if (!context.signal.aborted) {
                                throw error;
                            }
                        }
                        if (context.signal.aborted) {
                            break;
                        }
                        continue;
                    }
                    for (let rowIndex = 0; rowIndex < input.rowCount; rowIndex += 1) {
                        try {
                            const partial = await generateFields(fields, rowIndex, String(chunkIndex));
                            const row = rows[rowIndex];
                            if (!row) {
                                throw new RangeError('SFT row index is outside its established bounds');
                            }
                            Object.assign(row, partial);
                        } catch (error) {
                            signal.throwIfAborted();
                            if (context.signal.aborted) {
                                break;
                            }
                            if (input.contractVersion === 2 && canSplitIncompleteCompletion(error, context.signal)) {
                                continue;
                            }
                            const reason = error instanceof Error ? error.message : String(error);
                            const failure = new Error(
                                `SFT generation failed for row ${rowIndex + 1}, chunk ${chunkIndex + 1}/${fieldChunks.length}: ${reason}`,
                                { cause: error }
                            );
                            if (typeof error === 'object' && error !== null && 'code' in error) {
                                const code = Reflect.get(error, 'code') as unknown;
                                if (typeof code === 'string') {
                                    Object.assign(failure, { code });
                                }
                            }
                            throw failure;
                        }
                    }
                    if (context.signal.aborted) {
                        break;
                    }
                }
                signal.throwIfAborted();
                return Object.freeze({
                    rows: Object.freeze(
                        rows.map((row) =>
                            Object.freeze(
                                // Contract 2 returns the fields that completed; the caller accepts them one by one.
                                exact ||
                                    input.fields.every(({ name }) => Object.prototype.hasOwnProperty.call(row, name))
                                    ? row
                                    : {}
                            )
                        )
                    ),
                    statistics: Object.freeze({ attempts, parsedResponses })
                });
            } finally {
                context.dispose();
            }
        },
        dispose: async () => {
            await options.textGenerator.dispose?.();
        }
    });
}

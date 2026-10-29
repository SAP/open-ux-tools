import type { JsonValue, SftFieldRequest, SftGenerationInput, SftGenerationOutput, SftGenerator } from '../types.js';
import { rememberLatest } from './bounded-entries.js';
import {
    DEFAULT_COMPLETION_STORE_ENTRIES,
    DEFAULT_SFT_ENTITY_TIMEOUT_MS,
    DEFAULT_SFT_FIELDS_PER_CALL,
    SFT_BATCH_ROWS
} from '../limits.js';
import { sha256, sha256Uint32 } from '../hash.js';
import { errnoCode, errorMessage, isRecord } from '../guards.js';
import { assertKeys, nonEmptyString, objectRecord } from '../semantics/strict-json.js';

type JsonValueKind = 'string' | 'number' | 'boolean';

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
 * JSON punctuation the runtime enforces outside strings: `compact` (`{"A":"x","B":1}`) or `spaced`
 * (`{"A": "x", "B": 1}`, the separators of the training rows).
 */
export type JsonSeparators = 'compact' | 'spaced';

export interface ConstrainedTextGenerationInput {
    prompt: string;
    grammar: ReadonlyArray<SftGrammarField>;
    seed: number;
    temperature: number;
    topP: number;
    repetitionPenalty: number;
    /** Token bound of the completion, derived from the grammar. */
    maxNewTokens: number;
    /** JSON punctuation enforced outside strings. */
    separators: JsonSeparators;
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

export interface SamplingOptions {
    temperature: number;
    topP: number;
    repetitionPenalty: number;
}

/**
 * The prompt texts of prompt contract 1, the model's training format. They are model-contract data and
 * live in the SFT artifact's `generation-config.json`, which the package manifest pins by SHA-256; the
 * user-prompt skeleton around them is rendering code in {@link renderRowPrompt}.
 */
export interface SftPromptTemplate {
    /** Text of the system turn. */
    readonly systemPrompt: string;
    /** Example row shown to the model; its first entries, in order, are rendered. */
    readonly exampleRow: Readonly<Record<string, string | number>>;
    /** ChatML turn markers of the tokenizer. */
    readonly chatMarkers: Readonly<{ turnStart: string; turnEnd: string }>;
}

const PROMPT_TEMPLATE_KEYS: ReadonlySet<string> = new Set(['systemPrompt', 'exampleRow', 'chatMarkers']);
const CHAT_MARKER_KEYS: ReadonlySet<string> = new Set(['turnStart', 'turnEnd']);

/**
 * Validate the prompt template of a `generation-config.json`. The parser is strict: unknown keys, empty
 * texts, non-scalar example values and integer-like example keys (whose JSON order is not preserved by
 * JavaScript objects) are rejected, so a defective artifact fails to load instead of changing the prompt.
 *
 * @param value the `promptTemplate` value of the parsed config
 * @returns the frozen template
 * @throws {TypeError} naming the first invalid entry
 * @example
 * const template = parseSftPromptTemplate(JSON.parse(configText).promptTemplate);
 */
export function parseSftPromptTemplate(value: unknown): SftPromptTemplate {
    const input = objectRecord(value, 'SFT promptTemplate');
    assertKeys(input, PROMPT_TEMPLATE_KEYS, 'SFT promptTemplate');
    const exampleInput = objectRecord(input.exampleRow, 'SFT promptTemplate.exampleRow');
    const entries = Object.entries(exampleInput);
    if (entries.length === 0) {
        throw new TypeError('SFT promptTemplate.exampleRow must not be empty');
    }
    for (const [key, entry] of entries) {
        if (key.length === 0 || /^\d+$/u.test(key)) {
            throw new TypeError('SFT promptTemplate.exampleRow keys must be non-numeric names');
        }
        if (typeof entry !== 'string' && (typeof entry !== 'number' || !Number.isFinite(entry))) {
            throw new TypeError(`SFT promptTemplate.exampleRow.${key} must be a string or a finite number`);
        }
    }
    const markers = objectRecord(input.chatMarkers, 'SFT promptTemplate.chatMarkers');
    assertKeys(markers, CHAT_MARKER_KEYS, 'SFT promptTemplate.chatMarkers');
    return Object.freeze({
        systemPrompt: nonEmptyString(input.systemPrompt, 'SFT promptTemplate.systemPrompt'),
        // Every value was checked to be a string or a finite number above.
        exampleRow: Object.freeze({ ...exampleInput }) as Readonly<Record<string, string | number>>,
        chatMarkers: Object.freeze({
            turnStart: nonEmptyString(markers.turnStart, 'SFT promptTemplate.chatMarkers.turnStart'),
            turnEnd: nonEmptyString(markers.turnEnd, 'SFT promptTemplate.chatMarkers.turnEnd')
        })
    });
}

interface CreateRowGeneratorOptions {
    fingerprint: string;
    textGenerator: ConstrainedTextGenerator;
    sampling: SamplingOptions;
    /** The prompt texts of the model contract, from the artifact's `generation-config.json`. */
    promptTemplate: SftPromptTemplate;
    budgetMs?: number;
    /** Fields per model call; `DEFAULT_SFT_FIELDS_PER_CALL` when absent. */
    maxFieldsPerPrompt?: number;
    /** Punctuation outside strings; `spaced` when absent. */
    separators?: JsonSeparators;
    /**
     * Completed answers by request, so an identical request (same model, prompt, grammar, sampling
     * and seed) returns the same values without running the model again. No answers are kept when
     * absent.
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
export function createMemoryCompletionStore(maximumEntries = DEFAULT_COMPLETION_STORE_ENTRIES): SftCompletionStore {
    const entries = new Map<string, string>();
    return Object.freeze({
        get: (key: string) => entries.get(key),
        set: (key: string, completion: string) => rememberLatest(entries, key, completion, maximumEntries)
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
 * Runtime contract (version 2, the only one this runtime implements):
 * - canonical separators, fed by the runtime instead of sampled;
 * - type-exact numbers: integers take digits only within their type's range, decimals at most
 *   their precision and scale, no exponent;
 * - near a string's maximum length the model may finish a word but not start one;
 * - under the semantic planner, at most `maxFieldsPerPrompt` (default 8) fields per call, coupled
 *   fields kept in one call, and the token bound derived from the grammar;
 * - all rows of a call that share one prompt are decoded together;
 * - rows are returned with the fields that completed, for per-field acceptance by the caller.
 */
// Within this many characters of the maximum length a string stops starting words: a third of the
// length, at least 2 and at most 12, so a 10-character column stops 3 characters before its limit.
const MAXIMUM_STEERING_CHARACTERS = 12;
const MINIMUM_STEERING_CHARACTERS = 2;
const DEFAULT_DECIMAL_INTEGER_DIGITS = 15;
const DEFAULT_DECIMAL_FRACTION_DIGITS = 6;
const MAXIMUM_SAFE_INTEGER_DIGITS = 15;

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

/**
 * Render the row-completion prompt (prompt contract 1) the SFT model was trained on.
 *
 * @param template the prompt texts of the model contract
 * @param input generation request; only the entity name and the fields are rendered
 * @returns the ChatML prompt
 */
export function renderRowPrompt(
    template: SftPromptTemplate,
    input: Pick<SftGenerationInput, 'entityName' | 'fields'>
): string {
    const names = input.fields.map(({ name }) => name);
    const example = Object.fromEntries(Object.entries(template.exampleRow).slice(0, Math.min(5, names.length)));
    const entityName = input.entityName.replace(/Type$/, '');
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
    const { turnStart, turnEnd } = template.chatMarkers;
    return (
        `${turnStart}system\n${template.systemPrompt}${turnEnd}\n` +
        `${turnStart}user\n${userPrompt}${turnEnd}\n` +
        `${turnStart}assistant\n`
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
 * The grammar of one call's fields: type-exact numbers, length steering and no null values.
 *
 * @param fields requested fields, in prompt order
 * @returns grammar fields
 */
export function grammarFields(fields: ReadonlyArray<SftFieldRequest>): ReadonlyArray<SftGrammarField> {
    return Object.freeze(
        fields.map((field) => {
            const numberFormat = numberFormatOf(field);
            const steerWithin =
                field.maxLength !== undefined
                    ? Math.min(
                          MAXIMUM_STEERING_CHARACTERS,
                          Math.max(MINIMUM_STEERING_CHARACTERS, Math.floor(field.maxLength / 3))
                      )
                    : 0;
            return Object.freeze({
                name: field.name,
                valueKind: valueKind(field),
                // The model is asked only for values it should write: a null would publish an empty
                // cell where the typed floor already has a value.
                nullable: false,
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
    return sha256Uint32(`${seed}:${entityName}:${rowIndex}:${chunkKey}`);
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
                if (!isRecord(parsed)) {
                    throw new TypeError('SFT completion row must be an object');
                }
                // JSON.parse yields only JSON values, so every field of the parsed object is a JsonValue.
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

function isIncompleteCompletion(error: unknown, signal: AbortSignal): boolean {
    if (signal.aborted || !(error instanceof Error)) {
        return false;
    }
    return (
        error instanceof SyntaxError ||
        error.message.startsWith('SFT completion ') ||
        error.message === 'SFT generation ended before completing its JSON object'
    );
}

/** The settings of a row generator, resolved once when it is created. */
interface RowGeneratorSettings {
    /** The generator's options. */
    options: CreateRowGeneratorOptions;
    /** Budget of one call in milliseconds. */
    budgetMs: number;
    /** Punctuation enforced outside strings. */
    separators: JsonSeparators;
    /** Fields per model call. */
    maxFieldsPerPrompt: number;
}

/** One `generate` call of a row generator: its request, its cancellation and what it has produced. */
interface RowGenerationCall {
    /** The row generator's options. */
    options: CreateRowGeneratorOptions;
    /** Punctuation enforced outside strings. */
    separators: JsonSeparators;
    /** The request. */
    input: SftGenerationInput;
    /** The caller's cancellation. */
    signal: AbortSignal;
    /** The caller's cancellation joined with the call's budget. */
    context: { signal: AbortSignal; dispose(): void };
    /** Fields completed so far, one record per row. */
    rows: Array<Record<string, JsonValue>>;
    /** Model answers requested, stored ones included. */
    attempts: number;
    /** Answers that parsed against the requested grammar. */
    parsedResponses: number;
}

/**
 * The key of a completed answer: a hash of everything that determines it.
 *
 * @param fingerprint the model fingerprint
 * @param request the constrained generation request
 * @param seed the row's seed
 * @returns the hexadecimal key
 */
function completionKey(fingerprint: string, request: ConstrainedTextGenerationInput, seed: number): string {
    return sha256(
        JSON.stringify([
            fingerprint,
            request.prompt,
            request.grammar,
            request.temperature,
            request.topP,
            request.repetitionPenalty,
            request.maxNewTokens,
            request.separators,
            seed
        ])
    );
}

/**
 * The constrained request for some fields of a row. The prompt renders only the entity and the fields,
 * so every row of a call shares it.
 *
 * @param call the generation call
 * @param fields the fields to generate
 * @param seed the row's seed
 * @returns the frozen request
 */
function rowGenerationInput(
    call: RowGenerationCall,
    fields: ReadonlyArray<SftFieldRequest>,
    seed: number
): ConstrainedTextGenerationInput {
    const prompt = renderRowPrompt(call.options.promptTemplate, { entityName: call.input.entityName, fields });
    const grammar = grammarFields(fields);
    return Object.freeze({
        prompt,
        grammar,
        seed,
        ...call.options.sampling,
        maxNewTokens: grammarTokenBound(grammar),
        separators: call.separators
    });
}

/**
 * Parse a completion and check that it has exactly the requested fields, in order.
 *
 * @param completion the model's answer
 * @param fields the requested fields
 * @returns the fields of the answer
 * @throws {TypeError} when the answer is not one JSON object with exactly the requested keys
 */
function parseCompletion(completion: string, fields: ReadonlyArray<SftFieldRequest>): Record<string, JsonValue> {
    const partial = firstJsonObject(completion);
    if (JSON.stringify(Object.keys(partial)) !== JSON.stringify(fields.map(({ name }) => name))) {
        throw new TypeError('SFT completion keys do not match the requested grammar');
    }
    return partial;
}

/**
 * Generate some fields of one row, from the completion store when it has the answer.
 *
 * @param call the generation call
 * @param fields the fields to generate
 * @param rowIndex the row
 * @param chunkKey the field chunk, part of the row's seed
 * @returns the generated fields
 */
async function generateRowFields(
    call: RowGenerationCall,
    fields: ReadonlyArray<SftFieldRequest>,
    rowIndex: number,
    chunkKey: string
): Promise<Record<string, JsonValue>> {
    const { options, input, context } = call;
    const store = options.completionStore;
    context.signal.throwIfAborted();
    call.attempts += 1;
    const request = rowGenerationInput(call, fields, rowSeed(input.seed, input.entityName, rowIndex, chunkKey));
    const key = store ? completionKey(options.fingerprint, request, request.seed) : undefined;
    const completion =
        (key === undefined ? undefined : store?.get(key)) ??
        (await abortable(options.textGenerator.generate(request, context.signal), context.signal));
    const partial = parseCompletion(completion, fields);
    if (key !== undefined) {
        store?.set(key, completion);
    }
    call.parsedResponses += 1;
    return partial;
}

/**
 * Generate some fields of every row in batches; only the rows without a stored answer run through the
 * model. A row whose answer does not parse keeps its fallback values.
 *
 * @param call the generation call
 * @param fields the fields to generate
 * @param chunkKey the field chunk, part of each row's seed
 */
async function generateRowsTogether(
    call: RowGenerationCall,
    fields: ReadonlyArray<SftFieldRequest>,
    chunkKey: string
): Promise<void> {
    const { options, input, context } = call;
    const store = options.completionStore;
    const generateRows = options.textGenerator.generateBatch;
    if (!generateRows) {
        throw new TypeError('SFT text generator does not decode rows together');
    }
    context.signal.throwIfAborted();
    const seeds = Array.from({ length: input.rowCount }, (_unused, rowIndex) =>
        rowSeed(input.seed, input.entityName, rowIndex, chunkKey)
    );
    call.attempts += input.rowCount;
    const request = rowGenerationInput(call, fields, seeds[0] ?? input.seed);
    const keys = seeds.map((seed) => completionKey(options.fingerprint, request, seed));
    const completions: Array<string | undefined> = keys.map((key) => store?.get(key));
    const missing = completions.flatMap((completion, rowIndex) => (completion === undefined ? [rowIndex] : []));
    for (let start = 0; start < missing.length && !context.signal.aborted; start += SFT_BATCH_ROWS) {
        const group = missing.slice(start, start + SFT_BATCH_ROWS);
        const generatedRows = await generateRows.call(
            options.textGenerator,
            request,
            group.map((rowIndex) => seeds[rowIndex] ?? input.seed),
            context.signal
        );
        group.forEach((rowIndex, position) => {
            completions[rowIndex] = generatedRows[position];
        });
    }
    completions.forEach((completion, rowIndex) => {
        if (completion === undefined) {
            return;
        }
        let partial: Record<string, JsonValue>;
        try {
            partial = parseCompletion(completion, fields);
        } catch (error) {
            // An unparseable row (malformed JSON or off-contract keys) keeps its fallback values; the
            // others are kept. Any other failure is a defect and propagates.
            if (error instanceof SyntaxError || error instanceof TypeError) {
                return;
            }
            throw error;
        }
        store?.set(keys[rowIndex] ?? '', completion);
        call.parsedResponses += 1;
        Object.assign(call.rows[rowIndex] ?? {}, partial);
    });
}

/**
 * Generate a chunk of fields for every row together. A failure after the call's budget ran out ends
 * the chunk instead of the call; cancellation by the caller propagates.
 *
 * @param call the generation call
 * @param fields the fields to generate
 * @param chunkKey the field chunk, part of each row's seed
 */
async function generateChunkTogether(
    call: RowGenerationCall,
    fields: ReadonlyArray<SftFieldRequest>,
    chunkKey: string
): Promise<void> {
    try {
        await generateRowsTogether(call, fields, chunkKey);
    } catch (error) {
        call.signal.throwIfAborted();
        if (!call.context.signal.aborted) {
            throw error;
        }
    }
}

/**
 * Generate a chunk of fields row by row. An incomplete or off-contract answer leaves the row's fields
 * to the fallback; the chunk ends when the call's budget runs out; any other failure propagates with
 * the row and chunk it happened in.
 *
 * @param call the generation call
 * @param fields the fields to generate
 * @param chunkIndex the chunk's position
 * @param chunkCount the number of chunks of the call
 */
async function generateChunkRowByRow(
    call: RowGenerationCall,
    fields: ReadonlyArray<SftFieldRequest>,
    chunkIndex: number,
    chunkCount: number
): Promise<void> {
    for (let rowIndex = 0; rowIndex < call.input.rowCount; rowIndex += 1) {
        try {
            const partial = await generateRowFields(call, fields, rowIndex, String(chunkIndex));
            const row = call.rows[rowIndex];
            if (!row) {
                throw new RangeError('SFT row index is outside its established bounds');
            }
            Object.assign(row, partial);
        } catch (error) {
            call.signal.throwIfAborted();
            if (call.context.signal.aborted) {
                return;
            }
            // An incomplete or off-contract completion leaves the row's fields to the fallback.
            if (isIncompleteCompletion(error, call.context.signal)) {
                continue;
            }
            const reason = errorMessage(error);
            const failure = new Error(
                `SFT generation failed for row ${rowIndex + 1}, chunk ${chunkIndex + 1}/${chunkCount}: ${reason}`,
                { cause: error }
            );
            const code = errnoCode(error);
            if (code !== undefined) {
                Object.assign(failure, { code });
            }
            throw failure;
        }
    }
}

/**
 * Generate the requested fields of every row, chunk by chunk, within the call's budget.
 *
 * @param settings the row generator's resolved settings
 * @param input the request
 * @param signal the caller's cancellation
 * @returns the fields completed per row and the call's statistics
 */
async function generateRows(
    settings: RowGeneratorSettings,
    input: SftGenerationInput,
    signal: AbortSignal
): Promise<SftGenerationOutput> {
    const { options, budgetMs, separators, maxFieldsPerPrompt } = settings;
    const requestBudgetMs = input.budgetMs ?? budgetMs;
    if (!Number.isFinite(requestBudgetMs) || requestBudgetMs <= 0) {
        throw new TypeError('SFT request budget must be positive');
    }
    const context = abortContext(signal, Math.min(budgetMs, requestBudgetMs));
    const fieldChunks = chunkFields(input.fields, maxFieldsPerPrompt, input.coupledFieldGroups ?? []);
    const call: RowGenerationCall = {
        options,
        separators,
        input,
        signal,
        context,
        rows: Array.from({ length: input.rowCount }, () => ({})),
        attempts: 0,
        parsedResponses: 0
    };
    // The rows of a call share its prompt, so a backend that decodes several rows at once takes them together.
    const batchable = options.textGenerator.generateBatch !== undefined && input.rowCount > 1;
    try {
        for (const [chunkIndex, fields] of fieldChunks.entries()) {
            if (batchable) {
                await generateChunkTogether(call, fields, String(chunkIndex));
            } else {
                await generateChunkRowByRow(call, fields, chunkIndex, fieldChunks.length);
            }
            if (context.signal.aborted) {
                break;
            }
        }
        signal.throwIfAborted();
        return Object.freeze({
            // Each row carries the fields that completed; the caller accepts them one by one.
            rows: Object.freeze(call.rows.map((row) => Object.freeze(row))),
            statistics: Object.freeze({ attempts: call.attempts, parsedResponses: call.parsedResponses })
        });
    } finally {
        context.dispose();
    }
}

/**
 * Adapt a grammar-constrained causal text backend to the package's SFT row interface.
 *
 * @param options model fingerprint, text backend, sampling, budget and call shape
 * @returns the row generator
 */
export function createRowGenerator(options: CreateRowGeneratorOptions): SftGenerator {
    const budgetMs = options.budgetMs ?? DEFAULT_SFT_ENTITY_TIMEOUT_MS;
    if (!Number.isFinite(budgetMs) || budgetMs <= 0) {
        throw new TypeError('SFT budget must be positive');
    }
    if (
        options.maxFieldsPerPrompt !== undefined &&
        (!Number.isSafeInteger(options.maxFieldsPerPrompt) || options.maxFieldsPerPrompt <= 0)
    ) {
        throw new TypeError('SFT maximum fields per prompt must be a positive integer');
    }
    const settings: RowGeneratorSettings = Object.freeze({
        options,
        budgetMs,
        separators: options.separators ?? 'spaced',
        maxFieldsPerPrompt: options.maxFieldsPerPrompt ?? DEFAULT_SFT_FIELDS_PER_CALL
    });
    return Object.freeze({
        fingerprint: options.fingerprint,
        generate: (input: SftGenerationInput, signal: AbortSignal) => generateRows(settings, input, signal),
        dispose: async () => {
            await options.textGenerator.dispose?.();
        }
    });
}

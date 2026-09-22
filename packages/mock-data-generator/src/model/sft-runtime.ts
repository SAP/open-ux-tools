import { createHash } from 'node:crypto';
import type { JsonValue, SftFieldRequest, SftGenerationInput, SftGenerator } from '../types.js';

export type JsonValueKind = 'string' | 'number' | 'boolean';

export interface SftGrammarField {
    name: string;
    valueKind: JsonValueKind;
    nullable: boolean;
    maxLength?: number;
}

export interface ConstrainedTextGenerationInput {
    prompt: string;
    grammar: ReadonlyArray<SftGrammarField>;
    seed: number;
    temperature: number;
    topP: number;
    repetitionPenalty: number;
    noRepeatNgramSize: number;
    maxNewTokens: number;
}

export interface ConstrainedTextGenerator {
    generate(input: ConstrainedTextGenerationInput, signal: AbortSignal): Promise<string>;
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
}

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

function chunkFields(
    fields: ReadonlyArray<SftFieldRequest>,
    maximum: number
): ReadonlyArray<ReadonlyArray<SftFieldRequest>> {
    const chunks: ReadonlyArray<SftFieldRequest>[] = [];
    for (let start = 0; start < fields.length; start += maximum) {
        chunks.push(Object.freeze(fields.slice(start, start + maximum)));
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
    if (promptContractVersion !== 1 && promptContractVersion !== 2) {
        throw new TypeError('SFT prompt contract version must be 1 or 2');
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
    return Object.freeze({
        fingerprint: options.fingerprint,
        generate: async (input: SftGenerationInput, signal: AbortSignal) => {
            const requestBudgetMs = input.budgetMs ?? budgetMs;
            if (!Number.isFinite(requestBudgetMs) || requestBudgetMs <= 0) {
                throw new TypeError('SFT request budget must be positive');
            }
            const context = abortContext(signal, Math.min(budgetMs, requestBudgetMs));
            const maxFieldsPerPrompt =
                input.contractVersion === 2
                    ? Math.max(1, input.fields.length)
                    : (options.maxFieldsPerPrompt ?? (input.fields.length >= 100 ? 8 : 3));
            const fieldChunks = chunkFields(input.fields, maxFieldsPerPrompt);
            const rows: Array<Record<string, JsonValue>> = Array.from({ length: input.rowCount }, () => ({}));
            let attempts = 0;
            let parsedResponses = 0;
            const generateFields = async (
                fields: ReadonlyArray<SftFieldRequest>,
                rowIndex: number,
                chunkKey: string
            ): Promise<Record<string, JsonValue>> => {
                context.signal.throwIfAborted();
                const fixedRow = input.fixedRows?.[rowIndex];
                const prompt = renderPilotSftPrompt({
                    ...input,
                    contractVersion: promptContractVersion,
                    fields,
                    ...(fixedRow === undefined ? {} : { fixedRows: [fixedRow] })
                });
                const grammar = Object.freeze(
                    fields.map((field) =>
                        Object.freeze({
                            name: field.name,
                            valueKind: valueKind(field),
                            nullable: field.nullable,
                            ...(field.maxLength === undefined ? {} : { maxLength: field.maxLength })
                        })
                    )
                );
                const expectedKeys = fields.map(({ name }) => name);
                attempts += 1;
                try {
                    const completion = await abortable(
                        options.textGenerator.generate(
                            Object.freeze({
                                prompt,
                                grammar,
                                seed: rowSeed(input.seed, input.entityName, rowIndex, chunkKey),
                                ...options.sampling
                            }),
                            context.signal
                        ),
                        context.signal
                    );
                    const partial = firstJsonObject(completion);
                    if (JSON.stringify(Object.keys(partial)) !== JSON.stringify(expectedKeys)) {
                        throw new TypeError('SFT completion keys do not match the requested grammar');
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
            try {
                for (const [chunkIndex, fields] of fieldChunks.entries()) {
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

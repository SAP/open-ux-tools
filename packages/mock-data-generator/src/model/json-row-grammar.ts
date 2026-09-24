import type { JsonSeparators, SftGrammarField, SftNumberFormat } from './sft-runtime.js';

type Phase =
    | 'before-open'
    | 'before-key-or-close'
    | 'in-key'
    | 'after-key'
    | 'before-value'
    | 'in-string-value'
    | 'in-nonstring-value'
    | 'after-value'
    | 'done';

export interface JsonRowGrammarState {
    phase: Phase;
    remaining: ReadonlyArray<SftGrammarField>;
    keyTarget: string;
    keyMatched: number;
    escaped: boolean;
    unicodeEscapeRemaining: number;
    unicodeEscapeText: string;
    stringHasAlphanumeric: boolean;
    stringLength: number;
    literalText: string;
    valueKind?: SftGrammarField['valueKind'];
    nullable: boolean;
    maximumStringLength?: number;
    numberFormat?: SftNumberFormat;
    separators: JsonSeparators;
    /** Canonical separators only: the single space that must follow `:` or `,`. */
    separatorSpace: boolean;
    /** Within this many characters of its maximum, the runtime ends the string instead of starting a word. */
    steerWithin: number;
}

export interface JsonRowGrammarOptions {
    separators?: JsonSeparators;
}

const WHITESPACE = new Set([' ', '\t', '\n', '\r']);
const NUMBER_START = new Set(['-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
const JSON_ESCAPE = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u']);
const HEX_DIGIT = /^[0-9A-Fa-f]$/u;
const LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;
const COMPLETE_NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/u;
const EXACT_NUMBER = /^(-?)(\d*)(?:(\.)(\d*))?$/u;

export function createJsonRowGrammar(
    fields: ReadonlyArray<SftGrammarField>,
    options: JsonRowGrammarOptions = {}
): JsonRowGrammarState {
    return {
        phase: 'before-open',
        remaining: fields,
        keyTarget: '',
        keyMatched: 0,
        escaped: false,
        unicodeEscapeRemaining: 0,
        unicodeEscapeText: '',
        stringHasAlphanumeric: false,
        stringLength: 0,
        literalText: '',
        nullable: true,
        separators: options.separators ?? 'any',
        separatorSpace: false,
        steerWithin: 0
    };
}

export function grammarComplete(state: JsonRowGrammarState): boolean {
    return state.phase === 'done';
}

function whitespaceAllowed(state: JsonRowGrammarState, character: string): boolean {
    return state.separators === 'any' && WHITESPACE.has(character);
}

function startAllowed(state: JsonRowGrammarState, character: string): boolean {
    if (state.nullable && character === 'n') {
        return true;
    }
    if (state.valueKind === 'string') {
        return character === '"';
    }
    if (state.valueKind === 'number') {
        return (
            NUMBER_START.has(character) &&
            (!state.numberFormat || exactNumberPrefixAllowed(state.numberFormat, character))
        );
    }
    return character === 't' || character === 'f';
}

function numberPrefixAllowed(text: string): boolean {
    return (
        text === '-' ||
        /^-?(?:0|[1-9]\d*)$/u.test(text) ||
        /^-?(?:0|[1-9]\d*)\.\d*$/u.test(text) ||
        /^-?(?:0|[1-9]\d*)(?:\.\d+)?[eE][+-]?\d*$/u.test(text)
    );
}

/**
 * Whether a number prefix can still become a value of the given format: no exponent, no leading
 * zeros, bounded digit counts, and, for the side of zero the sign selects, within the range.
 *
 * @param format type-exact number format
 * @param text number text so far
 * @returns true when some completion is valid
 */
function exactNumberPrefixAllowed(format: SftNumberFormat, text: string): boolean {
    const match = EXACT_NUMBER.exec(text);
    if (!match) {
        return false;
    }
    const [, sign = '', integerDigits = '', point = '', fraction = ''] = match;
    if (sign && format.minimum !== undefined && format.minimum >= 0) {
        return false;
    }
    if (integerDigits.length === 0) {
        return point === '' && sign !== '';
    }
    if (
        (integerDigits.length > 1 && integerDigits.startsWith('0')) ||
        integerDigits.length > format.maxIntegerDigits ||
        (point !== '' &&
            (format.integer || format.maxFractionDigits === 0 || fraction.length > format.maxFractionDigits))
    ) {
        return false;
    }
    const magnitude = Number(integerDigits);
    if (!sign && format.maximum !== undefined && magnitude > format.maximum) {
        return false;
    }
    return !(sign && format.minimum !== undefined && -magnitude < format.minimum);
}

function exactNumberComplete(format: SftNumberFormat, text: string): boolean {
    const match = EXACT_NUMBER.exec(text);
    if (!match || !exactNumberPrefixAllowed(format, text)) {
        return false;
    }
    const [, , integerDigits = '', point = '', fraction = ''] = match;
    if (integerDigits.length === 0 || (point !== '' && fraction.length === 0)) {
        return false;
    }
    const value = Number(text);
    return (
        (format.minimum === undefined || value >= format.minimum) &&
        (format.maximum === undefined || value <= format.maximum)
    );
}

function literalPrefixAllowed(state: JsonRowGrammarState, text: string): boolean {
    const literals = [...(state.valueKind === 'boolean' ? ['true', 'false'] : []), ...(state.nullable ? ['null'] : [])];
    let number = false;
    if (state.valueKind === 'number') {
        number = state.numberFormat ? exactNumberPrefixAllowed(state.numberFormat, text) : numberPrefixAllowed(text);
    }
    return number || literals.some((literal) => literal.startsWith(text));
}

function literalComplete(state: JsonRowGrammarState): boolean {
    let number = false;
    if (state.valueKind === 'number') {
        number = state.numberFormat
            ? exactNumberComplete(state.numberFormat, state.literalText)
            : COMPLETE_NUMBER.test(state.literalText);
    }
    return (
        number ||
        (state.valueKind === 'boolean' && ['true', 'false'].includes(state.literalText)) ||
        (state.nullable && state.literalText === 'null')
    );
}

function stringCharacterAllowed(state: JsonRowGrammarState, character: string): boolean {
    if (state.unicodeEscapeRemaining > 0) {
        if (
            !HEX_DIGIT.test(character) ||
            (state.maximumStringLength !== undefined && state.stringLength >= state.maximumStringLength)
        ) {
            return false;
        }
        if (
            state.unicodeEscapeRemaining === 1 &&
            !state.stringHasAlphanumeric &&
            state.maximumStringLength !== undefined &&
            state.stringLength + 1 === state.maximumStringLength
        ) {
            const decoded = String.fromCharCode(Number.parseInt(`${state.unicodeEscapeText}${character}`, 16));
            return LETTER_OR_NUMBER.test(decoded);
        }
        return true;
    }
    if (state.escaped) {
        if (
            !JSON_ESCAPE.has(character) ||
            (state.maximumStringLength !== undefined && state.stringLength >= state.maximumStringLength)
        ) {
            return false;
        }
        // Canonical output writes characters directly; a \u escape can only lead into a dead end
        // (a code point that is not the letter a short string still needs).
        if (character === 'u' && state.separators !== 'any') {
            return false;
        }
        return (
            character === 'u' ||
            state.stringHasAlphanumeric ||
            state.maximumStringLength === undefined ||
            state.stringLength + 1 < state.maximumStringLength
        );
    }
    if (character === '"') {
        return state.stringHasAlphanumeric;
    }
    // A value that opens like JSON is a structure echoed into a string, never field content.
    if (state.stringLength === 0 && (character === '[' || character === '{')) {
        return false;
    }
    if (
        (character.codePointAt(0) ?? 0) < 0x20 ||
        (state.maximumStringLength !== undefined && state.stringLength >= state.maximumStringLength)
    ) {
        return false;
    }
    return (
        character === '\\' ||
        state.stringHasAlphanumeric ||
        LETTER_OR_NUMBER.test(character) ||
        state.maximumStringLength === undefined ||
        state.stringLength + 1 < state.maximumStringLength
    );
}

function characterAllowed(state: JsonRowGrammarState, character: string): boolean {
    if (state.separatorSpace) {
        return character === ' ';
    }
    switch (state.phase) {
        case 'before-open':
            return whitespaceAllowed(state, character) || character === '{';
        case 'before-key-or-close':
            return (
                whitespaceAllowed(state, character) ||
                (state.remaining.length > 0 ? character === '"' : character === '}')
            );
        case 'in-key':
            return character === state.keyTarget[state.keyMatched];
        case 'after-key':
            return whitespaceAllowed(state, character) || character === ':';
        case 'before-value':
            return whitespaceAllowed(state, character) || startAllowed(state, character);
        case 'in-string-value':
            return stringCharacterAllowed(state, character);
        case 'in-nonstring-value':
            return (
                literalPrefixAllowed(state, `${state.literalText}${character}`) ||
                (literalComplete(state) && characterAllowed({ ...state, phase: 'after-value' }, character))
            );
        case 'after-value':
            return (
                whitespaceAllowed(state, character) ||
                (character === ',' && state.remaining.length > 0) ||
                (character === '}' && state.remaining.length === 0)
            );
        case 'done':
            return false;
        default:
            return false;
    }
}

function advanceCharacter(state: JsonRowGrammarState, character: string): JsonRowGrammarState {
    if (state.separatorSpace) {
        return character === ' ' ? { ...state, separatorSpace: false } : state;
    }
    switch (state.phase) {
        case 'before-open':
            return character === '{' ? { ...state, phase: 'before-key-or-close' } : state;
        case 'before-key-or-close': {
            if (character === '}') {
                return { ...state, phase: 'done' };
            }
            if (character !== '"') {
                return state;
            }
            const [next, ...remaining] = state.remaining;
            if (!next) {
                return state;
            }
            return {
                ...state,
                phase: 'in-key',
                remaining,
                keyTarget: `${next.name}"`,
                keyMatched: 0,
                valueKind: next.valueKind,
                nullable: next.nullable,
                maximumStringLength: next.maxLength,
                numberFormat: next.numberFormat,
                steerWithin: Math.max(0, next.steerWithin ?? 0)
            };
        }
        case 'in-key': {
            const keyMatched = state.keyMatched + 1;
            return keyMatched === state.keyTarget.length
                ? { ...state, phase: 'after-key', keyTarget: '', keyMatched: 0 }
                : { ...state, keyMatched };
        }
        case 'after-key':
            return character === ':'
                ? { ...state, phase: 'before-value', separatorSpace: state.separators === 'spaced' }
                : state;
        case 'before-value':
            if (character === '"') {
                return {
                    ...state,
                    phase: 'in-string-value',
                    escaped: false,
                    unicodeEscapeRemaining: 0,
                    unicodeEscapeText: '',
                    stringHasAlphanumeric: false,
                    stringLength: 0
                };
            }
            return startAllowed(state, character)
                ? { ...state, phase: 'in-nonstring-value', literalText: character }
                : state;
        case 'in-string-value':
            if (state.unicodeEscapeRemaining > 0) {
                const unicodeEscapeText = `${state.unicodeEscapeText}${character}`;
                const unicodeEscapeRemaining = state.unicodeEscapeRemaining - 1;
                const decoded =
                    unicodeEscapeRemaining === 0
                        ? String.fromCharCode(Number.parseInt(unicodeEscapeText, 16))
                        : undefined;
                return {
                    ...state,
                    unicodeEscapeRemaining,
                    unicodeEscapeText: unicodeEscapeRemaining === 0 ? '' : unicodeEscapeText,
                    stringHasAlphanumeric:
                        state.stringHasAlphanumeric || (decoded !== undefined && LETTER_OR_NUMBER.test(decoded)),
                    stringLength: unicodeEscapeRemaining === 0 ? state.stringLength + 1 : state.stringLength
                };
            }
            if (state.escaped) {
                return {
                    ...state,
                    escaped: false,
                    unicodeEscapeRemaining: character === 'u' ? 4 : 0,
                    unicodeEscapeText: '',
                    stringLength: character === 'u' ? state.stringLength : state.stringLength + 1
                };
            }
            if (character === '\\') {
                return { ...state, escaped: true };
            }
            if (character === '"') {
                return { ...state, phase: 'after-value' };
            }
            return {
                ...state,
                stringHasAlphanumeric: state.stringHasAlphanumeric || LETTER_OR_NUMBER.test(character),
                stringLength: state.stringLength + 1
            };
        case 'in-nonstring-value':
            return literalPrefixAllowed(state, `${state.literalText}${character}`)
                ? { ...state, literalText: `${state.literalText}${character}` }
                : advanceCharacter({ ...state, phase: 'after-value' }, character);
        case 'after-value':
            if (character === ',') {
                return { ...state, phase: 'before-key-or-close', separatorSpace: state.separators === 'spaced' };
            }
            if (character === '}') {
                return { ...state, phase: 'done' };
            }
            return state;
        case 'done':
            return state;
        default:
            return state;
    }
}

const VALUE_PHASES: ReadonlySet<Phase> = new Set(['before-value', 'in-string-value', 'in-nonstring-value']);

/**
 * Whether a token text can follow the state.
 *
 * @param state grammar state before the text
 * @param text token text
 * @param options `withinValue`: a text that starts in a value may end the value and take the following
 *   delimiter, but may not reach into the next key; this keeps the tokens a value can sample
 *   independent of the field names that follow it
 * @param options.withinValue see above
 * @returns true when the grammar accepts every character
 */
export function textAllowed(
    state: JsonRowGrammarState,
    text: string,
    options: { withinValue?: boolean } = {}
): boolean {
    if (text.length === 0) {
        return false;
    }
    const bounded = options.withinValue === true && VALUE_PHASES.has(state.phase);
    let current = state;
    for (const character of text) {
        if (!characterAllowed(current, character)) {
            return false;
        }
        current = advanceCharacter(current, character);
        if (bounded && (current.phase === 'in-key' || current.phase === 'after-key')) {
            return false;
        }
    }
    return true;
}

export function advanceText(state: JsonRowGrammarState, text: string): JsonRowGrammarState {
    let current = state;
    for (const character of text) {
        current = advanceCharacter(current, character);
    }
    return current;
}

/**
 * The only character the grammar accepts next, when exactly one is possible without the model's
 * choice: key text, `:` and `,` punctuation, canonical spaces, the opening quote of a required string
 * and the closing brace. Undefined whenever the model has a choice or whitespace is free (`any`).
 *
 * @param state grammar state
 * @returns the forced character, if any
 */
function forcedCharacter(state: JsonRowGrammarState): string | undefined {
    if (state.separatorSpace) {
        return ' ';
    }
    if (state.separators === 'any') {
        return state.phase === 'in-key' ? state.keyTarget[state.keyMatched] : undefined;
    }
    switch (state.phase) {
        case 'before-open':
            return '{';
        case 'before-key-or-close':
            return state.remaining.length > 0 ? '"' : '}';
        case 'in-key':
            return state.keyTarget[state.keyMatched];
        case 'after-key':
            return ':';
        case 'before-value':
            return state.valueKind === 'string' && !state.nullable ? '"' : undefined;
        case 'after-value':
            return state.remaining.length > 0 ? ',' : '}';
        default:
            return undefined;
    }
}

/**
 * Text the grammar forces from this state on, up to the next point where the model chooses.
 *
 * @param state grammar state
 * @returns forced text, empty when the next character is the model's choice or the row is complete
 */
export function forcedText(state: JsonRowGrammarState): string {
    let text = '';
    let current = state;
    while (current.phase !== 'done') {
        const character = forcedCharacter(current);
        if (character === undefined) {
            break;
        }
        text += character;
        current = advanceCharacter(current, character);
    }
    return text;
}

/**
 * A key for the set of tokens a value state can sample. Under `withinValue` token checks, that set
 * depends on the value's own state and whether another field follows, never on the field names, so
 * resources with different fields share entries.
 *
 * @param state grammar state in a value phase
 * @param maximumTokenLength longest token text; a string capacity at or above it is equivalent
 * @returns cache key
 */
/**
 * Whether a string is close enough to its maximum length that a new word should end it instead.
 *
 * @param state grammar state
 * @returns true inside the steering window of a string that already has content
 */
export function withinSteeringWindow(state: JsonRowGrammarState): boolean {
    return (
        state.phase === 'in-string-value' &&
        state.steerWithin > 0 &&
        state.stringHasAlphanumeric &&
        !state.escaped &&
        state.maximumStringLength !== undefined &&
        state.maximumStringLength - state.stringLength <= state.steerWithin
    );
}

export function valueStateKey(state: JsonRowGrammarState, maximumTokenLength: number): string {
    const inString = state.phase === 'in-string-value';
    let capacity: number | undefined;
    if (state.maximumStringLength !== undefined) {
        const remainingCapacity = state.maximumStringLength - (inString ? state.stringLength : 0);
        // A token cannot reach the length limit or the steering window from this far away.
        capacity = remainingCapacity >= maximumTokenLength + state.steerWithin ? -1 : remainingCapacity;
    }
    return JSON.stringify([
        state.phase,
        state.valueKind,
        state.nullable,
        capacity,
        inString && state.escaped,
        inString ? state.unicodeEscapeRemaining : 0,
        inString && state.unicodeEscapeRemaining > 0 ? state.unicodeEscapeText : '',
        inString && state.stringHasAlphanumeric,
        state.phase === 'in-nonstring-value' ? state.literalText : '',
        state.valueKind === 'number' ? (state.numberFormat ?? null) : null,
        state.separators,
        state.separatorSpace,
        state.steerWithin,
        state.remaining.length > 0
    ]);
}

import type { SftGrammarField } from './sft-runtime.js';

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
    stringHasContent: boolean;
    literalText: string;
    valueKind?: SftGrammarField['valueKind'];
    nullable: boolean;
}

const WHITESPACE = new Set([' ', '\t', '\n', '\r']);
const NUMBER_START = new Set(['-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
const COMPLETE_NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/u;

export function createJsonRowGrammar(fields: ReadonlyArray<SftGrammarField>): JsonRowGrammarState {
    return {
        phase: 'before-open',
        remaining: fields,
        keyTarget: '',
        keyMatched: 0,
        escaped: false,
        stringHasContent: false,
        literalText: '',
        nullable: true
    };
}

export function grammarComplete(state: JsonRowGrammarState): boolean {
    return state.phase === 'done';
}

function startAllowed(state: JsonRowGrammarState, character: string): boolean {
    if (state.nullable && character === 'n') {
        return true;
    }
    if (state.valueKind === 'string') {
        return character === '"';
    }
    if (state.valueKind === 'number') {
        return NUMBER_START.has(character);
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

function literalPrefixAllowed(state: JsonRowGrammarState, text: string): boolean {
    const literals = [...(state.valueKind === 'boolean' ? ['true', 'false'] : []), ...(state.nullable ? ['null'] : [])];
    return (
        (state.valueKind === 'number' && numberPrefixAllowed(text)) ||
        literals.some((literal) => literal.startsWith(text))
    );
}

function literalComplete(state: JsonRowGrammarState): boolean {
    return (
        (state.valueKind === 'number' && COMPLETE_NUMBER.test(state.literalText)) ||
        (state.valueKind === 'boolean' && ['true', 'false'].includes(state.literalText)) ||
        (state.nullable && state.literalText === 'null')
    );
}

function characterAllowed(state: JsonRowGrammarState, character: string): boolean {
    switch (state.phase) {
        case 'before-open':
            return WHITESPACE.has(character) || character === '{';
        case 'before-key-or-close':
            return WHITESPACE.has(character) || (state.remaining.length > 0 ? character === '"' : character === '}');
        case 'in-key':
            return character === state.keyTarget[state.keyMatched];
        case 'after-key':
            return WHITESPACE.has(character) || character === ':';
        case 'before-value':
            return WHITESPACE.has(character) || startAllowed(state, character);
        case 'in-string-value':
            if (state.escaped) {
                return true;
            }
            if (character === '"' && !state.stringHasContent) {
                return false;
            }
            return (character.codePointAt(0) ?? 0) >= 0x20;
        case 'in-nonstring-value':
            return (
                literalPrefixAllowed(state, `${state.literalText}${character}`) ||
                (literalComplete(state) && characterAllowed({ ...state, phase: 'after-value' }, character))
            );
        case 'after-value':
            return (
                WHITESPACE.has(character) ||
                (character === ',' && state.remaining.length > 0) ||
                (character === '}' && state.remaining.length === 0)
            );
        case 'done':
            return false;
    }
}

function advanceCharacter(state: JsonRowGrammarState, character: string): JsonRowGrammarState {
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
                nullable: next.nullable
            };
        }
        case 'in-key': {
            const keyMatched = state.keyMatched + 1;
            return keyMatched === state.keyTarget.length
                ? { ...state, phase: 'after-key', keyTarget: '', keyMatched: 0 }
                : { ...state, keyMatched };
        }
        case 'after-key':
            return character === ':' ? { ...state, phase: 'before-value' } : state;
        case 'before-value':
            if (character === '"') {
                return { ...state, phase: 'in-string-value', escaped: false, stringHasContent: false };
            }
            return startAllowed(state, character)
                ? { ...state, phase: 'in-nonstring-value', literalText: character }
                : state;
        case 'in-string-value':
            if (state.escaped) {
                return { ...state, escaped: false, stringHasContent: true };
            }
            if (character === '\\') {
                return { ...state, escaped: true };
            }
            if (character === '"') {
                return { ...state, phase: 'after-value' };
            }
            return state.stringHasContent ? state : { ...state, stringHasContent: true };
        case 'in-nonstring-value':
            return literalPrefixAllowed(state, `${state.literalText}${character}`)
                ? { ...state, literalText: `${state.literalText}${character}` }
                : advanceCharacter({ ...state, phase: 'after-value' }, character);
        case 'after-value':
            if (character === ',') {
                return { ...state, phase: 'before-key-or-close' };
            }
            if (character === '}') {
                return { ...state, phase: 'done' };
            }
            return state;
        case 'done':
            return state;
    }
}

export function textAllowed(state: JsonRowGrammarState, text: string): boolean {
    if (text.length === 0) {
        return false;
    }
    let current = state;
    for (const character of text) {
        if (!characterAllowed(current, character)) {
            return false;
        }
        current = advanceCharacter(current, character);
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

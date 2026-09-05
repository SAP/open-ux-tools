import type { PackageJsonMockConfig } from '../types/index.js';

export const STANDARD_MOCKSERVER_MODULE = '@sap-ux/ui5-middleware-fe-mockserver';
export const MOCKGEN_MODULE = '@sap-ux/mockserver-data-generator';
export const MOCKGEN_VERSION = '0.1.0';
export const MOCKGEN_PROVIDER = '@sap-ux/mockserver-data-generator/fe-mockserver';
export const MOCKGEN_LAUNCHER_PREFIX = 'mockserver-data-generator start -- ';

type ShellQuote = '"';

const PERSISTED_MOCKGEN_FLAG = /(?:^|\s)(?:--mockgen|'--mockgen'|"--mockgen")(?=\s|$)/u;
const UNSAFE_UNQUOTED_CHARACTERS = new Set([
    '&',
    '|',
    ';',
    '<',
    '>',
    '`',
    '$',
    '#',
    '\\',
    '(',
    ')',
    '%',
    '!',
    '^',
    '{',
    '}',
    '[',
    ']',
    '*',
    '?',
    '~',
    "'"
]);

interface CommandParseState {
    quote?: ShellQuote;
    word: string;
    wordStarted: boolean;
}

/**
 * Check for line-breaking or platform-specific whitespace that cannot be
 * preserved as an argument separator across npm shells.
 *
 * @param command package script
 * @returns whether unsafe whitespace is present
 */
export function hasUnsafeCommandWhitespace(command: string): boolean {
    return [...command].some((character) => /\s/u.test(character) && character !== ' ' && character !== '\t');
}

/**
 * Consume one character while parsing a quoted word.
 *
 * @param state mutable parser state
 * @param character current character
 * @returns false when the character introduces unsafe shell evaluation
 */
function consumeQuotedCharacter(state: CommandParseState, character: string): boolean {
    if (character === state.quote) {
        state.quote = undefined;
    } else if (
        state.quote === '"' &&
        (character === '$' ||
            character === '`' ||
            character === '\\' ||
            character === '%' ||
            character === '!' ||
            character === '^')
    ) {
        return false;
    } else {
        state.word += character;
    }
    state.wordStarted = true;
    return true;
}

/**
 * Complete the current parsed word when it contains quoted or unquoted input.
 *
 * @param words completed words
 * @param state mutable parser state
 */
function finishWord(words: string[], state: CommandParseState): void {
    if (state.wordStarted) {
        words.push(state.word);
        state.word = '';
        state.wordStarted = false;
    }
}

/**
 * Whether the standard FE mockserver configuration can host MockGen.
 *
 * @param config package configuration selected by the caller
 * @returns whether MockGen wiring should be generated
 */
export function supportsMockgen(config?: PackageJsonMockConfig): boolean {
    return (
        !config?.skip &&
        (config?.mockserverModule === undefined || config.mockserverModule === STANDARD_MOCKSERVER_MODULE)
    );
}

/**
 * Parse the shell-free command subset that can safely be preserved behind the
 * launcher.
 *
 * @param command package script without the launcher prefix
 * @returns parsed command words, or undefined for shell syntax
 */
function parseSimpleCommand(command: string): string[] | undefined {
    const words: string[] = [];
    const state: CommandParseState = { word: '', wordStarted: false };
    for (const character of command) {
        if (hasUnsafeCommandWhitespace(character)) {
            return undefined;
        } else if (state.quote !== undefined) {
            if (!consumeQuotedCharacter(state, character)) {
                return undefined;
            }
        } else if (character === ' ' || character === '\t') {
            finishWord(words, state);
        } else if (character === '"') {
            state.quote = character;
            state.wordStarted = true;
        } else if (UNSAFE_UNQUOTED_CHARACTERS.has(character)) {
            return undefined;
        } else {
            state.word += character;
            state.wordStarted = true;
        }
    }
    if (state.quote !== undefined) {
        return undefined;
    }
    finishWord(words, state);
    return words;
}

/**
 * Check for command syntax that npm's shell would evaluate instead of passing
 * to the launcher. A persisted activation flag is rejected because activation
 * must remain an explicit runtime choice.
 *
 * @param script package script
 * @returns whether the script is a shell-free Fiori invocation
 */
export function canUseMockgenLauncher(script: string): boolean {
    const command = script.startsWith(MOCKGEN_LAUNCHER_PREFIX) ? script.slice(MOCKGEN_LAUNCHER_PREFIX.length) : script;
    if (PERSISTED_MOCKGEN_FLAG.test(command)) {
        throw new Error('The persisted start-mock command must not contain --mockgen');
    }
    const words = parseSimpleCommand(command);
    if (words?.includes('--mockgen')) {
        throw new Error('The persisted start-mock command must not contain --mockgen');
    }
    return words?.[0] === 'fiori' && words[1] === 'run';
}

/**
 * Add the launcher only to a shell-free Fiori command.
 *
 * @param script package script
 * @returns idempotently wrapped script
 */
export function addMockgenLauncher(script: string): string {
    return script.startsWith(MOCKGEN_LAUNCHER_PREFIX) || !canUseMockgenLauncher(script)
        ? script
        : `${MOCKGEN_LAUNCHER_PREFIX}${script}`;
}

/**
 * Remove only the exact launcher owned by this writer.
 *
 * @param script package script
 * @returns script without the owned prefix
 */
export function removeMockgenLauncher(script: string): string {
    return script.startsWith(MOCKGEN_LAUNCHER_PREFIX) ? script.slice(MOCKGEN_LAUNCHER_PREFIX.length) : script;
}

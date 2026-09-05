export const START_MOCK_LAUNCHER_PREFIX = 'mockserver-data-generator start -- ';

function parseSimpleCommand(command) {
    const words = [];
    let word = '';
    let wordStarted = false;
    let quote;
    let escaped = false;
    const finishWord = () => {
        if (wordStarted) {
            words.push(word);
            word = '';
            wordStarted = false;
        }
    };
    for (let index = 0; index < command.length; index += 1) {
        const character = command[index];
        if (escaped) {
            word += character;
            wordStarted = true;
            escaped = false;
            continue;
        }
        if (quote === "'") {
            if (character === "'") {
                quote = undefined;
            } else {
                word += character;
            }
            wordStarted = true;
            continue;
        }
        if (quote === '"') {
            if (character === '"') {
                quote = undefined;
            } else if (character === '\\') {
                escaped = true;
            } else if (character === '`' || (character === '$' && command[index + 1] === '(')) {
                throw new Error('start-mock must be a simple fiori run command without shell evaluation syntax');
            } else {
                word += character;
            }
            wordStarted = true;
            continue;
        }
        if (/\s/u.test(character)) {
            finishWord();
        } else if (character === '\\') {
            escaped = true;
            wordStarted = true;
        } else if (character === "'" || character === '"') {
            quote = character;
            wordStarted = true;
        } else if (
            ['&', '|', ';', '<', '>', '`', '\n', '\r'].includes(character) ||
            (character === '$' && command[index + 1] === '(')
        ) {
            throw new Error('start-mock must be a simple fiori run command without shell evaluation syntax');
        } else {
            word += character;
            wordStarted = true;
        }
    }
    if (quote !== undefined || escaped) {
        throw new Error('start-mock must be a simple fiori run command without unterminated quotes or escapes');
    }
    finishWord();
    return words;
}

/**
 * Validate a wrapped or unwrapped generated Fiori mockserver command.
 *
 * @param {string} script package script
 * @returns {{original: string, tokens: string[]}} original command and parsed arguments
 */
export function parseStartMockScript(script) {
    const original = script.startsWith(START_MOCK_LAUNCHER_PREFIX)
        ? script.slice(START_MOCK_LAUNCHER_PREFIX.length)
        : script;
    const tokens = parseSimpleCommand(original);
    if (tokens[0] !== 'fiori' || tokens[1] !== 'run') {
        throw new Error('start-mock must be a simple fiori run command before MockGen can wrap it');
    }
    if (tokens.includes('--mockgen')) {
        throw new Error('The persisted start-mock command must not contain --mockgen');
    }
    return { original, tokens };
}

/**
 * Require the MockGen launcher and one exact ui5-mock.yaml config argument.
 *
 * @param {string} script installed package script
 * @returns {string[]} parsed original Fiori command
 */
export function verifyWrappedStartMockScript(script) {
    if (!script.startsWith(START_MOCK_LAUNCHER_PREFIX)) {
        throw new Error('start-mock is not configured through the MockGen launcher');
    }
    const { tokens } = parseStartMockScript(script);
    const configs = [];
    for (let index = 2; index < tokens.length; index += 1) {
        if (tokens[index] === '--config') {
            configs.push(tokens[index + 1]);
            index += 1;
        } else if (tokens[index].startsWith('--config=')) {
            configs.push(tokens[index].slice('--config='.length));
        }
    }
    if (configs.length !== 1 || configs[0] !== './ui5-mock.yaml') {
        throw new Error('start-mock must target ui5-mock.yaml exactly once');
    }
    return tokens;
}

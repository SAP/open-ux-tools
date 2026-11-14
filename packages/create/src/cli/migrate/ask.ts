import prompts, { type Answers, type PromptObject } from 'prompts';
import { t } from '../../i18n.js';

// Time given to the prompt to resolve after stdin ended, in case the answer was the last data that was read
const INPUT_END_GRACE_MS = 100;

/**
 * Thrown when a prompt cannot be answered because stdin has ended, for example when running without a terminal.
 */
export class NoInputError extends Error {
    /**
     * Creates the error with the localized message.
     */
    constructor() {
        super(t('migrate.validation.noInput'));
        this.name = 'NoInputError';
    }
}

/**
 * Show a prompt like `prompts` does, but fail with a {@link NoInputError} if stdin ends before the prompt was answered.
 * `prompts` never settles in this case, which made the process exit silently with code 13. Answers that are piped in
 * (for example `printf 'n\n' | ...`) keep working.
 *
 * @param question - prompt to show
 * @returns the answers of the prompt
 * @throws NoInputError if the prompt cannot be answered
 */
export async function ask(question: PromptObject): Promise<Answers<string>> {
    if (process.stdin.readableEnded) {
        throw new NoInputError();
    }
    let timer: NodeJS.Timeout | undefined;
    let onInputEnd: (() => void) | undefined;
    const inputEnded = new Promise<never>((_resolve, reject) => {
        onInputEnd = () => {
            timer ??= setTimeout(() => reject(new NoInputError()), INPUT_END_GRACE_MS);
        };
        process.stdin.once('end', onInputEnd);
        process.stdin.once('close', onInputEnd);
    });
    try {
        return await Promise.race([prompts(question), inputEnded]);
    } finally {
        clearTimeout(timer);
        if (onInputEnd) {
            process.stdin.off('end', onInputEnd);
            process.stdin.off('close', onInputEnd);
        }
    }
}

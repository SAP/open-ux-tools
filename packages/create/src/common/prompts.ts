import prompts from 'prompts';
import type { PromptType, PromptObject, InitialReturnValue } from 'prompts';
import type { YUIQuestion } from '@sap-ux/inquirer-common';
import type { Answers } from 'inquirer';
import { getLogger } from '../tracing';

/**
 * Checks if a property is a function.
 *
 * @param property property to be checked
 * @returns true if the property is a function
 */
function isFunction(property: unknown): property is Function {
    return typeof property === 'function';
}

const QUESTION_TYPE_MAP: Record<string, PromptType> = {
    input: 'text',
    editor: 'text',
    list: 'autocomplete',
    checkbox: 'multiselect'
};

type AutoCompleteCallbackFn = (answers: Answers, input: string) => Promise<Array<{ name: string; value: unknown }>>;

/**
 * Map choices from inquirer format to prompts format.
 *
 * @param choices choices to be mapped
 * @returns mapped choices
 */
function mapChoices(
    choices: Array<{ name: string; value: unknown } | string | number>
): Array<{ title: string; value: unknown }> {
    return choices.map((choice) => ({
        title: typeof choice === 'object' ? choice.name : `${choice}`,
        value: typeof choice === 'object' ? choice.value : choice
    }));
}

/**
 * Enhances the new prompt with the choices from the original list question.
 *
 * @param origChoices choices of the original list/autocomplete question
 * @param prompt converted prompt
 * @param answers previously given answers
 * @param autoCompleteCb callback for autocomplete
 */
async function enhanceListQuestion(
    origChoices: unknown,
    prompt: PromptObject,
    answers: { [key: string]: unknown },
    autoCompleteCb?: AutoCompleteCallbackFn
): Promise<void> {
    const choices = (isFunction(origChoices) ? await origChoices(answers) : origChoices) as Array<
        { name: string; value: unknown } | string | number
    >;
    const mapppedChoices = mapChoices(choices);
    const initialValue = (prompt.initial as Function)();
    prompt.choices = mapppedChoices;
    prompt.initial = (): InitialReturnValue =>
        mapppedChoices[initialValue]
            ? initialValue
            : mapppedChoices.findIndex((choice) => choice.value === initialValue);
    if (autoCompleteCb) {
        prompt.suggest = async (input, choices): Promise<unknown> => {
            if (input) {
                const newChoices = await autoCompleteCb(answers, input);
                return mapChoices(newChoices);
            }
            return choices;
        };
    }
}

/**
 * Indicates if the question is optional.
 *
 * @param question question to be checked
 * @param answers rpeviously given answers
 * @returns message of the question
 */
async function extractMessage<T extends Answers>(question: YUIQuestion<T>, answers: T): Promise<string | undefined> {
    const message = isFunction(question.message) ? await question.message(answers) : question.message;
    if (question.guiOptions && !question.guiOptions.mandatory) {
        return `${message} (optional)`;
    } else {
        return message;
    }
}

/**
 * Converts a YUI question to a simple prompts question.
 *
 * @param question YUI question to be converted
 * @param answers previously given answers
 * @returns question converted to prompts question
 */
export async function convertQuestion<T extends Answers>(
    question: YUIQuestion<T> & { choices?: unknown; source?: AutoCompleteCallbackFn },
    answers: T
): Promise<PromptObject> {
    const prompt: PromptObject = {
        type: QUESTION_TYPE_MAP[question.type ?? 'input'] ?? question.type,
        name: question.name,
        message: await extractMessage(question, answers),
        validate: async (value: unknown) =>
            isFunction(question.validate) ? await question.validate(value, answers) : question.validate ?? true,
        initial: () => (isFunction(question.default) ? question.default(answers) : question.default)
    };
    if (question.choices || question.source) {
        await enhanceListQuestion(question.choices ?? question.source, prompt, answers, question.source);
    }
    return prompt;
}
/**
 * Prompt a list of YeomanUI questions with the simple prompts module.
 *
 * @param questions list of questions
 * @param useDefaults - if true, the default values are used for all prompts
 * @param answers - previously given answers
 * @returns the answers to the questions
 */
export async function promptYUIQuestions<T extends Answers>(
    questions: YUIQuestion<T>[],
    useDefaults: boolean,
    answers?: T
): Promise<T> {
    answers ??= {} as T;
    for (const question of questions) {
        if (isFunction(question.when) ? await question.when(answers) : question.when !== false) {
            if (useDefaults) {
                answers[question.name] = isFunction(question.default) ? question.default(answers) : question.default;
            } else {
                answers[question.name] = await promptSingleQuestion(answers, question);
            }
        }
    }
    return answers;
}

/**
 * Prompt a single YeomanUI question with the simple prompts module.
 *
 * @param answers previously given answers
 * @param question question to be prompted
 * @returns a promise with the answer of the question
 */
async function promptSingleQuestion<T extends Answers>(answers: T, question: YUIQuestion<T>): Promise<T[keyof T]> {
    const q = await convertQuestion(question, answers);
    const answer = await prompts(q, {
        onCancel: () => {
            throw new Error('User canceled the prompt');
        }
    });
    // prompts does not handle validation for autocomplete out of the box
    if (q.type === 'autocomplete') {
        const valid = await (q.validate as Function)(answer[question.name]);
        if (valid !== true) {
            getLogger().warn(valid);
            return promptSingleQuestion(answers, question);
        }
    }
    return answer[question.name];
}

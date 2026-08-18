import { input, select, password, checkbox, confirm } from '@inquirer/prompts';
import type { YUIQuestion } from '@sap-ux/inquirer-common';
import type { Answers } from 'inquirer';
import { getLogger } from '../tracing/index.js';

/**
 * Checks if a property is a function.
 *
 * @param property property to be checked
 * @returns true if the property is a function
 */
function isFunction(property: unknown): property is Function {
    return typeof property === 'function';
}

/**
 * Map choices from inquirer format to @inquirer/prompts format.
 *
 * @param choices choices to be mapped
 * @returns mapped choices
 */
function mapChoices(
    choices: Array<{ name: string; value: unknown } | string | number>
): Array<{ name: string; value: unknown }> {
    return choices.map((choice) => ({
        name: typeof choice === 'object' ? choice.name : `${choice}`,
        value: typeof choice === 'object' ? choice.value : choice
    }));
}

/**
 * Filters out questions from an array that are marked with the type 'label' in their GUI options.
 *
 * @param {YUIQuestion<T>[]} questions - An array of questions or prompts, where each question can contain various GUI options.
 * @returns {Promise<YUIQuestion<T>[]>} A promise that resolves to an array of questions, excluding those with a 'label' type.
 * @template T - The generic type parameter that extends Answers, used to type the questions array.
 */
export async function filterLabelTypeQuestions<T extends Answers>(
    questions: YUIQuestion<T>[]
): Promise<YUIQuestion<T>[]> {
    return questions.filter((question) => question?.guiOptions?.type !== 'label');
}

/**
 * Extracts the message for a question, adding "(optional)" suffix if not mandatory.
 *
 * @param question question to extract message from
 * @param answers previously given answers
 * @returns message string
 */
async function extractMessage<T extends Answers>(question: YUIQuestion<T>, answers: T): Promise<string> {
    const message = isFunction(question.message) ? await question.message(answers) : (question.message ?? '');
    if (question.guiOptions && !question.guiOptions.mandatory) {
        return `${message} (optional)`;
    }
    return message;
}

/**
 * Prompt a list of YeomanUI questions with the @inquirer/prompts module.
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
 * Prompt a single YeomanUI question with the @inquirer/prompts module.
 *
 * @param answers previously given answers
 * @param question question to be prompted
 * @returns a promise with the answer of the question
 */
async function promptSingleQuestion<T extends Answers>(
    answers: T,
    question: YUIQuestion<T> & { choices?: unknown }
): Promise<T[keyof T]> {
    const message = await extractMessage(question, answers);
    const defaultValue = isFunction(question.default) ? question.default(answers) : question.default;
    const validateFn = async (value: unknown): Promise<boolean | string> => {
        if (isFunction(question.validate)) {
            const result = await question.validate(value, answers);
            return result === true ? true : String(result);
        }
        return question.validate === false ? 'Invalid value' : true;
    };

    const type = question.type ?? 'input';

    try {
        switch (type) {
            case 'input':
            case 'editor':
                return (await input({
                    message,
                    default: defaultValue as string,
                    validate: validateFn
                })) as T[keyof T];

            case 'password':
                return (await password({
                    message,
                    validate: validateFn
                })) as T[keyof T];

            case 'list': {
                const choices = (
                    isFunction(question.choices) ? await (question.choices as Function)(answers) : question.choices
                ) as Array<{ name: string; value: unknown } | string | number>;

                return (await select({
                    message,
                    choices: mapChoices(choices),
                    default: defaultValue
                })) as T[keyof T];
            }

            case 'checkbox': {
                const choices = (
                    isFunction(question.choices) ? await (question.choices as Function)(answers) : question.choices
                ) as Array<{ name: string; value: unknown } | string | number>;

                return (await checkbox({
                    message,
                    choices: mapChoices(choices),
                    validate: validateFn
                })) as T[keyof T];
            }

            case 'confirm':
                return (await confirm({
                    message,
                    default: !!defaultValue
                })) as T[keyof T];

            default:
                getLogger().warn(`Unsupported question type: ${type}, falling back to input`);
                return (await input({
                    message,
                    default: defaultValue as string,
                    validate: validateFn
                })) as T[keyof T];
        }
    } catch (error) {
        if (
            error &&
            typeof error === 'object' &&
            'message' in error &&
            error.message === 'User force closed the prompt'
        ) {
            throw new Error('User canceled the prompt');
        }
        throw error;
    }
}

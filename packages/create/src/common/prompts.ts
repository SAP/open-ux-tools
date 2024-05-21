import prompts from 'prompts';
import type { PromptType, PromptObject } from 'prompts';
import type { ListQuestion, YUIQuestion } from '@sap-ux/inquirer-common';

/**
 * Checks if a property is a function.
 *
 * @param property property to be checked
 * @returns true if the property is a function
 */
function isFunction(property: unknown | Function): property is Function {
    return typeof property === 'function';
}

const QUESTION_TYPE_MAP: Record<string, PromptType> = {
    input: 'text',
    list: 'autocomplete',
    checkbox: 'multiselect'
};

/**
 *
 * @param question
 * @param listQuestion
 * @param prompt
 */
async function enhanceListQuestion(
    listQuestion: ListQuestion,
    prompt: PromptObject,
    answers: { [key: string]: unknown }
) {
    const choices: Array<{ name: string; value: unknown } | string | number> = (
        isFunction(listQuestion.choices) ? await listQuestion.choices(answers) : listQuestion.choices
    ) as Array<{ name: string; value: unknown } | string | number>;
    const mapppedChoices = choices.map((choice) => ({
        title: typeof choice === 'object' ? choice.name : `${choice}`,
        value: typeof choice === 'object' ? choice.value : choice
    }));
    const initialValue = (prompt.initial as Function)();
    prompt.choices = mapppedChoices;
    prompt.initial = () =>
        mapppedChoices[initialValue]
            ? initialValue
            : mapppedChoices.findIndex((choice) => choice.value === initialValue);
}

/**
 * Converts a YUI question to a simple prompts question.
 *
 * @param question YUI question to be converted
 * @param answers previously given answers
 * @returns question converted to prompts question
 */
export async function convertQuestion(
    question: YUIQuestion & { choices?: unknown },
    answers: { [key: string]: unknown }
): Promise<PromptObject> {
    const prompt: PromptObject = {
        type: QUESTION_TYPE_MAP[question.type ?? 'input'] ?? question.type,
        name: question.name,
        message: isFunction(question.message) ? await question.message(answers) : await question.message,
        validate: async (value: unknown) =>
            isFunction(question.validate) ? await question.validate(value, answers) : question.validate ?? true,
        initial: () => (isFunction(question.default) ? question.default(answers) : question.default)
    };
    if (question.choices) {
        await enhanceListQuestion(question as ListQuestion, prompt, answers);
    }
    return prompt;
}

/**
 * Prompt a list of YeomanUI questions with the simple prompts module.
 *
 * @param questions list of questions
 * @param useDefaults - if true, the default values are used for all prompts
 * @returns the answers to the questions
 */
export async function promptYUIQuestions<T>(questions: YUIQuestion[], useDefaults: boolean): Promise<T> {
    const answers: { [key: string]: unknown } = {};
    for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        if (isFunction(question.when) ? question.when(answers) : question.when !== false) {
            if (useDefaults) {
                answers[question.name] = isFunction(question.default) ? question.default(answers) : question.default;
            } else {
                const q = await convertQuestion(question, answers);
                const answer = await prompts(q, {
                    onCancel: () => {
                        throw new Error('User canceled the prompt');
                    },
                    onSubmit: async (prompt: PromptObject, answer: unknown) => {
                        // prompts does not handle validation for autocomplete out of the box
                        if (prompt.type === 'autocomplete' && prompt.validate) {
                            const valid = await (q.validate as Function)(answer);
                            if (valid !== true) {
                                console.error(valid);
                                i--;
                            }
                        }
                    }
                });
                answers[question.name] = answer[question.name];
            }
        }
    }
    return answers as T;
}

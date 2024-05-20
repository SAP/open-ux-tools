import { spawnSync } from 'child_process';
import prompts from 'prompts';
import type { PromptType, PromptObject } from 'prompts';
import type { YUIQuestion } from '@sap-ux/inquirer-common';

/**
 * Run npm install command.
 *
 * @param basePath - path to application root
 * @param [installArgs] - optional string array of arguments
 */
export function runNpmInstallCommand(basePath: string, installArgs: string[] = []): void {
    const npmCommand = process.platform.startsWith('win') ? 'npm.cmd' : 'npm';
    const args = ['install', ...installArgs];
    spawnSync(npmCommand, args, {
        cwd: basePath,
        stdio: [0, 1, 2]
    });
}

// Temporary here until PR is merged - https://github.com/SAP/open-ux-tools/pull/1940/files

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
 * Converts a YUI question to a simple prompts question.
 *
 * @param question YUI question to be converted
 * @param answers previously given answers
 * @returns question converted to prompts question
 */
async function convertQuestion(
    question: YUIQuestion & { choices?: unknown },
    answers: { [key: string]: unknown }
): Promise<PromptObject> {
    const q: PromptObject = {
        type: QUESTION_TYPE_MAP[question.type ?? 'input'] ?? question.type,
        name: question.name,
        message: isFunction(question.message) ? await question.message(answers) : await question.message,
        validate: (value: unknown) =>
            isFunction(question.validate) ? question.validate(value, answers) : question.validate ?? true,
        initial: () => (isFunction(question.default) ? question.default(answers) : question.default)
    };
    if (question.choices) {
        const choices: Array<{ name: string; value: unknown }> = isFunction(question.choices)
            ? await question.choices(answers)
            : question.choices;
        const initialValue = (q.initial as Function)();
        q.choices = choices.map((choice) => {
            if (typeof choice === 'object') {
                return { title: choice.name, value: choice.value };
            }
            return { title: choice, value: choice };
        });
        q.initial = () => choices.findIndex((choice) => choice.value === initialValue);
    }
    return q;
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
    for (const question of questions) {
        if (isFunction(question.when) ? question.when(answers) : question.when !== false) {
            if (useDefaults) {
                answers[question.name] = isFunction(question.default) ? question.default(answers) : question.default;
            } else {
                const q = await convertQuestion(question, answers);
                const answer = await prompts(q, {
                    onCancel: () => {
                        throw new Error('User canceled the prompt');
                    }
                });
                answers[question.name] = answer[question.name];
            }
        }
    }
    return answers as T;
}

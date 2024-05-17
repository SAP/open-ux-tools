import { spawnSync } from 'child_process';
import prompts from 'prompts';
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

/**
 * Checks if a property is a function.
 *
 * @param property property to be checked
 * @returns true if the property is a function
 */
function isFunction(property: unknown | Function): property is Function {
    return typeof property === 'function';
}

/**
 * Converts a YUI question to a simple prompts question.
 *
 * @param question YUI question to be converted
 * @param answers previously given answers
 * @returns question converted to prompts question
 */
function convertQuestion(question: YUIQuestion, answers: { [key: string]: unknown }): any {
    return {
        type: question.type === 'input' ? 'text' : question.type,
        name: question.name,
        message: question.message,
        validate: (value: unknown) =>
            isFunction(question.validate) ? question.validate(value, answers) : question.validate ?? true,
        initial: () => (isFunction(question.default) ? question.default(answers) : question.default),
        when: () => (isFunction(question.when) ? question.when(answers) : question.when ?? true)
    };
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
        const q = convertQuestion(question, answers);
        if (!q.when || q.when()) {
            if (useDefaults) {
                answers[q.name] =
                    typeof question.default === 'function' ? () => question.default(answers) : question.default;
            } else {
                const answer = await prompts(q, {
                    onCancel: () => {
                        throw new Error('User canceled the prompt');
                    }
                });
                answers[q.name] = answer[q.name];
            }
        }
    }
    return answers as T;
}

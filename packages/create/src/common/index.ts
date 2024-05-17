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
        validate:
            typeof question.validate === 'function'
                ? (value: unknown) => question.validate!(value, answers)
                : question.validate,
        initial: typeof question.default === 'function' ? () => question.default(answers) : question.default,
        when: question.when
    };
}

/**
 * Prompt a list of YeomanUI questions with the simple prompts module.
 *
 * @param questions list of questions
 * @returns the answers to the questions
 */
export async function promptYUIQuestions<T>(questions: YUIQuestion[]): Promise<T> {
    const answers: { [key: string]: unknown } = {};
    for (const question of questions) {
        const q = convertQuestion(question, answers);
        if (!q.when || q.when(answers)) {
            answers[q.name] = (await prompts(q))[q.name];
        }
    }
    return answers as T;
}

import type { InquirerAdapter } from '@sap-ux/ui5-application-inquirer';
import { spawnSync } from 'child_process';
import prompts from 'prompts';

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

function convertQuestion(question: any, answers: any): any {
    return {
        type: question.type === 'input' ? 'text' : question.type,
        name: question.name,
        message: question.message,
        validate:
            typeof question.validate === 'function'
                ? (value: any) => question.validate(value, answers)
                : question.validate,
        initial: typeof question.default === 'function' ? () => question.default(answers) : question.default
    };
}

/**
 * Get the inquirer adapter.
 *
 * @returns the inquirer adapter
 */
export function getInquirerAdapter(): InquirerAdapter {
    return {
        promptModule: undefined,
        async prompt(questions: any, answers = {}): Promise<any> {
            return prompts(questions.map((q: any) => convertQuestion(q, answers)));
        }
    };
}

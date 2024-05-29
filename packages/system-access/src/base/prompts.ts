import { AuthenticationType } from '@sap-ux/store';
import { existsSync } from 'fs';
import type { PromptObject } from 'prompts';

const authType: PromptObject<string> = {
    type: 'autocomplete',
    name: 'authType',
    message: 'Type of authentication:',
    choices: [
        { title: 'Basic authentication', value: AuthenticationType.Basic },
        { title: 'SAP reentrance tickets', value: AuthenticationType.ReentranceTicket }
    ]
};

const username: PromptObject<string> = {
    type: 'text',
    name: 'username',
    message: 'Username:'
};

const password: PromptObject<string> = {
    type: 'password',
    name: 'password',
    message: 'Password:'
};

const serviceKeysPath: PromptObject<string> = {
    type: 'text',
    name: 'path',
    message: 'Please provide the service keys as file:',
    validate: (input) => existsSync(input)
};

const storeCredentials: PromptObject<string> = {
    type: 'confirm',
    name: 'store',
    message: 'Do you want to store your credentials in the secure storage?',
    initial: true
};

const systemName: PromptObject<string> = {
    type: 'text',
    name: 'name',
    message: 'System name:',
    validate: (input) => !!input
};

/**
 * Export map of questions for usage with the prompts modules
 */
export const questions = {
    authType,
    username,
    password,
    serviceKeysPath,
    storeCredentials,
    systemName
} as const;
type keys = keyof typeof questions;

/**
 * Generate a map of questions for usages with inquirer (e.g. in yeoman)
 */
export const inquirer: { [key in keys]: object } = {} as { [key in keys]: object };
for (const key in questions) {
    const question = questions[key as keys];
    inquirer[key as keys] = {
        type: question.type === 'text' ? 'input' : question.type,
        name: question.name,
        message: question.message,
        validate: question.validate,
        default: question.initial
    };
}

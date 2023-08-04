import { existsSync } from 'fs';
import type { PromptObject } from 'prompts';

export const UsernamePrompt: PromptObject<string> = {
    type: 'text',
    name: 'username',
    message: 'Username:'
};

export const PasswordPrompt: PromptObject<string> = {
    type: 'password',
    name: 'password',
    message: 'Password:'
};

export const ServiceKeysPathPrompt: PromptObject<string> = {
    type: 'text',
    name: 'path',
    message: 'Please provide the service keys as file:',
    validate: (input) => existsSync(input)
};

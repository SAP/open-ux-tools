import prompts from 'prompts';
import { promptServiceKeys, promptCredentials, promptGeneratorInput } from '../../../src/base/prompt';
import { join } from 'path';

describe('base/prompts', () => {
    describe('promptCredentials', () => {
        const username = '~user';
        const password = '~pass';

        test('no default provided', async () => {
            prompts.inject([username, password]);
            const creds = await promptCredentials();
            expect(creds.username).toBe(username);
            expect(creds.password).toBe(password);
        });

        test('default provided', async () => {
            prompts.inject([undefined, password]);
            const providedUser = '~other';
            const creds = await promptCredentials(providedUser);
            expect(creds.username).toBe(providedUser);
            expect(creds.password).toBe(password);
        });
    });

    describe('promptServiceKeys', () => {
        test('Valid path provided.', async () => {
            prompts.inject([join(__dirname, '../../../tsconfig.json')]);
            expect(await promptServiceKeys()).toBeDefined();
        });
    });

    describe('promptGeneratorInput', () => {
        const defaults = {
            id: 'my.id',
            reference: 'the.original.app',
            url: 'http://sap.example'
        };

        test('defaults provided', async () => {
            const config = await promptGeneratorInput(defaults);
            expect(config).toEqual({
                app: {
                    id: defaults.id,
                    layer: undefined,
                    reference: defaults.reference,
                    title: undefined
                },
                target: {
                    url: defaults.url
                }
            });
        });

        test('prompt everything', async () => {
            prompts.inject(['VENDOR', defaults.id, defaults.reference, 'My Title', defaults.url]);
            const config = await promptGeneratorInput();
            expect(config).toEqual({
                app: {
                    id: defaults.id,
                    layer: 'VENDOR',
                    reference: defaults.reference,
                    title: 'My Title'
                },
                target: {
                    url: defaults.url
                }
            });
        });
    });
});

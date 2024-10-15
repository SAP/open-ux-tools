import { join } from 'path';
import * as prompts from 'prompts';
import { promptInboundNavigationConfig } from '../../../src/prompt';

jest.mock('prompts', () => ({
    ...jest.requireActual('prompts'),
    prompt: jest.fn()
}));

describe('Test promptInboundNavigationConfig', () => {
    test('manifest not found or "sap.app" not defined', async () => {
        let basePath = join(__dirname, '../../fixtures/navigation-config');
        await expect(() => promptInboundNavigationConfig(basePath)).rejects.toThrowError(
            `Manifest not found at path: ${basePath}`
        );

        basePath = join(__dirname, '../../fixtures/navigation-config/sap-app-not-defined');
        await expect(() => promptInboundNavigationConfig(basePath)).rejects.toThrowError(
            `Manifest is missing required section 'sap.app'`
        );
    });

    test('prompting called with expected questions', async () => {
        const basePath = join(__dirname, '../../fixtures/navigation-config/ui5-app-inbounds');
        const promptSpy = jest.spyOn(prompts, 'prompt').mockResolvedValue({
            semanticObject: 'so1',
            action: 'act1',
            title: '{{titleKey}}',
            subTitle: '{{subTitleKey}}'
        });
        await expect(promptInboundNavigationConfig(basePath)).resolves.toEqual(
            expect.objectContaining({
                'config': {
                    'action': 'act1',
                    'semanticObject': 'so1',
                    'title': '{{titleKey}}',
                    'subTitle': '{{subTitleKey}}'
                },
                'fs': expect.anything()
            })
        );
        expect(promptSpy).toHaveBeenCalledWith([
            {
                'format': expect.any(Function),
                'message': 'Semantic Object',
                'name': 'semanticObject',
                'type': 'text',
                'validate': expect.any(Function)
            },
            {
                'format': expect.any(Function),
                'message': 'Action',
                'name': 'action',
                'type': 'text',
                'validate': expect.any(Function)
            },
            {
                'initial': false,
                'message': 'Overwrite existing config',
                'name': 'overwrite',
                'type': expect.any(Function)
            },
            {
                'format': expect.any(Function),
                'message': 'Title',
                'name': 'title',
                'type': expect.any(Function),
                'validate': expect.any(Function)
            },
            {
                'format': expect.any(Function),
                'message': 'Subtitle (optional)',
                'name': 'subTitle',
                'type': expect.any(Function)
            }
        ]);
    });

    test('promptInboundNavigationConfig sets optional prompts to undefined when no input', async () => {
        const basePath = join(__dirname, '../../fixtures/navigation-config/ui5-app-inbounds');
        jest.spyOn(prompts, 'prompt').mockResolvedValue({
            semanticObject: 'so1',
            action: 'act1',
            title: '123',
            subTitle: ''
        });
        await expect(promptInboundNavigationConfig(basePath)).resolves.toEqual(
            expect.objectContaining({
                'config': {
                    'action': 'act1',
                    'semanticObject': 'so1',
                    'title': '123'
                },
                'fs': expect.anything()
            })
        );
    });

    test('prompting returns undefined config when "overwrite" false and inbound exists', async () => {
        const basePath = join(__dirname, '../../fixtures/navigation-config/ui5-app-inbounds');
        jest.spyOn(prompts, 'prompt').mockResolvedValue({
            semanticObject: 'so1',
            action: 'act1',
            overwrite: false
        });
        await expect(promptInboundNavigationConfig(basePath)).resolves.toEqual(
            expect.objectContaining({
                'config': undefined,
                'fs': expect.anything()
            })
        );
    });

    test('prompting validators', async () => {
        const basePath = join(__dirname, '../../fixtures/navigation-config/ui5-app-inbounds');
        // Hack to get at private prompt functions
        jest.spyOn(prompts, 'prompt').mockImplementationOnce((questions) => {
            const questionNames: any = (questions as prompts.PromptObject[]).reduce(
                (questions, question) => Object.assign(questions, { [question.name as string]: question }),
                {}
            );
            // Semantic object validation
            expect(questionNames['semanticObject'].validate('Test_1234')).toEqual(true);
            expect(questionNames['semanticObject'].validate('')).toMatchInlineSnapshot(
                `"Semantic Object input is required"`
            );
            expect(questionNames['semanticObject'].validate('Test_1234#')).toMatchInlineSnapshot(
                `"Only alphanumeric and '_' characters are allowed"`
            );
            expect(questionNames['semanticObject'].validate('x'.repeat(31))).toMatchInlineSnapshot(
                `"Maximum length: 30 characters"`
            );
            expect(questionNames['semanticObject'].validate('x'.repeat(30))).toBe(true);

            // Action validation
            expect(questionNames['action'].validate('Test_1234')).toEqual(true);
            expect(questionNames['action'].validate('')).toMatchInlineSnapshot(`"Action input is required"`);
            expect(questionNames['action'].validate('x'.repeat(61))).toMatchInlineSnapshot(
                `"Maximum length: 60 characters"`
            );
            expect(questionNames['action'].validate('x'.repeat(60))).toBe(true);
            expect(questionNames['action'].validate('Test_1234*')).toMatchInlineSnapshot(
                `"Only alphanumeric and '_' characters are allowed"`
            );
            expect(questionNames['title'].validate('x'.repeat(100))).toBe(true);
            expect(questionNames['title'].validate('x!#')).toBe(true);
        });
        await promptInboundNavigationConfig(basePath);
    });

    test('prompting formatters', async () => {
        const basePath = join(__dirname, '../../fixtures/navigation-config/ui5-app-inbounds');
        // Hack to get at private prompt functions
        jest.spyOn(prompts, 'prompt').mockImplementationOnce((questions) => {
            const questionNames: any = (questions as prompts.PromptObject[]).reduce(
                (questions, question) => Object.assign(questions, { [question.name as string]: question }),
                {}
            );

            expect(questionNames['semanticObject'].format('abc   ')).toEqual('abc');
            expect(questionNames['action'].format('abc   ')).toEqual('abc');
            expect(questionNames['title'].format('abc   ')).toEqual('abc');
            expect(questionNames['subTitle'].format('abc   ')).toEqual('abc');
        });
        await promptInboundNavigationConfig(basePath);
    });

    test('prompting "type" - conditional prompts', async () => {
        const basePath = join(__dirname, '../../fixtures/navigation-config/ui5-app-inbounds');
        // Hack to get at private prompt functions
        jest.spyOn(prompts, 'prompt').mockImplementationOnce((questions) => {
            const questionNames: any = (questions as prompts.PromptObject[]).reduce(
                (questions, question) => Object.assign(questions, { [question.name as string]: question }),
                {}
            );
            // We found a matching inbound key in the manifest.json, prompt to overwrite with "confirm" type
            expect(
                questionNames['overwrite'].type(undefined, {
                    semanticObject: 'semanticObject1',
                    action: 'action1'
                })
            ).toEqual('confirm');
            expect(
                questionNames['overwrite'].type(undefined, {
                    semanticObject: 'semanticObjectNotFound',
                    action: 'action1'
                })
            ).toEqual(false);

            expect(
                questionNames['title'].type(undefined, {
                    overwrite: false
                })
            ).toEqual(false);
            expect(
                questionNames['title'].type(undefined, {
                    overwrite: true
                })
            ).toEqual('text');
            expect(questionNames['title'].type(undefined, {})).toEqual('text');

            expect(
                questionNames['subTitle'].type(undefined, {
                    overwrite: false
                })
            ).toEqual(false);
            expect(
                questionNames['subTitle'].type(undefined, {
                    overwrite: true
                })
            ).toEqual('text');
            expect(questionNames['subTitle'].type(undefined, {})).toEqual('text');
        });
        await promptInboundNavigationConfig(basePath);
    });
});

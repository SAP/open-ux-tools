import prompts from 'prompts';
import { flexLayer, promptGeneratorInput } from '../../../src/base/prompt';

describe('base/prompts', () => {
    describe('promptGeneratorInput', () => {
        const defaults = {
            id: 'my.id',
            reference: 'the.original.app',
            url: 'http://sap.example',
            package: 'TESTPACKAGE',
            transport: 'TESTTRANSPORT'
        };

        test('defaults provided', async () => {
            prompts.inject([undefined]);
            const config = await promptGeneratorInput(defaults);
            expect(config).toEqual({
                app: {
                    id: defaults.id,
                    reference: defaults.reference
                },
                target: {
                    url: defaults.url
                },
                deploy: {
                    'package': defaults.package,
                    transport: defaults.transport
                },
                options: {
                    fioriTools: true
                }
            });
        });

        test('prompt everything', async () => {
            prompts.inject([
                flexLayer.VENDOR,
                defaults.id,
                defaults.reference,
                'My Title',
                defaults.url,
                undefined,
                defaults.package,
                defaults.transport,
                false
            ]);
            const config = await promptGeneratorInput();
            expect(config).toEqual({
                app: {
                    id: defaults.id,
                    layer: flexLayer.VENDOR,
                    reference: defaults.reference,
                    title: 'My Title'
                },
                target: {
                    url: defaults.url
                },
                deploy: {
                    'package': defaults.package,
                    transport: defaults.transport
                },
                options: {
                    fioriTools: false
                }
            });
        });
    });
});

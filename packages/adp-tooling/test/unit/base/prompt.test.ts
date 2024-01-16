import prompts from 'prompts';
import { promptGeneratorInput } from '../../../src/base/prompt';
import nock from 'nock';

describe('base/prompts', () => {
    const url = 'http://sap.example';
    beforeAll(() => {
        nock.disableNetConnect();
        nock(url)
            .get((uri) => uri.startsWith('/sap/bc/ui2/app_index'))
            .reply(200, {
                results: [
                    {
                        'sap.app/id': 'the.original.app',
                        'sap.app/title': 'My Title',
                        'sap.fiori/registrationIds': ['TEST']
                    }
                ]
            })
            .persist();
    });

    afterAll(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    describe('promptGeneratorInput', () => {
        const defaults = {
            id: 'my.id',
            reference: 'the.original.app',
            url,
            package: 'TESTPACKAGE',
            transport: 'TESTTRANSPORT'
        };

        test('defaults provided', async () => {
            prompts.inject([undefined]);
            const config = await promptGeneratorInput(defaults);
            expect(config).toEqual({
                app: {
                    id: `customer.${defaults.id}`,
                    reference: defaults.reference,
                    layer: 'CUSTOMER_BASE'
                },
                target: {
                    url: defaults.url
                },
                deploy: {
                    package: defaults.package,
                    transport: defaults.transport
                },
                options: {
                    fioriTools: true
                }
            });
        });

        test('prompt everything', async () => {
            prompts.inject([
                defaults.url,
                undefined,
                undefined,
                undefined,
                defaults.reference,
                defaults.id,
                'My Title',
                defaults.package,
                defaults.transport,
                false
            ]);
            const config = await promptGeneratorInput();
            expect(config).toEqual({
                app: {
                    id: `customer.${defaults.id}`,
                    reference: defaults.reference,
                    layer: 'CUSTOMER_BASE',
                    title: 'My Title'
                },
                target: {
                    client: undefined,
                    url: defaults.url
                },
                deploy: {
                    package: defaults.package,
                    transport: defaults.transport
                },
                options: {
                    fioriTools: false
                }
            });
        });
    });
});

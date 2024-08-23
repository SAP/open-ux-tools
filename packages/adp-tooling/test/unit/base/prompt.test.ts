import prompts from 'prompts';
import { promptGeneratorInput, promptTarget } from '../../../src/base/prompt';
import * as utils from '../../../src/writer/project-utils';

import { ToolsLogger } from '@sap-ux/logger';
import type { AbapTarget } from '@sap-ux/system-access';

const logger = new ToolsLogger();

const toolsId = '1234-5678-9abc-def0';
const url = 'https://customer.example';
const sapUrl = 'https://sap.example';
const certErrorUrl = 'https://cert.error.example';
const invalidUrl = 'https://invalid.example';
const testApps = [
    {
        'sap.app/id': 'the.original.app',
        'sap.app/title': 'My Title',
        'sap.fiori/registrationIds': ['TEST']
    },
    {
        'sap.app/id': 'another.original.app',
        'sap.app/title': 'My Title'
    }
];

jest.mock('@sap-ux/system-access', () => {
    return {
        ...jest.requireActual('@sap-ux/system-access'),
        createAbapServiceProvider: (target: AbapTarget, options: { ignoreCertErrors?: boolean }) => {
            if (target.url === certErrorUrl && !options?.ignoreCertErrors) {
                throw { code: 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' };
            } else if (target.url === invalidUrl) {
                throw new Error('Invalid URL');
            } else {
                return {
                    getAtoInfo: jest.fn().mockResolvedValue(target.url === sapUrl ? { tenantType: 'SAP' } : {}),
                    getAppIndex: jest.fn().mockReturnValue({
                        search: jest.fn().mockResolvedValue(testApps)
                    })
                };
            }
        }
    };
});

jest.mock('uuid', () => ({
    v4: jest.fn(() => toolsId)
}));

describe('base/prompts', () => {
    describe('promptTarget', () => {
        test('valid target', async () => {
            prompts.inject([url, undefined]);
            const { target, apps, layer } = await promptTarget({}, logger);
            expect(layer).toEqual('CUSTOMER_BASE');
            expect(target).toEqual({ url });
            expect(apps).toEqual(testApps);
        });

        test('invalid target', async () => {
            prompts.inject([invalidUrl, undefined]);
            await expect(promptTarget({}, logger)).rejects.toThrowError('Unable to fetch system information.');
        });

        test('invalid certificate prompt', async () => {
            prompts.inject([certErrorUrl, undefined, true, undefined, undefined]);
            const { target } = await promptTarget({}, logger);
            expect(target).toEqual({ url: certErrorUrl, client: undefined });
        });
    });

    describe('promptGeneratorInput', () => {
        const defaults = {
            id: 'my.id',
            reference: 'the.original.app',
            url,
            package: 'TESTPACKAGE',
            transport: 'TESTTRANSPORT'
        };

        const name = '@sap-ux/adp-tooling';
        const version = '0.0.1';

        jest.spyOn(utils, 'getPackageJSONInfo').mockReturnValue({ name, version });

        test('defaults provided', async () => {
            prompts.inject([undefined]);
            const config = await promptGeneratorInput(defaults, logger);
            expect(config).toEqual({
                app: {
                    id: `customer.${defaults.id}`,
                    reference: defaults.reference,
                    layer: 'CUSTOMER_BASE',
                    title: undefined
                },
                customConfig: {
                    adp: {
                        environment: 'P',
                        support: {
                            id: name,
                            toolsId,
                            version: version
                        }
                    }
                },
                target: {
                    url: defaults.url,
                    client: undefined
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
                sapUrl,
                undefined,
                defaults.reference,
                defaults.id,
                'My Title',
                defaults.package,
                defaults.transport,
                false
            ]);
            const config = await promptGeneratorInput(undefined, logger);
            expect(config).toEqual({
                app: {
                    id: defaults.id,
                    reference: defaults.reference,
                    layer: 'VENDOR',
                    title: 'My Title'
                },
                customConfig: {
                    adp: {
                        environment: 'P',
                        support: {
                            id: name,
                            toolsId,
                            version: version
                        }
                    }
                },
                target: {
                    client: undefined,
                    url: sapUrl
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

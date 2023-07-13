import { ToolsLogger } from '@sap-ux/logger';
import { AdaptationProject } from '../../../src/adp';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Resource } from '@ui5/fs';
import nock from 'nock';

describe('AdaptationProject', () => {
    const backend = 'https://sap.example';

    beforeAll(() => {
        nock.disableNetConnect();
        nock(backend)
            .get((path) => path.startsWith('/sap/bc/lrep/dta_folder/'))
            .reply(200)
            .persist(true);
    });

    const logger = new ToolsLogger();
    describe('init', () => {
        test('default (no) config', async () => {
            const adp = new AdaptationProject(
                {
                    target: {
                        url: backend
                    }
                },
                logger
            );
            const descriptorVariant = readFileSync(
                join(__dirname, '../../fixtures/adaptation-project/webapp', 'manifest.appdescr_variant'),
                'utf-8'
            );

            const mockMergedDescriptor = {
                asyncHints: {
                    libs: [
                        {
                            name: 'sap.ui.core'
                        },
                        {
                            name: 'sap.reuse.lib',
                            url: { url: '/sap/reuse/lib' }
                        }
                    ]
                },
                name: 'the.original.app',
                manifest: {
                    'sap.app': {
                        id: 'my.adaptation'
                    }
                },
                url: '/my/adaptation'
            };
            nock(backend)
                .put('/sap/bc/lrep/appdescr_variant_preview/')
                .reply(200, {
                    'my.adaptation': mockMergedDescriptor
                })
                .persist(true);

            await adp.init(JSON.parse(descriptorVariant), [
                {
                    getPath: () => '/manifest.appdescr_variant',
                    getBuffer: () => Buffer.from(descriptorVariant)
                } as unknown as Resource
            ]);
            expect(adp.descriptor).toEqual(mockMergedDescriptor);
            expect(adp.resources).toEqual({
                'my.adaptation': '/my/adaptation',
                'sap.reuse.lib': '/sap/reuse/lib',
                'the.original.app': '/my/adaptation'
            });
        });
    });
});

import { AppIndexService, createForAbap } from '../../src';
import nock from 'nock';
import appIndexMock from './mockResponses/appIndex.json';

nock.disableNetConnect();

describe('AppIndexService', () => {
    const server = 'https://sap.example';
    const config = {
        baseURL: server
    };

    beforeAll(() => {
        nock(server)
            .get((path) => path.startsWith(AppIndexService.PATH))
            .reply(200, (path) => {
                let results: any[];
                if (!path.includes('?')) {
                    results = appIndexMock.results;
                } else if (path.includes('type=application')) {
                    results = appIndexMock.results.filter((item) => item['sap.app/type'] === 'application');
                } else {
                    results = [];
                }
                if (path.includes('fields=url')) {
                    return { results };
                } else {
                    return {
                        results: results.map((app) => {
                            return { 'sap.app/id': app['sap.app/id'] };
                        })
                    };
                }
            })
            .persist();
    });

    describe('search', () => {
        const provider = createForAbap(config);
        const service: AppIndexService = provider.getAppIndex();

        test('no filter', async () => {
            const appIndex = await service.search();
            expect(appIndex).toBeDefined();
            expect(appIndex.length).toBe(3);
        });

        test('use a filter but no fields (so only sap.app/id will be returned)', async () => {
            const appIndex = await service.search({
                'sap.app/type': 'application'
            });
            expect(appIndex).toBeDefined();
            expect(appIndex.length).toBe(2);
            expect(appIndex[0].url).not.toBeDefined();
        });

        test('use field to get the url as well', async () => {
            const appIndex = await service.search({ 'sap.app/type': 'application' }, ['url', 'sap.app/id']);
            expect(appIndex).toBeDefined();
            expect(appIndex.length).toBe(2);
            expect(appIndex[0].url).toBeDefined();
        });
    });
});

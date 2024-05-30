import { AppIndexService, createForAbap } from '../../src';
import nock from 'nock';
import appIndexMock from './mockResponses/appIndex.json';
import appInfoJsonMock from './mockResponses/ui5AppInfo.json';
import cloneDeep from 'lodash/cloneDeep';

describe('AppIndexService', () => {
    const server = 'https://sap.example';
    const config = {
        baseURL: server
    };

    beforeAll(() => {
        nock.disableNetConnect();
    });

    afterAll(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    describe('search', () => {
        const provider = createForAbap(config);
        const service: AppIndexService = provider.getAppIndex();

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

    describe('getAppInfo', () => {
        const provider = createForAbap(config);
        const service: AppIndexService = provider.getAppIndex();

        test('get the app info', async () => {
            nock.cleanAll();
            nock(server)
                .get((path) => path.includes('/ui5_app_info_json'))
                .reply(200, appInfoJsonMock)
                .persist();
            const appInfo = await service.getAppInfo('ExampleApp');
            expect(appInfo).toStrictEqual(appInfoJsonMock['ExampleApp']);
        });

        test('get app info with `manifest` property', async () => {
            const appInfoJsonMockWithManifest: {
                [key: string]: { manifest?: string; manifestUrl?: string };
            } = cloneDeep(appInfoJsonMock);
            delete appInfoJsonMockWithManifest['ExampleApp']?.manifestUrl;
            appInfoJsonMockWithManifest['ExampleApp'].manifest =
                '/sap/bc/lrep/content/apps/ExampleApp/app/sap/example_app/manifest.appdescr';

            nock.cleanAll();
            nock(server)
                .get((path) => path.includes('/ui5_app_info_json'))
                .reply(200, () => appInfoJsonMockWithManifest)
                .persist();

            const appInfo = await service.getAppInfo('ExampleApp');
            expect(appInfo).toStrictEqual(appInfoJsonMock['ExampleApp']);
        });

        test('get app info without manifest or manifestUrl property', async () => {
            nock.cleanAll();
            nock(server)
                .get((path) => path.includes('/ui5_app_info_json'))
                .reply(200, () => {
                    const appInfoJsonMockWithoutManifestURL: {
                        [key: string]: { manifest?: string; manifestUrl?: string };
                    } = cloneDeep(appInfoJsonMock);
                    delete appInfoJsonMockWithoutManifestURL['ExampleApp'].manifestUrl;
                    return appInfoJsonMockWithoutManifestURL;
                })
                .persist();

            const expectedAppInfo = cloneDeep(appInfoJsonMock['ExampleApp']);
            expectedAppInfo.manifestUrl = '';
            const appInfo = await service.getAppInfo('ExampleApp');
            expect(appInfo).toStrictEqual(expectedAppInfo);
        });

        test('get app info fails, application not found', async () => {
            nock.cleanAll();
            nock(server)
                .get((path) => path.includes('/ui5_app_info_json'))
                .reply(404)
                .persist();

            try {
                await service.getAppInfo('ExampleApp');
                fail('The function should have thrown an error.');
            } catch (error) {
                expect(error).toBeDefined();
                expect(error.message).toBe('Request failed with status code 404');
            }
        });

        test('get app info fails, invalid json', async () => {
            nock.cleanAll();
            nock(server)
                .get((path) => path.includes('/ui5_app_info_json'))
                .reply(200, () => 'test')
                .persist();

            try {
                await service.getAppInfo('ExampleApp');
                fail('The function should have thrown an error.');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });
});

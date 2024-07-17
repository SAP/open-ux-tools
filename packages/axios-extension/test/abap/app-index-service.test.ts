import { AppIndexService, createForAbap } from '../../src';
import nock from 'nock';
import appIndexMock from './mockResponses/appIndex.json';
import type { AxiosError } from '../../src';
nock.disableNetConnect();
import appInfoJsonMock from './mockResponses/ui5AppInfo.json';
import type { ToolsLogger } from '@sap-ux/logger';
import * as Logger from '@sap-ux/logger';

const loggerMock: ToolsLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
} as Partial<ToolsLogger> as ToolsLogger;
jest.spyOn(Logger, 'ToolsLogger').mockImplementation(() => loggerMock);

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

    describe('getIsManiFirstSupported', () => {
        const provider = createForAbap(config);
        const service: AppIndexService = provider.getAppIndex();

        test('get is manifest first supported', async () => {
            nock.cleanAll();
            nock(server)
                .get((path) => path.startsWith(`${AppIndexService.PATH}/ui5_app_mani_first_supported`))
                .reply(200, (_path) => {
                    return appIndexMock['ui5_app_mani_first_supported'];
                })
                .persist();

            const result = await service.getIsManiFirstSupported('appId');
            expect(result).toBe(true);
        });

        test('request fails and throw error', async () => {
            const mockAxiosError = {
                response: {
                    status: 404,
                    data: 'Not found'
                },
                message: 'Request failed with status code 404'
            } as AxiosError;
            nock.cleanAll();
            nock(server)
                .get((path) => path.startsWith(`${AppIndexService.PATH}/ui5_app_mani_first_supported`))
                .replyWithError(mockAxiosError)
                .persist();

            try {
                await service.getIsManiFirstSupported('appId');
                fail('The function should have thrown an error.');
            } catch (error) {
                expect(error).toBeDefined();
                expect(error.message).toBe('Request failed with status code 404');
            }
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
            expect(appInfo).toStrictEqual(appInfoJsonMock);
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

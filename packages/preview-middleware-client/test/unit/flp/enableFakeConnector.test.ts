import { documentMock, fetchMock } from 'mock/window';
import FakeLrepConnector from 'mock/sap/ui/fl/FakeLrepConnector';

import enableFakeConnector, {
    create,
    loadChanges
} from '../../../src/flp/enableFakeConnector';
import LrepConnector from 'mock/sap/ui/fl/LrepConnector';
import * as additionalChangeInfo from '../../../src/utils/additional-change-info';

describe('flp/FakeLrepConnector', () => {
    jest.spyOn(additionalChangeInfo, 'getAdditionalChangeInfo').mockReturnValue(undefined);
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('initializes FakeLrepConnector', async () => {
        const enableFakeConnectorSpy = FakeLrepConnector.enableFakeConnector;

        enableFakeConnector();

        expect(enableFakeConnectorSpy).toHaveBeenCalledTimes(1);
    });

    describe('loadChanges', () => {
        afterEach(() => {
            fetchMock.mockReset();
        });

        test('loads changes correctly', async () => {
            fetchMock.mockReturnValue({
                json: jest.fn().mockReturnValue({
                    'sap.ui.fl.changes.propertyChange': {
                        changeType: 'propertyChange',
                        support: {
                            generator: '@sap-ux/control-property-editor'
                        }
                    }
                })
            });

            LrepConnector.prototype.loadChanges = jest.fn().mockResolvedValue({
                changes: {
                    changes: []
                }
            });

            const result = await loadChanges();

            expect(fetchMock).toHaveBeenCalledWith(
                '/preview/api/changes',
                expect.objectContaining({
                    method: 'GET',
                    headers: {
                        'content-type': 'application/json'
                    }
                })
            );
            expect(result.changes.changes.length).toBe(1);
            expect(result.changes.changes[0].changeType).toBe('propertyChange');
        });

        test('loads changes correctly with baseUrl', async () => {
            const mockBaseUrl = '/test.base.url';
            jest.isolateModules(async () => {
                Object.defineProperty(globalThis, 'data-open-ux-preview-base-url', {
                    value: mockBaseUrl,
                    writable: true,
                    configurable: true
                });

                // Mock LrepConnector before requiring the module
                const LrepConnectorMock = require('mock/sap/ui/fl/LrepConnector');
                LrepConnectorMock.default.prototype.loadChanges = jest.fn().mockResolvedValue({
                    changes: {
                        changes: []
                    }
                });

                fetchMock.mockReturnValue({
                    json: jest.fn().mockReturnValue({
                        'sap.ui.fl.changes.propertyChange': {
                            changeType: 'propertyChange',
                            support: {
                                generator: '@sap-ux/control-property-editor'
                            }
                        }
                    })
                });

                const { loadChanges: loadChangesWithMockedUrl } = require('../../../src/flp/enableFakeConnector');

                const result = await loadChangesWithMockedUrl();

                expect(fetchMock).toHaveBeenCalledWith(
                    '/test.base.url/preview/api/changes',
                    expect.objectContaining({
                        method: 'GET',
                        headers: {
                            'content-type': 'application/json'
                        }
                    })
                );
                expect(result.changes.changes.length).toBe(1);
                expect(result.changes.changes[0].changeType).toBe('propertyChange');

                // Cleanup
                delete (globalThis as any)['data-open-ux-preview-base-url'];
            });
        });
    });

    describe('create', () => {
        afterEach(() => {
            fetchMock.mockReset();
        });

        test('calls the API to save changes', async () => {
            jest.spyOn(additionalChangeInfo, 'getAdditionalChangeInfo').mockReturnValueOnce({ templateName: 'templateName' });
            const change = {
                changeType: 'propertyChange',
                fileName: 'dummyFileName',
                support: {
                    generator: 'sap.ui.rta.command'
                }
            };
            fetchMock.mockResolvedValue({ text: jest.fn(), ok: true });
            documentMock.getElementById.mockReturnValue({
                getAttribute: jest.fn().mockReturnValue('{"generator":"@sap-ux/control-property-editor"}')
            });

            await create([change]);

            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(FakeLrepConnector.fileChangeRequestNotifier).toHaveBeenCalledWith(
                'dummyFileName',
                'create',
                change,
                { templateName: 'templateName' }
            );
        });

        test('calls the API to save a single change', async () => {
            const change = {
                changeType: 'propertyChange',
                fileName: 'dummyFileName',
                support: {
                    generator: 'sap.ui.rta.command'
                }
            };
            fetchMock.mockResolvedValue({ text: jest.fn(), ok: true });
            documentMock.getElementById.mockReturnValue({
                getAttribute: jest.fn().mockReturnValue('{"generator":"@sap-ux/control-property-editor"}')
            });

            await create(change);

            expect(fetchMock).toHaveBeenCalledTimes(1);
        });
    });
});

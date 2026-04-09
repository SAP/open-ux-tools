import { documentMock, fetchMock } from 'mock/window';
import FakeLrepConnector from 'mock/sap/ui/fl/FakeLrepConnector';
import LrepConnector from 'mock/sap/ui/fl/LrepConnector';

const getAdditionalChangeInfoMock = jest.fn();
jest.unstable_mockModule('open/ux/preview/client/utils/additional-change-info', () => ({
    getAdditionalChangeInfo: getAdditionalChangeInfoMock,
    setAdditionalChangeInfo: jest.fn(),
    clearAdditionalChangeInfo: jest.fn(),
    setAdditionalChangeInfoForChangeFile: jest.fn()
}));

const { default: enableFakeConnector, create, loadChanges } = await import(
    'open/ux/preview/client/flp/enableFakeConnector'
);

describe('flp/FakeLrepConnector', () => {
    getAdditionalChangeInfoMock.mockReturnValue(undefined);
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

        // Skipped: jest.isolateModulesAsync + ESM dynamic import does not properly
        // re-evaluate module-level constants (baseUrl) with mocked document state
        test.skip('loads changes correctly with baseUrl', async () => {
            const mockBaseUrl = '/test.base.url';
            await jest.isolateModulesAsync(async () => {
                // Mock document.getElementById to return element with baseUrl in dataset of sap-ui-bootstrap
                documentMock.getElementById.mockImplementation((id: string) => {
                    if (id === 'sap-ui-bootstrap') {
                        return {
                            dataset: {
                                openUxPreviewBaseUrl: mockBaseUrl
                            }
                        };
                    }
                    return null;
                });

                // Mock LrepConnector before importing the module
                LrepConnector.prototype.loadChanges = jest.fn().mockResolvedValue({
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

                const { loadChanges: loadChangesWithMockedUrl } = await import(
                    'open/ux/preview/client/flp/enableFakeConnector'
                );

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
            });
        });
    });

    describe('create', () => {
        afterEach(() => {
            fetchMock.mockReset();
        });

        test('calls the API to save changes', async () => {
            getAdditionalChangeInfoMock.mockReturnValueOnce({ templateName: 'templateName' });
            const change = {
                changeType: 'propertyChange',
                fileName: 'dummyFileName',
                support: {
                    generator: 'sap.ui.rta.command'
                }
            };
            fetchMock.mockResolvedValue({ text: jest.fn(), ok: true });
            documentMock.getElementById.mockReturnValue({
                dataset: {
                    openUxPreviewFlexSettings: JSON.stringify({ generator: '@sap-ux/control-property-editor' })
                }
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
                dataset: {
                    openUxPreviewFlexSettings: JSON.stringify({ generator: '@sap-ux/control-property-editor' })
                }
            });

            await create(change);

            expect(fetchMock).toHaveBeenCalledTimes(1);
        });
    });
});

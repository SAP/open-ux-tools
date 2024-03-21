import { documentMock, fetchMock } from 'mock/window';
import FakeLrepConnector from 'mock/sap/ui/fl/FakeLrepConnector';

import enableFakeConnector, { loadChanges, create } from '../../../src/flp/enableFakeConnector';
import LrepConnector from 'mock/sap/ui/fl/LrepConnector';

describe('flp/FakeLrepConnector', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('initializes FakeLrepConnector', async () => {
        const enableFakeConnectorSpy = FakeLrepConnector.enableFakeConnector;

        enableFakeConnector();

        expect(enableFakeConnectorSpy).toBeCalledTimes(1);
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

            expect(result.changes.changes.length).toBe(1);
            expect(result.changes.changes[0].changeType).toBe('propertyChange');
        });
    });

    describe('create', () => {
        afterEach(() => {
            fetchMock.mockReset();
        });

        test('calls the API to save changes', async () => {
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

            expect(fetchMock).toBeCalledTimes(1);
        });
    });
});

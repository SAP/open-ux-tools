import { documentMock, fetchMock } from 'mock/window';
import LrepConnector from 'mock/sap/ui/fl/LrepConnector';

const mockBaseUrl = '/test.base.url';

// Set up document mock BEFORE importing the module so that the module-level
// `const baseUrl = document.getElementById('sap-ui-bootstrap')?.dataset.openUxPreviewBaseUrl ?? ''`
// evaluates to our custom value.
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

jest.unstable_mockModule('open/ux/preview/client/utils/additional-change-info', () => ({
    getAdditionalChangeInfo: jest.fn(),
    setAdditionalChangeInfo: jest.fn(),
    clearAdditionalChangeInfo: jest.fn(),
    setAdditionalChangeInfoForChangeFile: jest.fn()
}));

const { loadChanges } = await import('open/ux/preview/client/flp/enableFakeConnector');

describe('flp/FakeLrepConnector - baseUrl', () => {
    afterEach(() => {
        fetchMock.mockReset();
    });

    test('loads changes correctly with baseUrl', async () => {
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

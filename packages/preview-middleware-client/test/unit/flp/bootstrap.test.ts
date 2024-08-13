import { documentMock } from 'mock/window';
import '../../../src/flp/bootstrap';
import { Window } from '../../../types/global';

describe('flp/ushellBootstrap', () => {
    const htmlElement = {
        onload: jest.fn(),
        setAttribute: jest.fn()
    };
    documentMock.getElementById.mockReturnValue(htmlElement);
    const fetchMock = jest.spyOn(global, 'fetch');

    const ushellBootstrap = (window as unknown as Window)['sap-ui-config']['xx-bootTask'];

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('xx-boottask defined', () => {
        expect(ushellBootstrap).toBeDefined();
    });

    test('ushell src when ui5 version is 1.x', async () => {
        fetchMock.mockResolvedValueOnce({
            json: () => Promise.resolve({ libraries: [{ name: 'sap.ui.core', version: '1.126.0' }] })
        } as jest.Mocked<Response>);

        await ushellBootstrap(() => {});
        expect(htmlElement.setAttribute).toHaveBeenCalledWith('src', '/test-resources/sap/ushell/bootstrap/sandbox.js');
    });

    test('ushell src when ui5 version is 2.0', async () => {
        fetchMock.mockResolvedValue({
            json: () => Promise.resolve({ libraries: [{ name: 'sap.ui.core', version: '2.0.0' }] })
        } as jest.Mocked<Response>);

        await ushellBootstrap(() => {});
        expect(htmlElement.setAttribute).toHaveBeenCalledWith('src', '/resources/sap/ushell/bootstrap/sandbox2.js');
    });

    test('fetching version failed', async () => {
        fetchMock.mockRejectedValueOnce('404');

        await ushellBootstrap(() => {});
        expect(htmlElement.setAttribute).toHaveBeenCalledWith('src', '/test-resources/sap/ushell/bootstrap/sandbox.js');
    });
});
